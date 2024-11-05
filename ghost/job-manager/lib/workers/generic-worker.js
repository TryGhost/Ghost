const errors = require('@tryghost/errors');

/**
 * @module generic-worker
 * @description A generic worker module for executing jobs in a worker pool. This allows consuming code to pass in a job file
 *   when calling for the worker pool to execute a job.
 */

const workerpool = require('workerpool');

/**
 * @function executeJob
 * @description Executes a job by requiring the job module and calling it with the provided data.
 * @param {string} jobPath - The absolute file path to the job module.
 * @param {Object} jobData - The data to be passed to the job function as the first argument.
 * @returns {Promise<*>} The result of the job execution.
 * @throws {Error} If the job module doesn't export a function or if the execution fails.
 */
function executeJob(jobPath, jobData) {
    let jobModule;
    try {
        jobModule = require(jobPath);
    } catch (err) {
        throw new errors.IncorrectUsageError({
            message: `Failed to load job module: ${err.message}`,
            err
        });
    }

    if (typeof jobModule !== 'function') {
        throw new errors.IncorrectUsageError({
            message: `Job module at ${jobPath} does not export a function`
        });
    }

    try {
        return jobModule(jobData);
    } catch (err) {
        throw new errors.IncorrectUsageError({
            message: `Failed to execute job: ${err.message}`,
            err
        });
    }
}

/**
 * @function registerWorker
 * @description Registers the executeJob function as a worker method with workerpool.
 */
function registerWorker() {
    workerpool.worker({
        executeJob: executeJob
    });
}

// Only register the worker if this file is being run directly
if (require.main === module) {
    registerWorker();
}

module.exports = {
    executeJob,
    registerWorker
};