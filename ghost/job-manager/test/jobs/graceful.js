/* eslint-disable no-console */

const setTimeoutPromise = require('util').promisify(setTimeout);
const threads = require('bthreads');

let shutdown = false;

if (!threads.isMainThread) {
    threads.parentPort.on('message', (message) => {
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

            process.exit(0);
        }
    }
})();
