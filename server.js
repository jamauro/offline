import './lib/mongo';
import { PLACEHOLDER_USER_ID } from './lib/utils/shared';
import { Offline } from './lib/config';
import './lib/method';

const noop = () => {};

// these are here to support isomorphism
const queueMethod = noop;
const clearAll = noop;

// we want to allow using Meteor.userId() within the .keep filter
const originalUserId = Meteor.userId;
Meteor.userId = () => PLACEHOLDER_USER_ID;

Meteor.startup(() => {
  Meteor.userId = originalUserId;
});

export { Offline, queueMethod, clearAll }
