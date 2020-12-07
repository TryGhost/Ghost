/**
 * Minimal wrapper around our external lib
 * Intended for passing any Ghost internals such as logging and config
 */

const JobManager = require('@tryghost/job-manager');
const logging = require('../../../shared/logging');
const sentry = require('../../../shared/sentry');

const errorHandler = (error, workerMeta) => {
    logging.info(`Capturing error for worker during execution of job: ${workerMeta.name}`);
    logging.error(error);
    sentry.captureException(error);
};
const jobManager = new JobManager({logging, errorHandler});

module.exports = jobManager;
