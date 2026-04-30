const {parentPort} = require('node:worker_threads');
const debug = require('@tryghost/debug')('jobs:clean-gifts');

// recurring job to clean consumed and expired gifts

// Exit early when cancelled to prevent stalling shutdown. No cleanup needed
// when cancelling as everything is idempotent and will pick up where it left
// off on next run
function cancel() {
    if (parentPort) {
        parentPort.postMessage('Gift cleanup cancelled before completion');
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
        debug('Starting gift cleanup');

        /**
         * Explicitly initialize services required to run the job - We need to
         * do this manually because the job is run in a worker thread and not
         * in the main process
         */
        const settings = require('../../settings/settings-service');
        await settings.init();

        const stripeService = require('../../stripe');
        await stripeService.init();

        const membersService = require('../../members');
        await membersService.init();

        const giftService = require('../../gifts');
        await giftService.init();

        const {consumedCount, updatedMemberCount} = await giftService.service.processConsumed();
        const {expiredCount} = await giftService.service.processExpired();

        const cleanupEndDate = new Date();
        const message = `Consumed ${consumedCount} gifts, updated ${updatedMemberCount} members, expired ${expiredCount} gifts in ${cleanupEndDate.valueOf() - cleanupStartDate.valueOf()}ms`;

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
