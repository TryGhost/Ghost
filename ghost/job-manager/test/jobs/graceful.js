/* eslint-disable no-console */

const setTimeoutPromise = require('util').promisify(setTimeout);
const {isMainThread, parentPort} = require('worker_threads');

let shutdown = false;

if (!isMainThread) {
    parentPort.on('message', (message) => {
        console.log(`parent message received: ${message}`);

        // 'cancel' event is triggered when job has to to terminated before it finishes execution
        // usually it would come in when SIGINT signal is sent to a parent process
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
                // `done' is a preferred method of shutting down the worker
                // it signals job manager about finished job and the thread
                // is later terminated through `terminate()` method allowing
                // for unfinished pipes to flush (e.g. loggers)
                //
                // 'cancelled' is an allternative method to signal job was terminated
                // because of parent initiated reason (e.g.: parent process interuption)
                // differs from 'done' by producing different
                // logging - shows the job was cancelled instead of completing
                parentPort.postMessage('done');
                // parentPort.postMessage('cancelled');
            } else {
                process.exit(0);
            }
        }
    }
})();
