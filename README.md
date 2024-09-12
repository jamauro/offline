# Offline

Offline is an easy way to give your Meteor app offline capabilities and make it feel instant. Its key features are:

* **Offline access** – Saves Minimongo data in IndexedDB for offline access and instant reloading when reconnected.
* **Automatic syncing** – Syncs offline actions automatically once reconnected.
* **Cross-Tab syncing** – Keeps changes in sync across multiple tabs while offline.
* **Seamless reconciliation** – Reconciles data with the server when reconnected.

## Usage

### Add the package to your app
`meteor add jam:offline`

### Keeping data offline
By default, offline data will be kept for all collections using the global defaults in [Offline.config](#configuring-optional) without any configuration needed. To change the data that is kept for a specific collection, define `.keep` for the collection in a file that's imported on both client and server.

If you don't want all collections to be kept, be sure to configure `keepAll: false`. See [Configuring](#configuring-optional) for more details.

`.keep` accepts a `filter`, and `sort` and `limit` options much like a `.find`. For example:

```js
const Todos = new Mongo.Collection('todos');
Todos.keep({ $or: [ { isPrivate: { $ne: true } }, { owner: Meteor.userId() } ]}, { limit: 200 }) // this will override any global defaults
```

If you have specific restrictions on what should be kept, e.g. permissions to a document like in the example above, these should be included in the `.keep` filter. Be aware that when the user comes back online, this filter will be used to reconcile with the server. In general, it's recommended that you only use the `.keep` filter where absolutely needed.

**`Note`**: You can use `Meteor.userId()` in your `.keep` filter if needed.

### Clearing offline data for a specific collection
If you ever need to clear offline data for a specific collection, call `clear`:

```js
Todos.clear();
```

### Clearing all offline data
If you ever need to completely clear all offline data, you can use `clearAll`:

```js
import { clearAll } from 'meteor/jam:offline';

clearAll();
```

### Queuing methods when offline
When a user is offline, you can queue any actions they take for replay when they come back online using `queueMethod`:

```js
import { queueMethod } from 'meteor/jam:offline';

if (!Meteor.status().connected) { // check that the user is offline
  queueMethod(name, arg1, arg2...) // the arguments should be the same form that you'd use for Meteor.callAsync
}
```
where name is the method's name and the arguments are what the method expects. You'll still want to call the method when offline and it's recommended that you use [Meteor.applyAsync](https://docs.meteor.com/api/methods.html#Meteor-applyAsync) with the option `noRetry: true` to avoid using Meteor's built-in retry mechanism since we'll be handling replay separately. For this to work as intended, the methods that you call should be isomorphic so that they're availble to the client.

**`Note`**: If you're using [jam:method](https://github.com/jamauro/method), queuing methods for replay is handled automatically for you. 🎉

**`Note`**: When queuing methods than involve an `insert` to a collection, make sure the method returns the new document's `_id`. By doing this, you ensure that any subsequent changes made to the document while still offline are handled correctly.

### Auto syncing
By default, the package auto syncs when the user comes back online. This includes:

1. Replaying queued methods
2. Removing offline data for each collection that no longer belongs because it doesn't match the configured `filter` or the collection's `.keep` filter

The benefit of this sequential-replay syncing strategy is any business logic contained in your methods will be respected. For example, if a user makes changes to a document but loses permission to it while offline, when they come back online, that permission will be respected when the attempted replay occurs. If there are any errors during auto sync, they will be made available in the `handleSyncErrors` function. You can use it to make your user aware that their changes failed. See [Configuring](#configuring-optional) for more details on how to customize this.

When reconciling with the server, this package currently assumes that you'll use soft deletes so that it can remove any documents from the offline data as needed. If your app doesn't already employ a soft delete mechanism, check out the [jam:soft-delete](https://github.com/jamauro/soft-delete) package to make this easy. If you're using something other than `deleted` as the flag name for your soft deletes, be sure to configure `filter` appropriately. See [Configuring](#configuring-optional) for more details.

To know when an auto sync is processing, you can use `isSyncing()` which is a reactive variable.

```js
import { isSyncing } from 'meteor/jam:offline';

isSyncing(); // you can wrap this in a Tracker.autorun to detect when it changes
```

If you prefer not to have the behavior provided by auto sync, be sure to configure `autoSync: false`. When `autoSync` is false, Minimongo data from when the user disconnects will be kept offline so you still benefit from faster reloads on reconnects but you'll be responsible for designing any syncing logic needed. If the user hasn't refreshed the page and has a brief disconnect / reconnect, then you'll still benefit from Meteor's built-in retry mechanism for methods. But if they do refresh or exit the app and come back later, any actions performed while offline will be lost.

I think it would be great to have better support for custom syncing. If you have ideas here, let me know. At this time, I'm not sure what primitives would be most useful for you.

## Configuring (optional)
If you like the defaults, then you won't need to configure anything. But there is some flexibility in how you use this package. You may want to pay special attention to `filter` and `handleSyncErrors` to customize the experience for your users.

Here are the global defaults:
```js
const config = {
  filter: { deleted: false }, // filter which documents to keep across all collections. Recommended: use soft deletes, if you're using a different flag for your soft deletes, you'll want to change this.
  sort: { updatedAt: -1 }, // keep the most recent documents assuming you have an updatedAt on each doc. if you're using a different field name for timestamps, you'll want to change this.
  limit: 100, // limit offline documents to a max of 100 for each collection. technically indexeddb can handle significantly more than this so you'll need to determine what works best for your app.
  keepAll: true, // keep data for offline use for all collections using the global filter, sort, limit. to keep data for only certain collections, set this to false and then use collection.keep() for the collections you want to use offline.
  autoSync: true, // auto sync changes made offline when the user comes back online
  handleSyncErrors: ({ replayErrors, keepErrors }) => {
    if (replayErrors) console.error(replayErrors); // if there are errors when the Meteor methods are replayed, they will be in array here with the name of the method, the method's args, and the error itself. you can use it to alert your user, attempt a retry, logging purposes, etc.

    if (keepErrors) { // when syncing, if you're using a .keep filter or you have a global filter in the config that isn't an empty object, and there are errors reconciling with the server, they will be in an array here with the name of the collection and the error itself. you can customize how you handle these. by default, we clear the offline database for the collection since it could have stale data and reload the page.
      keepErrors.map(({ name }) => clear(name));
      window.location.reload();
    }

    return;
  }
};
````

To change the global defaults, use:
```js
// put this in a file that's imported on both the client and server
import { Offline } from 'meteor/jam:offline';

Offline.configure({
  // ... change the defaults here ... //
});
```

## Adding a service worker
You'll likely want to add a service worker as well to cache your HTML, CSS, Javascript so your users can continue to use the app offline, even if they accidentally click refresh.

Follow these [instructions](https://github.com/jamauro/pwa-kit) to add a service worker and go even further by making it a PWA (progressive web app).
