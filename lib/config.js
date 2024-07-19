import { check, Match } from 'meteor/check';
const { clear } = Meteor.isClient && require('./idb');

/**
 * Configuration object for managing data.
 *
 * @property {Object} filter - Filter criteria for data.
 * @property {Object} sort - Sorting options. Default is sorting by `updatedAt` in descending order.
 * @property {number} limit - Maximum number of items to return. Default is 100.
 * @property {boolean} keepAll - Whether to keep all items or not. Default is `true`.
 * @property {boolean} autoSync - Whether to automatically synchronize data. Default is `true`.
 * @property {Function} handleSyncErrors - Function to handle synchronization errors.
 * @param {Object} errorParams - Parameters for handling errors.
 * @param {Array} errorParams.replayErrors - List of errors to log.
 * @param {Array} errorParams.keepErrors - List of errors to clear and reload the page.
 */
const config = {
  filter: {}, // optionally filter which documents to keep across all collections
  sort: { updatedAt: -1 }, // keep the most recent documents assuming you have an updatedAt on each doc. if you're using a different field name for timestamps, you'll want to change this.
  limit: 100, // limit offline documents to a max of 100 for each collection
  keepAll: true, // keep data for offline use for all collections using the global filter, sort, limit. to keep data for only certain collections, set this to false and then use collection.keep() for the collections you want to use offline.
  autoSync: true, // auto sync changes made offline when the user comes back online
  handleSyncErrors: ({ replayErrors, keepErrors }) => {
    if (replayErrors) console.error(replayErrors); // if there are errors when the Meteor methods are replayed, they will be in array here with the name of the method, the method's args, and the error itself. you can use it to alert your user, logging purposes, etc.

    if (keepErrors) { // when syncing, if you're using a .keep filter or you have a global filter in the config that isn't an empty object, and there are errors reconciling with the server, they will be in an array here with the name of the collection and the error itself. you can customize how you handle these. by default, we clear the offline database for the collection since it could have stale data and reload the page.
      keepErrors.map(({ name }) => clear(name));
      window.location.reload();
    }

    return;
  }
};

/**
 * Configures the settings by merging the provided options with the default configuration.
 *
 * @param {Object} options - The options to configure.
 * @param {Object} [options.filter] - Filter criteria for data.
 * @param {Object} [options.sort] - Sorting options.
 * @param {number} [options.limit] - Maximum number of items to return.
 * @param {boolean} [options.keepAll] - Whether to keep all items.
 * @param {boolean} [options.autoSync] - Whether to automatically synchronize data.
 * @param {Function} [options.handleSyncErrors] - Function to handle synchronization errors.
 *
 * @returns {Object} The updated configuration object.
 */
const configure = options => {
  check(options, {
    filter: Match.Maybe(Object),
    sort: Match.Maybe(Object),
    limit: Match.Maybe(Number),
    keepAll: Match.Maybe(Boolean),
    autoSync: Match.Maybe(Boolean),
    handleSyncErrors: Match.Maybe(Function)
  });

  return Object.assign(config, options);
}

export const Offline = {
  config,
  configure
};
