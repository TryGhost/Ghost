/**
 * Minimal wrapper around our external lib
 * Intended for passing any Ghost internals such as logging and config
 */

const JobManager = require('@tryghost/job-manager');
const logging = require('@tryghost/logging');
const sentry = require('../../../shared/sentry');

const errorHandler = (error, workerMeta) => {
    logging.info(`Capturing error for worker during execution of job: ${workerMeta.name}`);
    logging.error(error);
    sentry.captureException(error);
};

const workerMessageHandler = ({name, message}) => {
    logging.info(`Worker for job ${name} sent a message: ${message}`);
};

const jobManager = new JobManager({logging, errorHandler, workerMessageHandler});

module.exports = jobManager;
