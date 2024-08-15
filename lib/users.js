import { Meteor } from 'meteor/meteor';
import { offlineCollections } from './mongo';
import { Offline } from './config';

Meteor.startup(() => {
  if (Offline.config.keepAll && !offlineCollections.has('users')) {
    Meteor.users?.keep(); // keep users by default. we do it this way because the Meteor.users collection will likely have been instantiated before this package loads.
  }
});
