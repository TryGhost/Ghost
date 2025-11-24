const {parentPort} = require('worker_threads');
const StartMemberWelcomeEmailJobEvent = require('../events/StartMemberWelcomeEmailJobEvent');

function cancel() {
    if (parentPort) {
        parentPort.postMessage('Member welcome email job cancelled before completion');
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
    // We send an event message, so that it is emitted on the main thread by the job manager
    // This will start the member welcome email job on the main thread (the wrapper service is listening for this event)
    parentPort.postMessage({
        event: {
            type: StartMemberWelcomeEmailJobEvent.name
        }
    });

    if (parentPort) {
        parentPort.postMessage('done');
    } else {
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    }
})();
