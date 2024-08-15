import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Offline } from './config';
import { deepContains, needsReplace } from './utils/shared';
const { clear } = Meteor.isClient && require('./idb');

export const offlineCollections = new Map();

/**
 * Keeps a filter, sort, and limit configuration for the MongoDB collection.
 *
 * @function
 * @memberof Mongo.Collection
 * @param {Object} [filter={}] - The optional filter object to keep.
 * @param {Object} [options] - Optional settings.
 * @param {Object} [options.sort=Offline.config.sort] - The sort order.
 * @param {number} [options.limit=Offline.config.limit] - The limit of documents.
 */
Mongo.Collection.prototype.keep = function(filter = {}, { sort = Offline.config.sort, limit = Offline.config.limit } = {}) {
  if (deepContains(filter, null)) filter[needsReplace] = true;

  offlineCollections.set(this._name, { filter, sort, limit }); // this._name is the colleciton name
  return;
}

/**
 * Clears all documents from the MongoDB collection (client-side)
 * Can be used isomorphically, but on the server, it's a no-op.
 *
 * @function
 * @memberof Mongo.Collection
 * @returns {Promise<void>} A promise that resolves when the collection is cleared.
 */
Mongo.Collection.prototype.clear = async function() {
  if (Meteor.isServer) return;

  return clear(this._name); // this._name is the colleciton name
}

// we only want to set up the onlineCollections Map, not change any behavior regarding Mongo.Collection
const originalCollection = Mongo.Collection;
Mongo.Collection = function Collection(name, options) {
  const instance = new originalCollection(name, options);

  if (Offline.config.keepAll) {
    const { filter, sort, limit } = Offline.config;
    if (deepContains(filter, null)) filter[needsReplace] = true;
    offlineCollections.set(name, { filter, sort, limit });
  }

  return instance;
}

Object.assign(Mongo.Collection, originalCollection); // preserve methods and properties
Mongo.Collection.prototype = originalCollection.prototype;
Mongo.Collection.prototype.constructor = Mongo.Collection;
