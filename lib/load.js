import { Meteor } from 'meteor/meteor';
import { getAll, put, remove } from './idb';
import { offlineCollections } from './mongo';
import { unsubs } from './ddp';
import { broadcasted } from './bc';
import { parseId } from './utils/client';
import { needsReplace, deepReplace, PLACEHOLDER_USER_ID } from './utils/shared';

async function load({ offline = false } = {}) {
  let loading = true;
  const localCollections = Meteor.connection._mongo_livedata_collections;

  const loadAndObserve = async (name, filter) => {
    const localCollection = localCollections[name];
    if (offline && localCollection.find(filter).count() > 0) return; // the app went offline, we don't need to load data we already have in minimongo

    // load into minimongo
    const docs = await getAll(name);
    for (const doc of docs) {
      doc._id = parseId(doc._id); // used to support Mongo.ObjectID
      // used to support Mongo.ObjectID on the other fields
      for (const x in doc) {
        if (doc[x]?._str) { doc[x] = parseId(doc[x]._str); }
      }
      localCollection.insert(doc);
    }

    if (offline) { // the app was online and went offline, so we don't need start observing again
      return;
    }

    // start observing
    const observe = query => localCollection.find(query).observe({ // the broacasted check is an optimization to avoid duplicating the action when broadcasting to another open tab because indexeddb is global across tabs
      added(doc) {
        if (broadcasted || docs.length && loading) return; // as an optimization, we also want to prevent putting the docs back into offline storage while we're loading them from offline storage
        put(name, doc, { added: true });
      },
      changed(doc) {
        if (broadcasted) return;
        put(name, doc);
      },
      removed(doc) {
        if (broadcasted || unsubs.get(name)?.includes(doc._id)) return; // with unsubs, we want to make sure we prevent removing docs from offline storage when stopping Meteor subscriptions
        remove(name, doc._id);
      }
    });

    if (!filter[needsReplace] || Meteor.userId()) {
      return observe(filter);
    }

    // since the filter isn't empty and we don't have a Meteor.userId, it may be dependent on a Meteor.userId so we need watch when Meteor.userId is available with this Tracker.autorun
    // once we have a Meteor.userId, we want to stop the computation and only set up the observe one time after the computation is stopped and onInvalidate is invoked.
    const c = Tracker.autorun(computation => {
      if (!Meteor.userId()) return;
      computation.stop();
    });

    return c.onInvalidate(() => {
      const replacedFilter = deepReplace(filter, PLACEHOLDER_USER_ID, Meteor.userId()); // if there is a Meteor.userId in the .keep filter, we use this to replace it with the actual userId now that it's available
      return observe(replacedFilter);
    });
  };

  try {
    await Promise.all(
      [...offlineCollections].map(([ name, { filter } ]) => loadAndObserve(name, filter))
    );
  } catch (error) {
    console.error('Error loading collections', error)
  }

  loading = false;
  return;
}

Meteor.startup(load); // on startup, load offline data into minimongo and start observing minimongo collections to save data for offline use
Tracker.autorun(() => Meteor.status().status === 'offline' && Promise.resolve().then(() => load({ offline: true }))); // when go offline, load minimongo with indexeddb data so that we can navigate the app with the persisted data
