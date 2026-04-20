const {parentPort} = require('node:worker_threads');
const debug = require('@tryghost/debug')('jobs:send-gift-reminders');

// recurring job to send gift reminder emails.

// Exit early when cancelled to prevent stalling shutdown. No cleanup needed
// when cancelling as everything is idempotent — any gift that hasn't yet had
// its reminder recorded will be picked up on the next run.
function cancel() {
    if (parentPort) {
        parentPort.postMessage('Gift reminder job cancelled before completion');
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
    try {
        const startDate = new Date();
        debug('Starting gift reminder send');

        const giftService = require('../../gifts');
        await giftService.init();

        const {remindedCount, skippedCount, failedCount} = await giftService.service.processReminders();

        const endDate = new Date();
        const message = `Sent ${remindedCount} gift reminders, skipped ${skippedCount}, failed ${failedCount} in ${endDate.valueOf() - startDate.valueOf()}ms`;

        debug(message);

        if (parentPort) {
            parentPort.postMessage(message);
            parentPort.postMessage('done');
        } else {
            setTimeout(() => {
                process.exit(0);
            }, 1000);
        }
    } catch (error) {
        if (parentPort) {
            parentPort.postMessage('done');
        }

        throw error;
    }
})();
