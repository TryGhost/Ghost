const isCronExpression = require('./is-cron-expression');

/** @typedef {import('bree').JobOptions} JobOptions */

/**
 * Creates job Object compatible with bree job definition (https://github.com/breejs/bree#job-options)
 *
 * @param {()=>void|String} job - function or path to a module defining a job
 * @param {String | Date} [at] - Date, cron or human readable schedule format
 * @param {Object} [data] - data to be passed into the job
 * @param {String} [name] - job name
 * @returns {JobOptions} bree job definition
 */
const assemble = (job, at, data, name) => {
    const breeJob = {
        name: name,
        // NOTE: both function and path syntaxes work with 'path' parameter
        path: job
    };

    if (data) {
        Object.assign(breeJob, {
            worker: {
                workerData: data
            }
        });
    }

    if (at instanceof Date) {
        Object.assign(breeJob, {
            date: at
        });
    } else if (at && isCronExpression(at)) {
        Object.assign(breeJob, {
            cron: at
        });
    } else if (at !== undefined) {
        Object.assign(breeJob, {
            interval: at
        });
    }

    return breeJob;
};

module.exports = assemble;
