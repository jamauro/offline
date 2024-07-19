import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Offline } from './config';
import { deepContains } from './utils/shared';
const { clear } = Meteor.isClient && require('./idb');

export const offlineCollections = new Map();

/**
 * Keeps a filter, sort, and limit configuration for the MongoDB collection.
 *
 * @function
 * @memberof Mongo.Collection
 * @param {Object} filter - The filter object to keep.
 * @param {Object} [options] - Optional settings.
 * @param {Object} [options.sort=Offline.config.sort] - The sort order.
 * @param {number} [options.limit=Offline.config.limit] - The limit of documents.
 * @throws {Error} Throws an error if no filter is provided.
 */
Mongo.Collection.prototype.keep = function(filter, { sort = Offline.config.sort, limit = Offline.config.limit } = {}) {
  if (!filter) {
    throw new Error('You must provide a filter to keep');
  }

  const collection = this;

  offlineCollections.set(collection._name, { filter, sort, limit, ...(Meteor.isServer && { filterHasNull: deepContains(filter, null) }) });
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

  const collection = this;
  return clear(collection._name);
}

// we only want to set up the onlineCollections Map, not change any behavior regarding Mongo.Collection
const originalCollection = Mongo.Collection;
Mongo.Collection = function Collection(name, options) {
  const instance = new originalCollection(name, options);

  if (Offline.config.keepAll) {
    const { filter, sort, limit } = Offline.config;

    offlineCollections.set(name, { filter, sort, limit, ...(Meteor.isServer && { filterHasNull: deepContains(filter, null) }) });
  }

  return Object.assign(instance, Mongo.Collection.prototype);
}

Object.assign(Mongo.Collection, originalCollection); // preserve methods and properties
Mongo.Collection.prototype = originalCollection.prototype;
Mongo.Collection.prototype.constructor = Mongo.Collection;
