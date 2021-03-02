const {parentPort} = require('bthreads');

setInterval(() => { }, 10);

if (parentPort) {
    parentPort.on('message', (message) => {
        if (message === 'error') {
            throw new Error('oops');
        }

        if (message === 'cancel') {
            parentPort.postMessage('cancelled');
            return;
        }

        // post the message back
        parentPort.postMessage(`Worker received: ${message}`);
        process.exit(0);
    });
}
