const GhostErrors = require('@tryghost/errors');

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
    try {
        const jobModule = require(jobPath);
        if (typeof jobModule !== 'function') {
            throw new GhostErrors.IncorrectUsageError(`Job module at ${jobPath} does not export a function`);
        }
        return jobModule(jobData);
    } catch (error) {
        throw new GhostErrors.IncorrectUsageError(`Failed to execute job: ${error.message}`);
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