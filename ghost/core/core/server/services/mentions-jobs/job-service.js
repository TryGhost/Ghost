/**
 * Minimal wrapper around our external lib
 * Intended for passing any Ghost internals such as logging and config
 */

const JobManager = require('@tryghost/job-manager');
const logging = require('@tryghost/logging');
const jobLogging = require('../jobs/job-logging');
const models = require('../../models');
const sentry = require('../../../shared/sentry');
const domainEvents = require('@tryghost/domain-events');

const errorHandler = (error, workerMeta) => {
    jobLogging.error(error, `[Background Job] ${workerMeta.name} failed`);
    sentry.captureException(error);
};

const workerMessageHandler = ({name, message}) => {
    if (typeof message === 'string' && !['done', 'cancelled'].includes(message)) {
        jobLogging.info(`[Background Job] ${name}: ${message}`);
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

const jobManager = new JobManager({errorHandler, workerMessageHandler, JobModel: models.Job, domainEvents, isDuplicate: true});

module.exports = jobManager;
module.exports.initTestMode = initTestMode;
