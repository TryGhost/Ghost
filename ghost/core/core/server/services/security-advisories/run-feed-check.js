const {parentPort, workerData} = require('worker_threads');

const postParentPortMessage = (message) => {
    if (parentPort) {
        parentPort.postMessage(message);
    }
};

function cancel() {
    postParentPortMessage('Security advisory feed check cancelled before completion');

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
    const securityAdvisories = require('./');

    const permissions = require('../permissions');
    await permissions.init();

    const settings = require('../settings/settings-service');
    await settings.init();

    await securityAdvisories({
        endpoint: workerData && workerData.endpoint
    });

    postParentPortMessage('Ran security advisory feed check');

    if (parentPort) {
        postParentPortMessage('done');
    } else {
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    }
})();
