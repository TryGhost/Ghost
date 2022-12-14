const path = require('path');
const pWaitFor = require('p-wait-for');
const addSeconds = require('date-fns/addSeconds');
const JobManager = require('../../lib/job-manager');

const jobManager = new JobManager(console);

const isJobQueueEmpty = (bree) => {
    return (Object.keys(bree.workers).length === 0)
        && (Object.keys(bree.intervals).length === 0)
        && (Object.keys(bree.timeouts).length === 0);
};

(async () => {
    const dateInTenSeconds = addSeconds(new Date(), 10);

    jobManager.addJob({
        at: dateInTenSeconds,
        job: path.resolve(__dirname, '../jobs/timed-job.js'),
        data: {
            ms: 2000
        },
        name: 'one-off-scheduled-job'
    });

    await pWaitFor(() => (isJobQueueEmpty(jobManager.bree)));

    process.exit(0);
})();
