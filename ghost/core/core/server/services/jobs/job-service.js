/**
 * Minimal wrapper around our external lib
 * Intended for passing any Ghost internals such as logging and config
 */

const JobManager = require('@tryghost/job-manager');
const logging = require('@tryghost/logging');
const models = require('../../models');
const sentry = require('../../../shared/sentry');
const domainEvents = require('@tryghost/domain-events');
const config = require('../../../shared/config');
const WorkerModelEventBridge = require('./worker-model-event-bridge');
const errorHandler = (error, workerMeta) => {
    logging.info(`Capturing error for worker during execution of job: ${workerMeta.name}`);
    logging.error(error);
    sentry.captureException(error);
};
const events = require('../../lib/common/events');
const workerModelEventBridge = new WorkerModelEventBridge({models, events, logging, sentry});

const workerMessageHandler = ({name, message}) => {
    if (workerModelEventBridge.isModelEventMessage(message)) {
        // Carries its own `eventName` rather than job-manager's reserved `event` key,
        // so it routes through the bridge instead of being dispatched as a raw domain event.
        workerModelEventBridge.handle(message, {jobName: name});
        return;
    }

    if (typeof message === 'string') {
        logging.info(`Worker for job ${name} sent a message: ${message}`);
    }
};

const initTestMode = () => {
    // Output job queue length every 5 seconds
    setInterval(() => {
        logging.warn(`${jobManager.inlineQueue.length()} jobs in the queue. Idle: ${jobManager.inlineQueue.idle()}`);

        const runningScheduledjobs = Object.keys(jobManager.bree.workers);
        if (Object.keys(jobManager.bree.workers).length) {
            logging.warn(`${Object.keys(jobManager.bree.workers).length} jobs running: ${runningScheduledjobs}`);
        }

        const scheduledJobs = Object.keys(jobManager.bree.intervals);
        if (Object.keys(jobManager.bree.intervals).length) {
            logging.warn(`${Object.keys(jobManager.bree.intervals).length} scheduled jobs: ${scheduledJobs}`);
        }

        if (runningScheduledjobs.length === 0 && scheduledJobs.length === 0) {
            logging.warn('No scheduled or running jobs');
        }
    }, 5000);
};

const jobManager = new JobManager({errorHandler, workerMessageHandler, JobModel: models.Job, domainEvents, config, events});

// Quiet the noisy per-job INFO chatter emitted from inside @tryghost/job-manager
// (one "Adding offloaded job to the inline job queue" + one "Scheduling job X at Y..."
// per registered job). Replace it with a single summary line at boot.
//
// We can't pass a custom logger to the external package (it imports the
// @tryghost/logging singleton directly), so we briefly swap the singleton's
// methods around each addJob() call and tally counts.
const jobStats = {offloaded: 0, inline: 0, scheduled: 0};
let summaryScheduled = false;

const QUIETED_PREFIXES = [
    'Adding offloaded job to the inline job queue',
    'Scheduling job '
];

const scheduleSummary = () => {
    if (summaryScheduled) {
        return;
    }
    summaryScheduled = true;
    setImmediate(() => {
        summaryScheduled = false;
        const total = jobStats.offloaded + jobStats.inline;
        if (total === 0) {
            return;
        }
        logging.info(
            `[Jobs] Registered ${total} jobs (${jobStats.scheduled} scheduled, ${jobStats.inline} inline)`
        );
        jobStats.offloaded = 0;
        jobStats.inline = 0;
        jobStats.scheduled = 0;
    });
};

const withQuietedJobLogging = (fn, jobOptions) => {
    const originalInfo = logging.info;
    logging.info = function (...args) {
        const first = args[0];
        if (typeof first === 'string' && QUIETED_PREFIXES.some(prefix => first.startsWith(prefix))) {
            return undefined;
        }
        return originalInfo.apply(this, args);
    };
    try {
        return fn();
    } finally {
        logging.info = originalInfo;
        if (jobOptions.offloaded === false) {
            jobStats.inline += 1;
        } else {
            jobStats.offloaded += 1;
            if (jobOptions.at) {
                jobStats.scheduled += 1;
            }
        }
        scheduleSummary();
    }
};

// We only wrap addJob — addOneOffJob() inside @tryghost/job-manager calls
// this.addJob() internally, which now resolves to the wrapped version, so it's
// covered transitively without double-counting.
const originalAddJob = jobManager.addJob.bind(jobManager);
jobManager.addJob = function (jobOptions = {}) {
    return withQuietedJobLogging(() => originalAddJob(jobOptions), jobOptions);
};

module.exports = jobManager;
module.exports.initTestMode = initTestMode;
