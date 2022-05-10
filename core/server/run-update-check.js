const {parentPort} = require('bthreads');

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
    const updateCheck = require('./update-check');

    // INIT required services
    const models = require('./models');
    models.init();

    const permissions = require('./services/permissions');
    await permissions.init();

    const settings = require('./services/settings/settings-service');
    await settings.init();
    // Finished INIT

    await updateCheck();

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
