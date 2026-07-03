const {parentPort} = require('worker_threads');
const cleanExpiredComped = require('./lib/clean-expired-comped');

// recurring job to clean expired complimentary subscriptions

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
    const db = require('../../../data/db');
    const {deletedExpiredSubs, updatedMembers, memberEvents} = await cleanExpiredComped(db);

    if (parentPort) {
        // Raw member updates don't emit model events; bridge them to the main
        // thread so listeners (caches etc.) see the comped->free change.
        for (const event of memberEvents) {
            parentPort.postMessage({
                type: 'model-event',
                eventName: 'member.edited',
                model: 'Member',
                id: event.id,
                previous: event.previous,
                changed: event.changed,
                options: {
                    context: {internal: true}
                }
            });
        }
        parentPort.postMessage(`Removed ${deletedExpiredSubs} expired subscriptions, updated ${updatedMembers} members`);
        parentPort.postMessage('done');
    } else {
        // give the logging pipes time finish writing before exit
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    }
})();
