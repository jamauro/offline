import { isSyncing } from './sync';

// suppress the invocation-failed message when using { noRetry: true }
const originalApply = Meteor.connection._apply;
Meteor.connection._apply = function (name, stubCallValue, args, options, callback) {
  if (!options?.noRetry) {
    return originalApply.call(this, name, stubCallValue, args, options, callback);
  }

  const cb = (error, result) => {
    if (error && error.error === 'invocation-failed') {
      return;
    }

    return callback(error, result);
  };

  return originalApply.call(this, name, stubCallValue, args, options, cb);
};

// unsubs is used to ignore unsub removals so that they remain in the offline db
export const unsubs = new Map();
const _processOneDataMessageOriginal = Meteor.connection._processOneDataMessage;
Meteor.connection._processOneDataMessage = function (msg, updates) {
  const { msg: messageType, collection: collectionName, id } = msg;

  if (messageType === 'nosub') {
    for (const [name, messages] of Object.entries(updates)) {
      unsubs.set(name, messages.map(m => m.id))
    }
    Promise.resolve().then(() => {
      unsubs.clear();
    });
  }

  try {
    return _processOneDataMessageOriginal.call(this, msg, updates);
  } catch (error) {
    if (isSyncing() && error.message.includes('Server sent add for existing id')) return; // suppress the error if we added a doc offline with a preset _id and the server sends an 'added' message
    throw error;
  }
}
