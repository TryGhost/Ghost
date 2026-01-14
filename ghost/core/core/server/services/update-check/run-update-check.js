const {parentPort, workerData} = require('worker_threads');

const postParentPortMessage = (message) => {
    if (parentPort) {
        parentPort.postMessage(message);
    }
};

// Exit early when cancelled to prevent stalling shutdown. No cleanup needed when cancelling as everything is idempotent and will pick up
// where it left off on next run
function cancel() {
    postParentPortMessage('Update check job cancelled before completion');

    if (parentPort) {
        postParentPortMessage('cancelled');
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
    const updateCheck = require('./');

    // INIT required services
    const models = require('../../models');
    models.init();

    const permissions = require('../permissions');
    await permissions.init();

    const settings = require('../settings/settings-service');
    await settings.init();

    const tiers = require('../tiers');
    await tiers.init();
    // Finished INIT

    await updateCheck({
        rethrowErrors: true,
        forceUpdate: workerData.forceUpdate,
        updateCheckUrl: workerData.updateCheckUrl
    });

    postParentPortMessage(`Ran update check`);

    if (parentPort) {
        postParentPortMessage('done');
    } else {
        // give the logging pipes time finish writing before exit
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    }
})();
