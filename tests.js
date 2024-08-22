// Import Tinytest from the tinytest Meteor package.
import { Tinytest } from 'meteor/tinytest';
import { Mongo } from 'meteor/mongo';
import { Random } from 'meteor/random';
import { Tracker } from 'meteor/tracker';
import { offlineCollections } from './lib/mongo';
import { Offline, clearAll, queueMethod } from 'meteor/jam:offline';
import { deepReplace, deepContains } from './lib/utils/shared';
const { getAll, canQueue, removeWithRetry } = Meteor.isClient && require('./lib/idb');

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const applyOptions = {
  returnStubValue: true,
  ...(Meteor.isFibersDisabled ? { returnServerResultPromise: true } : { isFromCallAsync: true })
}

Meteor.userId = () => '1'; // Mocked

const Things = new Mongo.Collection('things');
Things.keep({ text: 'stuff' }, { sort: { createdAt: 1 }, limit: 2 });

const Notes = new Mongo.Collection('notes');
Notes.keep({}, { limit: 2 });

const Dogs = new Mongo.Collection('dogs');
Dogs.keep();

const Cars = new Mongo.Collection('cars');
Cars.keep();

const Orders = new Mongo.Collection('orders', { idGeneration: 'MONGO' });
Orders.keep();

const Items = new Mongo.Collection('items');
Items.keep({}, { sort: { updatedAt: 1 }, limit: 2 });

const Books = new Mongo.Collection('books');
Books.keep({ title: 'howdy' });

if (Meteor.isServer) {
  Meteor.publish('things', function() {
    return Things.find({});
  });

  Meteor.publish('notes', function() {
    return Notes.find({});
  });

  Meteor.publish('dogs', function() {
    return Dogs.find({});
  });

  Meteor.publish('cars', function() {
    return Cars.find({});
  });

  Meteor.publish('orders', function() {
    return Orders.find({});
  });

  Meteor.publish('items', function() {
    return Items.find({});
  });

  Meteor.publish('books', function() {
    return Books.find({});
  });
}

const resetThings = async () => {
  return Things.removeAsync({});
}
const resetNotes = async () => {
  return Notes.removeAsync({});
}
const resetDogs = async () => {
  return Dogs.removeAsync({});
}
const resetCars = async () => {
  return Cars.removeAsync({});
}
const resetOrders = async () => {
  return Orders.removeAsync({});
}
const resetItems = async () => {
  return Items.removeAsync({});
}
const resetBooks = async () => {
  return Books.removeAsync({});
}

const insertThing = async ({ text }) => {
  return Things.insertAsync({ text, createdAt: new Date(), updatedAt: new Date() });
}

const updateThing = async ({ _id, text }) => {
  return Things.updateAsync(_id, { $set: { text,  createdAt: new Date(), updatedAt: new Date() }});
}

const insertNote = async ({ text }) => {
  return Notes.insertAsync({ text, createdAt: new Date(), updatedAt: new Date() });
}

const updateNote = async ({ _id, text }) => {
  return Notes.updateAsync(_id, { $set: { text,  createdAt: new Date(), updatedAt: new Date() }});
}

const removeNote = async ({ _id, text }) => {
  return Notes.removeAsync(_id);
}

const insertDog = async ({ text }) => {
  return Dogs.insertAsync({ text, createdAt: new Date(), updatedAt: new Date() });
}

const upsertDog = async ({ _id, text }) => {
  return Dogs.upsertAsync(_id, { text, createdAt: new Date(), updatedAt: new Date() });
}

const updateDog = async ({ _id, text }) => {
  return Dogs.updateAsync(_id, { $set: { text,  createdAt: new Date(), updatedAt: new Date() }});
}

const insertCar = async ({ text }) => {
  return Cars.insertAsync({ text, createdAt: new Date(), updatedAt: new Date() });
}

const insertOrder = async ({ text }) => {
  return Orders.insertAsync({ text, createdAt: new Date(), updatedAt: new Date() });
}

const updateOrder = async ({ _id, text }) => {
  return Orders.updateAsync(_id, { $set: { text,  createdAt: new Date(), updatedAt: new Date() }});
}

const removeOrder = async ({ _id, text }) => {
  return Orders.removeAsync(_id);
}

const insertItem = async ({ text }) => {
  return Items.insertAsync({ text, createdAt: new Date(), updatedAt: new Date() });
}

const updateItem = async ({ _id, text }) => {
  return Items.updateAsync(_id, { $set: { text,  createdAt: new Date(), updatedAt: new Date() }});
}

const insertBook = async ({ title }) => {
  return Books.insertAsync({ title, createdAt: new Date(), updatedAt: new Date() });
}

const updateBook = async ({ _id, title }) => {
  return Books.updateAsync(_id, { $set: { title,  createdAt: new Date(), updatedAt: new Date() }});
}

Meteor.methods({ insertThing, updateThing, insertNote, updateNote, removeNote, insertDog, upsertDog, updateDog, insertCar, insertOrder, updateOrder, removeOrder, insertItem, updateItem, insertBook, updateBook });

if (Meteor.isServer) {
  Meteor.methods({ resetThings, resetNotes, resetDogs, resetCars, resetOrders, resetItems, resetBooks })
}

// Client only tests
if (Meteor.isClient) {
  Tinytest.addAsync('keep', async (test) => {

    const things = offlineCollections.get('things')
    test.equal(things.filter.text, 'stuff')
    test.equal(things.sort.createdAt, 1)
    test.equal(things.limit, 2)
  });

  Tinytest.addAsync('clear', async (test) => {
    await Things.clear();
    await Meteor.callAsync('resetThings');

    let sub;
    const comp = Tracker.autorun(() => {
      sub = Meteor.subscribe('things');
    });

    let things;
    await Meteor.callAsync('insertThing', {text: 'stuff'});
    await wait(100);

    things = await getAll('things');
    test.equal(things.length, 1);

    await Things.clear();

    things = await getAll('things');
    test.equal(things.length, 0);

    sub.stop();
    comp.stop();
  });

  Tinytest.addAsync('clearAll', async (test) => {
    await Meteor.callAsync('resetThings');
    await Meteor.callAsync('resetNotes');
    await clearAll();

    let sub;
    const comp = Tracker.autorun(() => {
      sub = Meteor.subscribe('things');
    });

    let sub2;
    const comp2 = Tracker.autorun(() => {
      sub2 = Meteor.subscribe('notes');
    });

    let things;
    let notes;
    await Meteor.callAsync('insertThing', {text: 'stuff'});
    await Meteor.callAsync('insertNote', {text: 'hi'});

    things = await getAll('things');
    notes = await getAll('notes');

    test.equal(things.length, 1);
    test.equal(notes.length, 1);

    await clearAll();

    things = await getAll('things');
    test.equal(things.length, 0);

    notes = await getAll('notes');
    test.equal(notes.length, 0);

    sub.stop();
    sub2.stop();
    comp.stop();
    comp2.stop();
  });

  Tinytest.addAsync('filter', async (test) => {
    await wait(100)
    await Meteor.callAsync('resetThings');

    let sub;
    const comp = Tracker.autorun(() => {
      sub = Meteor.subscribe('things');
    });


    await Meteor.callAsync('insertThing', {text: 'stuff'});
    await wait(100);
    await Meteor.callAsync('insertThing', {text: 'hi'});
    await wait(100);

    const things = await getAll('things');
    test.equal(things.length, 1);

    await Things.clear();

    sub.stop();
    comp.stop();
  });

  Tinytest.addAsync('limit', async (test) => {
    await wait(100);
    await Meteor.callAsync('resetNotes');

    let sub;
    const comp = Tracker.autorun(() => {
      sub = Meteor.subscribe('notes');
    });

    await Meteor.callAsync('insertNote', {text: 'stuff'});
    await wait(100);
    await Meteor.callAsync('insertNote', {text: 'stuff'});
    await wait(100);
    await Meteor.callAsync('insertNote', {text: 'hi'});
    await wait(100);

    const notes = await getAll('notes');
    test.equal(notes.length, 2);

    await Notes.clear();

    sub.stop();
    comp.stop();
  });

  Tinytest.addAsync('sort - newest', async (test) => {
    await Meteor.callAsync('resetNotes');
    await Notes.clear();

    let sub;
    const comp = Tracker.autorun(() => {
      sub = Meteor.subscribe('notes');
    });


    const note1 = await Meteor.callAsync('insertNote', {text: 'hi'});
    const note2 = await Meteor.callAsync('insertNote', {text: 'hi'});
    const note3 = await Meteor.callAsync('insertNote', {text: 'hi'});
    const note4 = await Meteor.callAsync('insertNote', {text: 'hi'});

    const notes = await getAll('notes');
    test.equal(notes.length, 2);

    test.isTrue(notes.map(t => t._id).includes(note3))
    test.isTrue(notes.map(t => t._id).includes(note4))
    test.isFalse(notes.map(t => t._id).includes(note1))
    test.isFalse(notes.map(t => t._id).includes(note2))

    await Notes.clear();

    sub.stop();
    comp.stop();
  });

  Tinytest.addAsync('sort - oldest', async (test) => {
    await wait(100);
    await Meteor.callAsync('resetItems');
    await Items.clear();
    await wait(100);

    let sub;
    const comp = Tracker.autorun(() => {
      sub = Meteor.subscribe('items');
    });


    const item1 = await Meteor.callAsync('insertItem', {text: 'stuff'});
    await wait(100)
    const item2 = await Meteor.callAsync('insertItem', {text: 'stuff'});
    await wait(100)
    const item3 = await Meteor.callAsync('insertItem', {text: 'stuff'});
    await wait(100)
    const item4 = await Meteor.callAsync('insertItem', {text: 'hi'});
    await wait(100)

    const items = await getAll('items');
    test.equal(items.length, 2);

    test.isTrue(items.map(t => t._id).includes(item1))
    test.isTrue(items.map(t => t._id).includes(item2))
    test.isFalse(items.map(t => t._id).includes(item3))
    test.isFalse(items.map(t => t._id).includes(item4))

    await Items.clear();

    sub.stop();
    comp.stop();
  });


  Tinytest.addAsync('brief disconnect', async (test) => { // these tests can be a little flaky due to timing issues in simulating the methods and reconnecting etc.
    await wait(200);
    await Meteor.callAsync('resetNotes');
    await Notes.clear();

    let sub;
    const comp = Tracker.autorun(computation => {
      sub = Meteor.subscribe('notes');
    });


    const note1 = await Meteor.callAsync('insertNote', {text: 'hi'});
    await wait(100)
    const note2 = await Meteor.callAsync('insertNote', {text: 'hi'});
    await wait(100);

    Meteor.disconnect();
    const note3 = await Meteor.applyAsync('insertNote', [{text: 'sup'}], { ...applyOptions, noRetry: true });
    await queueMethod('insertNote', {text: 'sup'})
    await wait(20);
    Meteor.reconnect();

    await wait(100);

    const notes = await getAll('notes');

    test.isFalse(notes.map(n => n._id).includes(note3));
    test.isTrue(!notes.map(n => n._id).includes(note1));

    test.equal(Notes.find().fetch().length, 3);
    test.isTrue(Notes.find().fetch().map(n => n.text).includes('sup'));

    await Notes.clear();

    sub.stop();
    comp.stop();
  });

  Tinytest.addAsync('browser refresh', async (test) => { // these tests can be a little flaky due to timing issues in simulating the methods and reconnecting etc.
    await wait(200);
    await Meteor.callAsync('resetNotes');
    await Notes.clear();

    let sub;
    const comp = Tracker.autorun(computation => {
      sub = Meteor.subscribe('notes');
    });

    const note1 = await Meteor.callAsync('insertNote', {text: 'hi'});
    const note2 = await Meteor.callAsync('insertNote', {text: 'hi'});

    Meteor.disconnect();
    const note3 = await Meteor.applyAsync('insertNote', [{text: 'sup'}], { ...applyOptions, noRetry: true });
    await queueMethod('insertNote', {text: 'sup'})

    // simulate page reload or user exits app and comes back later
    Meteor.connection._methodInvokers = {};

    await wait(100);

    Meteor.reconnect();

    await wait(50);

    const notes = await getAll('notes');

    test.isFalse(notes.map(n => n._id).includes(note3))
    test.isTrue(!notes.map(n => n._id).includes(note1))
    test.equal(Notes.find().fetch().length, 3)
    test.isTrue(Notes.find().fetch().map(n => n.text).includes('sup'))

    await Notes.clear();

    sub.stop();
    comp.stop();
  });

  Tinytest.addAsync('replay - add and change same doc', async (test) => {
    await wait(200);
    await Meteor.callAsync('resetNotes');
    await Notes.clear();

    let sub;
    const comp = Tracker.autorun(computation => {
      sub = Meteor.subscribe('notes');
    });


    const note1 = await Meteor.callAsync('insertNote', {text: 'hi'});
    const note2 = await Meteor.callAsync('insertNote', {text: 'hi'});

    Meteor.disconnect();
    await wait(100);
    const note3 = await Meteor.applyAsync('insertNote', [{text: 'more'}], { ...applyOptions, noRetry: true });
    await queueMethod('insertNote', {text: 'more'})
    await wait(100);
    await Meteor.applyAsync('updateNote', [{_id: note3, text: 'hello'}], { ...applyOptions, noRetry: true });
    await queueMethod('updateNote', {_id: note3, text: 'hello'})
    await wait(100);

    Meteor.reconnect();

    await wait(10);

    const notes = await getAll('notes');

    test.isFalse(notes.map(n => n._id).includes(note3)) // it should be swapped with the result of the queued method
    test.isTrue(!notes.map(n => n._id).includes(note1))

    test.equal(Notes.find().fetch().length, 3)
    test.isTrue(Notes.find().fetch().map(n => n.text).includes('hello'))

    await Notes.clear();

    sub.stop();
    comp.stop();
  });

  Tinytest.addAsync('replay - add and change same doc with upsert to preserve _id', async (test) => {
    await wait(200);
    await Meteor.callAsync('resetDogs');
    await Dogs.clear();

    let sub;
    const comp = Tracker.autorun(computation => {
      sub = Meteor.subscribe('dogs');
    });

    const dog1 = await Meteor.callAsync('insertDog', {text: 'hi'});
    const dog2 = await Meteor.callAsync('insertDog', {text: 'hi'});

    Meteor.disconnect();
    await wait(100);
    const dog3 = Random.id();
    await Meteor.applyAsync('upsertDog', [{_id: dog3, text: 'more'}], { ...applyOptions, noRetry: true });
    await queueMethod('upsertDog', {_id: dog3, text: 'more'})

    await wait(200);
    await Meteor.applyAsync('updateDog', [{_id: dog3, text: 'hello'}], { ...applyOptions, noRetry: true });
    await queueMethod('updateDog', {_id: dog3, text: 'hello'})
    await wait(100);

    Meteor.reconnect();

    await wait(10);

    const dogs = await getAll('dogs');

    test.isTrue(dogs.map(d => d._id).includes(dog3)) // it should be preserved

    test.equal(Dogs.find().fetch().length, 3)
    test.isTrue(Dogs.find().fetch().map(d => d.text).includes('hello'))

    await Dogs.clear();

    sub.stop();
    comp.stop();
  });

  Tinytest.addAsync('replay - add, change, remove', async (test) => {
    await wait(200);
    await Meteor.callAsync('resetNotes');
    await Notes.clear();

    let sub;
    const comp = Tracker.autorun(computation => {
      sub = Meteor.subscribe('notes');
    });


    const note1 = await Meteor.callAsync('insertNote', {text: 'hi'});
    const note2 = await Meteor.callAsync('insertNote', {text: 'hi'});
    const note3 = await Meteor.callAsync('insertNote', {text: 'to remove'});

    Meteor.disconnect();
    await wait(100);
    const note4 = await Meteor.applyAsync('insertNote', [{text: 'another'}], { ...applyOptions, noRetry: true });
    await queueMethod('insertNote', {text: 'another'})
    await wait(200);
    await Meteor.applyAsync('updateNote', [{_id: note1, text: 'hello'}], { ...applyOptions, noRetry: true });
    await queueMethod('updateNote', {_id: note1, text: 'hello'})
    await wait(200);
    await Meteor.applyAsync('removeNote', [{_id: note3 }], { ...applyOptions, noRetry: true });
    await queueMethod('removeNote', {_id: note3 })
    await wait(100);

    Meteor.reconnect();

    await wait(10);

    const notes = await getAll('notes');

    test.isFalse(notes.map(n => n._id).includes(note4)) // it should be swapped with the result of the queued method
    test.isTrue(!notes.map(n => n._id).includes(note1))

    test.equal(Notes.find().fetch().length, 3)
    test.isTrue(Notes.find().fetch().map(n => n.text).includes('another'))

    await Notes.clear();

    sub.stop();
    comp.stop();
  });

  Tinytest.addAsync('replay - add, change, remove (Mongo.ObjectID)', async (test) => {
    await wait(200);
    await Meteor.callAsync('resetOrders');
    await Orders.clear();

    let sub;
    const comp = Tracker.autorun(computation => {
      sub = Meteor.subscribe('orders');
    });


    const order1 = await Meteor.callAsync('insertOrder', {text: 'hi'});
    const order2 = await Meteor.callAsync('insertOrder', {text: 'hi'});
    const order3 = await Meteor.callAsync('insertOrder', {text: 'to remove'});

    Meteor.disconnect();
    await wait(100);
    const order4 = await Meteor.applyAsync('insertOrder', [{text: 'another'}], { ...applyOptions, noRetry: true });
    await queueMethod('insertOrder', {text: 'another'})
    await wait(200);
    await Meteor.applyAsync('updateOrder', [{_id: order1, text: 'hello'}], { ...applyOptions, noRetry: true });
    await queueMethod('updateOrder', {_id: order1, text: 'hello'})
    await wait(200);
    await Meteor.applyAsync('removeOrder', [{_id: order3 }], { ...applyOptions, noRetry: true });
    await queueMethod('removeOrder', {_id: order3 })
    await wait(100);

    Meteor.reconnect();

    await wait(10);

    const orders = await getAll('orders');

    test.isFalse(orders.map(o => o._id).includes(order4.toString())) // it should be swapped with the result of the queued method
    test.isTrue(!orders.map(o=> o._id).includes(order1.toString()))

    test.equal(Orders.find().fetch().length, 3)
    test.isTrue(Orders.find().fetch().map(o => o.text).includes('another'))

    await Orders.clear();

    sub.stop();
    comp.stop();
  });

  Tinytest.add('canQueue', function (test) {
    const originalConfig = Offline.config;
    const originalOfflineCollections = offlineCollections;
    // Test case 1: Offline.config.keepAll is true
    Offline.config = { keepAll: true };
    test.isTrue(canQueue('insertTask'), 'Should queue method when keepAll is true');

    // Test case 2: Offline.config.keepAll is false, matching collection name
    Offline.config = { keepAll: false };
    offlineCollections.set('tasks', true);
    test.isTrue(canQueue('insertTask'));

    // Test case 3: Offline.config.keepAll is false, matching singular collection name
    offlineCollections.clear(); // Clear previous collections
    offlineCollections.set('tasks', true);
    test.isTrue(canQueue('insertTasks'));

    // Test case 4: Offline.config.keepAll is false, no matching collection name
    offlineCollections.clear(); // Clear previous collections
    test.isFalse(canQueue('updateUser'));

    // return to previous setup
    Offline.config = originalConfig;
    for (const [key, value] of originalOfflineCollections) {
      offlineCollections.set(key, value);
    }
  });

  Tinytest.addAsync('methods are not queued when queueMethod is not used', async (test) => {
    await wait(200);
    await Cars.clear();
    await Meteor.callAsync('resetCars');

    let sub;
    const comp = Tracker.autorun(() => {
      sub = Meteor.subscribe('cars');
    });

    await wait(100);
    Meteor.disconnect();
    await wait(100);
    await Meteor.applyAsync('insertCar', [{text: 'hi'}], { ...applyOptions, noRetry: true });
    await wait(100);

    const cars = await getAll('cars')
    test.equal(cars.length, 1);

    const methods = await getAll('methods');
    test.equal(methods.length, 0);

    await wait(100);
    Meteor.reconnect();
    await wait(100);

    await Cars.clear();

    sub.stop();
    comp.stop();
  });
}

Tinytest.add('deepReplace', function (test) {
  // Sample deeply nested object
  const obj1 = {
    $and: [
      { field1: { $gt: 5 } },
      { $or: [
          { field2: { $lt: 10 } },
          { field3: { $exists: true } }
        ]
      }
    ]
  };

  // Perform deep replacement
  const replacedObj1 = deepReplace(obj1, undefined, 'replacement');

  // Expected result after replacement
  const expectedObj1 = {
    $and: [
      { field1: { $gt: 5 } },
      { $or: [
          { field2: { $lt: 10 } },
          { field3: { $exists: true } }
        ]
      }
    ]
  };

  // Check if the objects are deeply equal
  test.equal(replacedObj1, expectedObj1);

  // Example with different replacement
  const obj2 = {
    $or: [
      { field1: { $eq: undefined } },
      { field2: { $ne: undefined } }
    ]
  };

  const replacedObj2 = deepReplace(obj2, undefined, 'new value');

  const expectedObj2 = {
    $or: [
      { field1: { $eq: 'new value' } },
      { field2: { $ne: 'new value' } }
    ]
  };

  test.equal(replacedObj2, expectedObj2);

  // Example with non-nested object
  const obj3 = {
    key1: undefined,
    key2: 10,
    key3: undefined,
    key4: 'some value'
  };

  const replacedObj3 = deepReplace(obj3, undefined, 'replacement');

  const expectedObj3 = {
    key1: 'replacement',
    key2: 10,
    key3: 'replacement',
    key4: 'some value'
  };

  test.equal(replacedObj3, expectedObj3);
});

Tinytest.add('deepContains', function (test) {
  const obj = { a: 1, b: { c: 2 } };
  test.equal(deepContains(obj, 2), true);
  test.equal(deepContains(obj, 3), false);

  const str = 'hello';
  test.equal(deepContains(str, 'hello'), true);
  test.equal(deepContains(str, 'world'), false);

  const arr = [1, 2, [3, 4]];
  test.equal(deepContains(arr, 3), true);
  test.equal(deepContains(arr, 5), false);

  const deepArrOfObjs = [{ a: [{ b: { c: 3 } }] }, { d: { e: 4 } }];
  test.equal(deepContains(deepArrOfObjs, 3), true);
  test.equal(deepContains(deepArrOfObjs, 5), false);
});
