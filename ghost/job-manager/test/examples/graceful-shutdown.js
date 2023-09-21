/* eslint-disable no-console */

const pWaitFor = require('p-wait-for');
const path = require('path');
const setTimeoutPromise = require('util').promisify(setTimeout);
const JobManager = require('../../lib/job-manager');

const jobManager = new JobManager({
    info: console.log,
    warn: console.log,
    error: console.log
});

process.on('SIGINT', () => {
    shutdown('SIGINT');
});

async function shutdown(signal) {
    console.log(`shutting down via: ${signal}`);

    await jobManager.shutdown();
}

(async () => {
    await jobManager.addJob({
        at: 'every 10 seconds',
        job: path.resolve(__dirname, '../jobs/graceful.js')
    });

    await setTimeoutPromise(100); // allow job to get scheduled

    await pWaitFor(() => jobManager.bree.workers.size === 0 && jobManager.bree.intervals.size === 0);

    process.exit(0);
})();
