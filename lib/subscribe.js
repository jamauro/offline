const originalSubscribe = Meteor.subscribe;
Meteor.subscribe = function subscribe(name, ...args) {
  if (Meteor.status().status === 'offline') {
    return {
      ready: () => true, // mark the sub ready when offline, we'll use any data we have available in indexeddb
      stop: () => {}
    };
  }

  return originalSubscribe.call(this, name, ...args);
}


