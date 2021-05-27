const {parentPort} = require('bthreads');

// Exit early when cancelled to prevent stalling shutdown. No cleanup needed when cancelling as everything is idempotent and will pick up
// where it left off on next run
function cancel() {
    parentPort.postMessage('Update check job cancelled before completion');

    if (parentPort) {
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
    const updateCheck = require('./update-check');

    const logging = {
        info(message) {
            parentPort.postMessage(message);
        },
        warn(message) {
            parentPort.postMessage(message);
        },
        error(message) {
            parentPort.postMessage(message);
        }
    };

    // INIT required services
    const models = require('./models');
    models.init();

    const permissions = require('./services/permissions');
    await permissions.init();

    const settings = require('./services/settings');
    await settings.init();

    const i18n = require('../shared/i18n');
    i18n.init();
    // Finished INIT

    await updateCheck({logging});

    parentPort.postMessage(`Ran update check`);

    if (parentPort) {
        parentPort.postMessage('done');
    } else {
        // give the logging pipes time finish writing before exit
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    }
})();
