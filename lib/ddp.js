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
    // jam:method on Meteor 3 calls applyAsync(name, args, options) without a
    // 4th callback when it sets noRetry while offline. Delivering the result
    // would otherwise throw "o is not a function" after minification.
    if (typeof callback === 'function') {
      return callback(error, result);
    }
  };

  return originalApply.call(this, name, stubCallValue, args, options, cb);
};

// nosub is used to ignore sub removals so that they remain in the offline db
export let noSub = false;

const _livedata_nosubOriginal = Meteor.connection._livedata_nosub;
Meteor.connection._livedata_nosub = function (msg) {
  try {
    noSub = true;
    return _livedata_nosubOriginal.call(this, msg);
  } catch (error) {
    if (isSyncing() && error.message.includes('Server sent add for existing id')) return; // suppress the error if we added a doc offline with a preset _id and the server sends an 'added' message
    throw error;
  } finally {
    Promise.resolve().then(() => {
      noSub = false;
    });
  }
}
