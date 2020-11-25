/* eslint-disable no-console */

const setTimeoutPromise = require('util').promisify(setTimeout);
const {isMainThread, parentPort} = require('bthreads');

let shutdown = false;

if (!isMainThread) {
    parentPort.on('message', (message) => {
        console.log(`paret message received: ${message}`);
        if (message === 'cancel') {
            shutdown = true;
        }
    });
}

(async () => {
    console.log('started graceful job');

    for (;;) {
        await setTimeoutPromise(1000);
        console.log('worked for 1000 ms');

        if (shutdown) {
            console.log('exiting gracefully');

            await setTimeoutPromise(100); // async cleanup imitation

            if (parentPort) {
                // preferred method of shutting down the worker
                // it signals job manager about finished job and the thread
                // is later terminated through `terminate()` method allowing
                // for unfinished pipes to flush (e.g. loggers)
                parentPort.postMessage('done');
            } else {
                process.exit(0);
            }
        }
    }
})();
