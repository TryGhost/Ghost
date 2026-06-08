const {parentPort} = require('node:worker_threads');
const StartGiftCleanupEvent = require('../events/start-gift-cleanup-event');

// Recurring job to clean consumed and expired gifts. The actual work runs on
// the main thread via a domain event so we don't have to re-initialize every
// service dependency inside this worker

// Exit early when cancelled to prevent stalling shutdown. No cleanup needed
// when cancelling as everything is idempotent and will pick up where it left
// off on next run
function cancel() {
    if (parentPort) {
        parentPort.postMessage('Gift cleanup job cancelled before completion');
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
    if (parentPort) {
        // Bounce to the main thread via the JobManager's event bridge - the
        // GiftServiceWrapper subscribes to this event and runs the work in the
        // already-initialised main process
        parentPort.postMessage({
            event: {
                type: StartGiftCleanupEvent.name
            }
        });
        parentPort.postMessage('done');
    } else {
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    }
})();
