const fastq = require('fastq');
const later = require('@breejs/later');
const pWaitFor = require('p-wait-for');
const errors = require('@tryghost/errors');
const isCronExpression = require('./is-cron-expression');

const worker = async (task, callback) => {
    try {
        let result = await task();
        callback(null, result);
    } catch (error) {
        callback(error);
    }
};

const handler = (error, result) => {
    if (error) {
        // TODO: this handler should not be throwing as this blocks the queue
        // throw error;
    }
    // Can potentially standardise the result here
    return result;
};

class JobManager {
    constructor(logging) {
        this.queue = fastq(this, worker, 1);
        this.schedule = [];
        this.logging = logging;
    }

    /**
     * Adds job to queue
     *
     * @param {Function|String} job - function or path to a module defining a job
     * @param {Object} [data] - data to be passed into the job
     */
    addJob(job, data) {
        this.logging.info('Adding one off job to the queue');

        this.queue.push(async () => {
            try {
                if (typeof job === 'function') {
                    await job(data);
                } else {
                    await require(job)(data);
                }
            } catch (err) {
                // NOTE: each job should be written in a safe way and handle all errors internally
                //       if the error is caught here jobs implementaton should be changed
                this.logging.error(new errors.IgnitionError({
                    level: 'critical',
                    errorType: 'UnhandledJobError',
                    message: 'Processed job threw an unhandled error',
                    context: (typeof job === 'function') ? 'function' : job,
                    err
                }));

                throw err;
            }
        }, handler);
    }

    /**
     * Schedules recuring job
     *
     * @param {String} when - cron or human readable schedule format
     * @param {Function|String} job - function or path to a module defining a job
     * @param {Object} [data] - data to be passed into the job
     */
    scheduleJob(when, job, data) {
        let schedule;

        schedule = later.parse.text(when);

        if (isCronExpression(when)) {
            schedule = later.parse.cron(when);
        }

        if ((schedule.error && schedule.error !== -1) || schedule.schedules.length === 0) {
            throw new Error('Invalid schedule format');
        }

        this.logging.info(`Scheduling job. Next run on: ${later.schedule(schedule).next()}`);

        const cancelInterval = later.setInterval(() => {
            this.logging.info(`Scheduled job added to the queue.`);
            this.addJob(job, data);
        }, schedule);

        this.schedule.push(cancelInterval);
    }

    /**
     * @param {import('p-wait-for').Options} [options]
     */
    async shutdown(options) {
        this.schedule.forEach((cancelHandle) => {
            cancelHandle.clear();
        });

        if (this.queue.idle()) {
            return;
        }

        this.logging.warn('Waiting for busy job queue');

        await pWaitFor(() => this.queue.idle() === true, options);

        this.logging.warn('Job queue finished');
    }
}

module.exports = JobManager;
