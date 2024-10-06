import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';
import { Offline } from './config';
import { offlineCollections } from './mongo';
import { getAll, update, remove, removeWithRetry, updateSyncs } from './idb';
import { callMethod, stringifyId, parseId, convertIds } from './utils/client';
import { isEmpty, deepReplace, deepContains } from './utils/shared';

const _syncingDep = new Tracker.Dependency();
let _syncingValue = false;

export const syncing = {
  get() {
    _syncingDep.depend();
    return _syncingValue;
  },
  set(value) {
    _syncingValue = value;
    _syncingDep.changed();
  }
};

/**
 * Returns the current syncing status.
 *
 * @function
 * @returns {boolean} The current syncing status.
 */
export const isSyncing = () => syncing.get();

// prevent UI flickering while we work through the queued methods
export function pauseObservers(collectionNames) {
  if (!collectionNames.length) return;

  const stores = Meteor.connection._stores;
  const localCollections = Meteor.connection._mongo_livedata_collections;

  for (const name of collectionNames) {
    const store = stores[name];
    const localCollection = localCollections[name];

    if (localCollection) localCollection.pauseObservers();
    if (store) {
      store._originalEnd = store.endUpdate;
      store.endUpdate = () => {}; // we'll resume observers after the queued methods have executed so we suppress the built in resumption here
    }
  }

  return;
}

// resume UI reactivity
export function resumeObservers(collectionNames) {
  if (!collectionNames.length) return;

  const stores = Meteor.connection._stores;
  const localCollections = Meteor.connection._mongo_livedata_collections;

  for (const name of collectionNames) {
    const store = stores[name];
    const localCollection = localCollections[name];

    if (localCollection) localCollection[Meteor.isFibersDisabled ? 'resumeObserversClient' : 'resumeObservers']();
    if (store) {
      store.endUpdate = store._originalEnd;
      delete store._originalEnd;
    }
  }
}

async function removeOfflineDoc(localCollection, docId) {
  return localCollection.remove(parseId(docId));
}

async function updateMethods(methods, target, replacement) {
  for (const { id, args } of methods) {
    if (!args.some(arg => deepContains(arg, target))) continue; // skip to the next method

    for (let i = 0; i < args.length; i++) {
      args[i] = deepReplace(args[i], target, replacement); // we want to replace the args in-situ
    }
    await update('methods', id, { args });
  }

  return;
}

async function sync() {
  const { autoSync, handleSyncErrors } = Offline.config;
  if (!autoSync) {
    return;
  }

  const syncs = await getAll('syncs'); // holds the syncedAt data for each offlineCollection with a .keep filter that isn't empty
  const methods = await getAll('methods');
  const methodCollectionNames = [...new Set(methods.map(m => m.collectionName))];
  const hasKeepFilter = [...offlineCollections.entries()].some(([key, { filter }]) => !isEmpty(filter));
  const localCollections = Meteor.connection._mongo_livedata_collections;
  const syncErrors = {};

  return Tracker.autorun(async computation => {
    if (Meteor.userId()) { // we want to make sure we have a logged in user before attempting to replay methods since they will most likely require a logged-in user
      computation.stop(); // once we have a logged in user, we stop the autorun computation to ensure it doesn't continue firing

      syncing.set(true);

      // replay methods
      pauseObservers(methodCollectionNames);
      for (const { id, name, args: mArgs, collectionName, docId } of methods) {
        const args = convertIds(mArgs, parseId); // used to support Mongo.ObjectID

        try {
          const result = await callMethod(name, args);

          if (docId) { // if we have a docId, it means that it was added while offline. if it was added with a preset _id, then we re-use the _id and avoid removing the doc
            const _id = stringifyId(result.insertedId ?? result); // used to support Mongo.ObjectID
            if (_id !== docId) {
              await removeOfflineDoc(localCollections[collectionName], docId).catch(error => console.error('removeOfflineDoc error', error)); // we want to remove the doc now that its been successfully replayed and inserted on the server. we don't want these errors to be included in methodErrors.
              await updateMethods(methods, docId, _id).catch(error => console.error(error => 'updateMethods error', error)); // we'll want to update any changes made to that document with the real _id after it's inserted on the server. this assumes that the _id is returned whenever a document is inserted which is fairly standard. we don't want these errors to be included in methodErrors.
            }
          }
        } catch (error) {
          (syncErrors.replayErrors ??= []).push({ name, args, error });
        }

        try {
          await removeWithRetry('methods', id, { asap: true });
        } catch (error) {
          console.error('Failed to delete queuedMethod:', id, error);
        }
      }
      resumeObservers(methodCollectionNames);

      // sync with the server - specifically remove docs that should no longer be in the offline data because they no longer match the .keep filter
      if (hasKeepFilter) {
        const { synced, errors } = await callMethod('_keep', [syncs]);
        for (const { name, removeIds, syncedAt } of synced) {
          for (const _id of removeIds) {
            localCollections[name].remove(parseId(_id)) // parseId is used to support Mongo.ObjectID
          }
          await updateSyncs(name, syncedAt).catch(error => errors.push({ name, error }));
        }
        if (errors.length) syncErrors.keepErrors = errors;
      }

      if (!isEmpty(syncErrors)) {
        handleSyncErrors(syncErrors);
      }

      return syncing.set(false);
    }
  });
}

Meteor.startup(() => Tracker.autorun(() => Meteor.status().connected && sync())); // sync when the user comes online
