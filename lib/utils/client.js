import { Meteor } from 'meteor/meteor';
import { MongoID } from 'meteor/mongo-id';

export const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export const stringifyId = id => id instanceof MongoID.ObjectID ? id.valueOf() : id;
export const parseId = id => MongoID.idParse(id);
export const convertIds = (items, convertFn) => items.map(item => item._id ? { ...item, _id: convertFn(item._id) } : item);

export const checkOffline = () => {
  const { status, connected } = Meteor.status() || {};
  return !connected && status !== 'connecting';
};

const applyOptions = {
  noRetry: true, // when we replay methods, we want to make sure they aren't continually retried using Meteor's internal mechanism since it can cause issues if the user has a flaky connection
  ...(Meteor.isFibersDisabled ? { returnServerResultPromise: true } : { isFromCallAsync: true })
};

export function callMethod(name, args) { // args is expected to be an array
  return new Promise((resolve, reject) => { // we're wrapping in a promise to have the same interface for 2.x and 3.x. the callback is also needed in 3.x so that we can suppress the invocation-failed error in ddp.js
    Meteor.applyAsync(name, args, applyOptions, (error, result) => {
      if (error) {
        reject(error)
      } else {
        resolve(result)
      }
    });
  });
}
