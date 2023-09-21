/**
 * Minimal wrapper around our external lib
 * Intended for passing any Ghost internals such as logging and config
 */

const JobManager = require('@tryghost/job-manager');
const logging = require('@tryghost/logging');
const models = require('../../models');
const sentry = require('../../../shared/sentry');
const domainEvents = require('@tryghost/domain-events');

const errorHandler = (error, workerMeta) => {
    logging.info(`Capturing error for worker during execution of job: ${workerMeta.name}`);
    logging.error(error);
    sentry.captureException(error);
};

const workerMessageHandler = ({name, message}) => {
    if (typeof message === 'string') {
        logging.info(`Worker for job ${name} sent a message: ${message}`);
    }
};

const initTestMode = () => {
    // Output job queue length every 5 seconds
    setInterval(() => {
        logging.warn(`${jobManager.queue.length()} jobs in the queue. Idle: ${jobManager.queue.idle()}`);

        const runningScheduledjobs = jobManager.bree.workers.keys();
        if (jobManager.bree.workers.size) {
            logging.warn(`${jobManager.bree.workers.size} jobs running: ${[...runningScheduledjobs]}`);
        }

        const scheduledJobs = jobManager.bree.intervals.keys();
        if (jobManager.bree.intervals.size) {
            logging.warn(`${jobManager.bree.intervals.size} scheduled jobs: ${[...scheduledJobs]}`);
        }

        if (jobManager.bree.workers.size === 0 && jobManager.bree.intervals.size === 0) {
            logging.warn('No scheduled or running jobs');
        }
    }, 5000);
};

const jobManager = new JobManager({errorHandler, workerMessageHandler, JobModel: models.Job, domainEvents});

module.exports = jobManager;
module.exports.initTestMode = initTestMode;
