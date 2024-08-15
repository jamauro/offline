import { Meteor } from 'meteor/meteor';
import { offlineCollections } from './mongo';
import { openDB as open } from 'idb';
import { Offline } from './config';
import { bc } from './bc';
import { wait, checkOffline, stringifyId, convertIds } from './utils/client';

const openDB = () => open('db', 1, {
  upgrade(db) {
    for (const [ name, { sort } ] of offlineCollections) {
      if (!db.objectStoreNames.contains(name)) {
        const store = db.createObjectStore(name, { keyPath: '_id' });

        if (sort) {
          const [[key, value]] = Object.entries(sort);
          store.createIndex(key, key, { unique: false });
        }
      }
    }

    if (!db.objectStoreNames.contains('methods')) { // this will hold the queued methods when offline so we can replay them when the user comes back online
      db.createObjectStore('methods', { keyPath: 'id', autoIncrement: true });
    }

    if (!db.objectStoreNames.contains('syncs')) {
      db.createObjectStore('syncs', { keyPath: 'name' });
    }
  },
});

export async function put(name, doc, { added = false } = {}) {
  const isOffline = checkOffline();
  const { autoSync } = Offline.config;
  if (isOffline && !autoSync) {
    return;
  }

  doc._id = stringifyId(doc._id); // used to support Mongo.ObjectID

  const db = await openDB();
  const tx = db.transaction(name, 'readwrite');
  const store = tx.store;
  const { filter, sort, limit } = offlineCollections.get(name) || {};

  const handleOffline = async () => {
    if (!isOffline) return;

    await updateLastMethod(name, added && doc._id);
    bc.postMessage({ name, doc }); // broadcast to other tabs the user may have open
  };

  const finishPut = async () => {
    await store.put(doc);
    await tx.done;

    return handleOffline();
  };

  if (!limit) { // there's no limit, so we put the doc
    return finishPut();
  }

  const existingDoc = await store.get(doc._id);
  const count = await store.count() + (existingDoc ? 0 : 1); // if we're adding a new doc, we anticipate it and increase the count by 1

  if (count <= limit) { // we're under the limit, so put the doc
    return finishPut();
  }

  const [[key, value]] = Object.entries(sort);
  const direction = value === -1 ? 'next' : 'prev'; // this feels counterintuitive but it works
  const cursor = await store.index(key).openCursor(null, direction);

  const isCurrentUser = name === 'users' && ((cursor ? cursor.primaryKey : doc._id) === Meteor.userId()); // this prevents deleting the current user if publishing a bunch of users to the client
  if (isCurrentUser) {
    return finishPut();
  }

  const shouldEnd = !cursor || (direction === 'prev' ? doc[key] > cursor.value[key] : doc[key] < cursor.value[key]);
  if (shouldEnd) { // we don't put the doc but still need to handle the offline case
    await tx.done;
    return handleOffline();
  }

  await store.delete(cursor.primaryKey);  // the limit will be exceeded when we put the doc, so we delete a doc based on the desired sort (e.g. the oldest doc if we're keeping the most recent) to make room for it

  return finishPut();
}

export async function remove(name, id, { asap = false } = {}) {
  id = stringifyId(id); // used to support Mongo.ObjectID

  const db = await openDB();
  if (asap) { // avoids checking the offline status and running into potential weird bugs on a flaky connection where Meteor.status() is going back and forth
    return db.delete(name, id);
  }

  const isOffline = checkOffline();
  const { autoSync } = Offline.config;
  if (isOffline && !autoSync) {
    return;
  }

  db.delete(name, id);

  if (isOffline) {
    await updateLastMethod(name);
    bc.postMessage({ name, id });
  }

  return;
}

export async function removeWithRetry(name, id, { asap = true, maxRetries = 3, delay = 1000, attempt = 1 } = {}) {
  try {
    await remove(name, id, { asap });
    return;
  } catch (error) {
    if (attempt < maxRetries) {
      await wait(delay);
      return removeWithRetry(name, id, { asap, maxRetries, delay, attempt: attempt + 1 });
    }
    throw new Error(`Failed to delete queuedMethod with id ${id} after ${maxRetries} attempts`);
  }
}

export async function update(name, key, data) {
  const db = await openDB();
  const doc = await db.get(name, key);

  return db.put(name, {...doc, ...data});
}

export async function getAll(name) {
  const db = await openDB();
  return db.getAll(name);
}

export async function clear(name) {
  const db = await openDB();
  return db.clear(name)
}

/**
 * Clears all stores in the IndexedDB database.
 *
 * @function
 * @async
 * @returns {Promise<void>} A promise that resolves when all stores are cleared.
 */
export async function clearAll() {
  const db = await openDB();
  const names = db.objectStoreNames;

  return Promise.all([...names].map(n => db.clear(n)));
}

export function canQueue(methodName) { // we should only queue the method if the collection has been made available offline
  if (Offline.config.keepAll) {
    return true;
  }

  const lowerCasedMethodName = methodName.toLowerCase();

  for (const collectionName of offlineCollections.keys()) {
    const lowerCasedCollectionName = collectionName.toLowerCase();

    if (lowerCasedMethodName.includes(lowerCasedCollectionName) ||
        lowerCasedMethodName.includes(lowerCasedCollectionName.slice(0, -1))) { // see if it matches the singular form, e.g. 'insertTodo' should match 'todos' collectionName
      return true;
    }
  }

  return false;
}

/**
 * Queues a method with its arguments to be executed later.
 *
 * @function
 * @async
 * @param {string} name - The name of the method to queue.
 * @param {...any} args - Arguments to pass to the method.
 * @returns {Promise<void>} A promise that resolves when the method is queued.
 */
export async function queueMethod(name, ...args) {
  if (!canQueue(name)) {
    return;
  }

  const db = await openDB();
  return db.add('methods', { name, args: convertIds(args, stringifyId) }); // convertIds is used to support Mongo.ObjectID
}

async function updateLastMethod(collectionName, docId = undefined) {
  const db = await openDB();
  const tx = db.transaction('methods', 'readwrite');
  const store = tx.store;
  const cursor = await store.openCursor(null, 'prev') || {};

  if (cursor) {
    await store.put({...cursor.value, collectionName, ...(docId && { docId }) })
  }

  await tx.done;
  return;
}

export async function updateSyncs(name, syncedAt) {
  const db = await openDB();
  return db.put('syncs', { name, syncedAt });
}
