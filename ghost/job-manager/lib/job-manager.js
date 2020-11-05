const fastq = require('fastq');
const later = require('@breejs/later');
const pWaitFor = require('p-wait-for');
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
        throw error;
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
     * @param {Function} job - function to be executed in the queue
     * @param {Object} [data] - data to be passed into the job
     */
    addJob(job, data) {
        this.logging.info('Adding one off job to the queue');

        this.queue.push(async () => {
            await job(data);
        }, handler);
    }

    /**
     * Schedules recuring job
     *
     * @param {Function|String} job - function or path to a file defining a job
     * @param {Object} data - data to be passed into the joba
     * @param {String} when - cron or human readable schedule format
     */
    scheduleJob(job, data, when) {
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
