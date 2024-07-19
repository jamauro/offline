import { Meteor } from 'meteor/meteor';

export const bc = new BroadcastChannel('offline'); // BroadcastChannel is used to sync actions across multiple tabs when offline
export let broadcasted = false;

bc.onmessage = event => {
  broadcasted = true;
  const { name, doc, id } = event.data;
  const localCollection = Meteor.connection._mongo_livedata_collections[name];

  id ? localCollection.remove(id) : localCollection.upsert(doc._id, doc);

  broadcasted = false;
  return;
};

window.addEventListener('beforeunload', () => {
  bc.close();
});
