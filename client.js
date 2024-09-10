import './lib/users';
import './lib/load';
import './lib/ddp';
import './lib/subscribe';
import { isSyncing } from './lib/sync';
import { Offline } from './lib/config';
import { queueMethod, clearAll } from './lib/idb';

const originalDebug = Meteor._debug;
Meteor._debug = function (m, s) {
  if (isSyncing() && s?.message.includes('MinimongoError: Duplicate _id') ) return; // suppress this debug error while syncing. it should only need suppression in the scenario where you invoke an insert with a preset _id which should be rare and you'd probably want to use an upsert instead
  return originalDebug.call(this, m, s);
}

export { Offline, isSyncing, queueMethod, clearAll };
