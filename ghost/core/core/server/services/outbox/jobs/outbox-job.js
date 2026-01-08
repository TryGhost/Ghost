const {parentPort} = require('worker_threads');
const StartOutboxProcessingEvent = require('../events/start-outbox-processing-event');

function cancel() {
    if (parentPort) {
        parentPort.postMessage('Outbox job cancelled before completion');
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
        parentPort.postMessage({
            event: {
                type: StartOutboxProcessingEvent.name
            }
        });
        parentPort.postMessage('done');
    } else {
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    }
})();
