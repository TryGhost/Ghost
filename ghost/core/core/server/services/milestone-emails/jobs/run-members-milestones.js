const {parentPort} = require('worker_threads');

// recurring job to run ARR milestone emails

// Exit early when cancelled to prevent stalling shutdown. No cleanup needed when cancelling as everything is idempotent and will pick up
// where it left off on next run
function cancel() {
    if (parentPort) {
        parentPort.postMessage('Milestone emails for members job cancelled before completion');
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
    const milestoneEmails = require('../index');
    const milestone = await milestoneEmails('members');
    let message;

    if (milestone?.type === 'members') {
        message = `Added new milestone for ${milestone?.value} members`;
    } else {
        message = `Ran milestone emails for members job and no new milestone was added`;
    }

    if (parentPort) {
        parentPort.postMessage(message);
        parentPort.postMessage('done');
    } else {
        // give the logging pipes time finish writing before exit
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    }
})();
