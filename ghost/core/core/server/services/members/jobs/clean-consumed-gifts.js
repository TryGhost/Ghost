const {parentPort} = require('node:worker_threads');
const debug = require('@tryghost/debug')('jobs:clean-consumed-gifts');

// recurring job to clean consumed gift subscriptions

// Exit early when cancelled to prevent stalling shutdown. No cleanup needed
// when cancelling as everything is idempotent and will pick up where it left
// off on next run
function cancel() {
    if (parentPort) {
        parentPort.postMessage('Consumed gift subscriptions cleanup cancelled before completion');
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
        const cleanupStartDate = new Date();
        debug('Starting cleanup of consumed gift subscriptions');

        const giftService = require('../../gifts');
        await giftService.init();

        const {consumedCount, updatedMemberCount} = await giftService.service.processConsumed();
        const cleanupEndDate = new Date();
        const message = `Consumed ${consumedCount} gifts, updated ${updatedMemberCount} members in ${cleanupEndDate.valueOf() - cleanupStartDate.valueOf()}ms`;

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
