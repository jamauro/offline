## 0.3.1
* fix: loading offline data early in the startup process
* fix: infinite page reloading when making changes to the offline collections

## 0.3.0
* feat: use persisted data when navigating app offline
* feat: support soft delete to improve reconciliation and prevent zombie documents
* feat: support for `jam:soft-delete` to make soft deletes easy
* fix: pausing and resuming observers

## 0.2.3
* fix: queueing method unintentionally

## 0.2.2
* fix: ensure indexedDB stores remain in sync when adding / removing collections

## 0.2.1
* fix: preserve the `_id` when it's preset on an `insert` or `upsert`

## 0.2.0
* feat: persist `Meteor.users` collection by default so `Meteor.user()` works as expected when offline
* feat: support `Mongo.ObjectID`
* fix: under-the-hood optimizations

## 0.1.2
* fix: error on initial load - `One of the specified object stores was not found`

## 0.1.1
* fix: error - can only call `{methodName}` on server collections

## 0.1.0
* initial version
