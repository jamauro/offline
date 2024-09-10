import { Meteor } from 'meteor/meteor';
import { MongoInternals } from 'meteor/mongo';
import { offlineCollections } from './mongo';
import { isEmpty, needsReplace, deepReplace, PLACEHOLDER_USER_ID } from './utils/shared';
import { splitAllSettled } from './utils/server';

// this function reconciles offline data with the server in case documents that no longer match a .keep filter need to be removed
Meteor.methods({
  '_keep': async function(syncs) {
    check(syncs, [{
      name: String,
      syncedAt: Date
    }]);

    const { userId } = this;

    const offlineCollectionsWithFilter = [...offlineCollections.entries()].reduce((acc, [name, { filter, sort }]) => {
      return isEmpty(filter) ? acc : [...acc, { name, filter, sort }];
    }, []);

    if (!syncs.length) {
      const synced = offlineCollectionsWithFilter.map(({ name }) => ({ name, removeIds: [], syncedAt: new Date() }));
      return { synced, errors: [] };
    }

    const promises = offlineCollectionsWithFilter.map(async ({ name, filter, sort }) => {
      const replacedFilter = filter[needsReplace] ? deepReplace(filter, PLACEHOLDER_USER_ID, userId) : filter;
      const [ sortKey ] = Object.keys(sort);
      const { syncedAt } = syncs.find(s => s.name === name);
      const finalFilter = { $and: [{ $nor: [replacedFilter] }, { [sortKey]: {$gt: syncedAt} }] };
      const rawCollection = MongoInternals.defaultRemoteCollectionDriver().mongo.db.collection(name);

      try {
        const removeIds = (await rawCollection.distinct('_id', finalFilter)).map(String); // make sure _ids are strings, used to support Mongo.ObjectID
        return { name, removeIds, syncedAt: new Date() };
      } catch (error) {
        return { name, error };
      }
    });

    const { fulfilled, rejected } = splitAllSettled(await Promise.allSettled(promises));

    return { synced: fulfilled, errors: rejected };
  }
});
