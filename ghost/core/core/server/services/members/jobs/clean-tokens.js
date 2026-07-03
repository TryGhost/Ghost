const {parentPort} = require('worker_threads');
const cleanTokens = require('./lib/clean-tokens');

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
    const deletedTokens = await cleanTokens(db);

    if (parentPort) {
        parentPort.postMessage(`Removed ${deletedTokens} tokens`);
        parentPort.postMessage('done');
    } else {
        // give the logging pipes time finish writing before exit
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    }
})();
