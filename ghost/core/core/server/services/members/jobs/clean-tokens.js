const {parentPort} = require('worker_threads');
const debug = require('@tryghost/debug')('jobs:clean-tokens');
const moment = require('moment');

// Exit early when cancelled to prevent stalling shutdown. No cleanup needed when cancelling as everything is idempotent and will pick up
// where it left off on next run
function cancel() {
    if (parentPort) {
        parentPort.postMessage('Expired complimentary subscriptions cleanup cancelled before completion');
        parentPort.postMessage('cancelled');
    } else {
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    }
}

if (parentPort) {
    parentPort.once('message', (message) => {
        if (message === 'cancel') {
            return cancel();
        }
    });
}

(async () => {
    const cleanupStartDate = new Date();
    const db = require('../../../data/db');
    debug(`Starting cleanup of tokens`);

    // We delete all tokens that are older than 24 hours.
    const d = moment.utc().subtract(24, 'hours');
    const deletedTokens = await db.knex('tokens')
        .where('created_at', '<', d.format('YYYY-MM-DD HH:mm:ss')) // we need to be careful about the type here. .format() is the only thing that works across SQLite and MySQL
        .delete();

    const cleanupEndDate = new Date();

    debug(`Removed ${deletedTokens} tokens created before ${d.toISOString()} in ${cleanupEndDate.valueOf() - cleanupStartDate.valueOf()}ms`);

    if (parentPort) {
        parentPort.postMessage(`Removed ${deletedTokens} tokens created before ${d.toISOString()} in ${cleanupEndDate.valueOf() - cleanupStartDate.valueOf()}ms`);
        parentPort.postMessage('done');
    } else {
        // give the logging pipes time finish writing before exit
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    }
})();
