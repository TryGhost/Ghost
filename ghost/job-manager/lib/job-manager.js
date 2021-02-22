const path = require('path');
const fastq = require('fastq');
const later = require('@breejs/later');
const Bree = require('bree');
const pWaitFor = require('p-wait-for');
const errors = require('@tryghost/errors');
const isCronExpression = require('./is-cron-expression');
const assembleBreeJob = require('./assemble-bree-job');

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
    /**
     * @param {Object} options
     * @param {Object} [options.logging] - custom logging handler, defaults to console
     * @param {Function} [options.errorHandler] - custom job error handler
     * @param {Function} [options.workerMessageHandler] - custom message handler coming from workers
     */
    constructor({logging, errorHandler, workerMessageHandler}) {
        this.queue = fastq(this, worker, 1);

        this.bree = new Bree({
            root: false, // set this to `false` to prevent requiring a root directory of jobs
            hasSeconds: true, // precision is needed to avoid task overlaps after immediate execution
            outputWorkerMetadata: true,
            logger: logging,
            errorHandler: errorHandler,
            workerMessageHandler: workerMessageHandler
        });

        this.logging = logging;
    }

    /**
     * By default schedules an "offloaded" job. If `offloaded: true` parameter is set,
     * puts an "inline" immediate job into the queue.
     *
     * @param {Object} GhostJob - job options
     * @prop {Function | String} GhostJob.job - function or path to a module defining a job
     * @prop {String} [GhostJob.name] - unique job name, if not provided takes function name or job script filename
     * @prop {String | Date} [GhostJob.at] - Date, cron or human readable schedule format. Manage will do immediate execution if not specified. Not supported for "inline" jobs
     * @prop {Object} [GhostJob.data] - data to be passed into the job
     * @prop {Boolean} [GhostJob.offloaded] - creates an "offloaded" job running in a worker thread by default. If set to "false" runs an "inline" job on the same event loop
     */
    addJob({name, at, job, data, offloaded = true}) {
        if (offloaded) {
            this.logging.info('Adding offloaded job to the queue');
            let schedule;

            if (!name) {
                if (typeof job === 'string') {
                    name = path.parse(job).name;
                } else {
                    throw new Error('Name parameter should be present if job is a function');
                }
            }

            if (at && !(at instanceof Date)) {
                if (isCronExpression(at)) {
                    schedule = later.parse.cron(at, true);
                } else {
                    schedule = later.parse.text(at);
                }

                if ((schedule.error && schedule.error !== -1) || schedule.schedules.length === 0) {
                    throw new Error('Invalid schedule format');
                }

                this.logging.info(`Scheduling job ${name} at ${at}. Next run on: ${later.schedule(schedule).next()}`);
            } else if (at !== undefined) {
                this.logging.info(`Scheduling job ${name} at ${at}`);
            } else {
                this.logging.info(`Scheduling job ${name} to run immediately`);
            }

            const breeJob = assembleBreeJob(at, job, data, name);
            this.bree.add(breeJob);
            return this.bree.start(name);
        } else {
            this.logging.info('Adding one off inline job to the queue');

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
    }

    /**
     * Removes an "offloaded" job from scheduled jobs queue.
     * It's NOT yet possible to remove "inline" jobs (will be possible when scheduling is added https://github.com/breejs/bree/issues/68).
     * The method will throw an Error if job with provided name does not exist.
     *
     * NOTE: current implementation does not guarante running job termination
     *       for details see https://github.com/breejs/bree/pull/64
     *
     * @param {String} name - job name
     */
    async removeJob(name) {
        await this.bree.remove(name);
    }

    /**
     * @param {import('p-wait-for').Options} [options]
     */
    async shutdown(options) {
        await this.bree.stop();

        if (this.queue.idle()) {
            return;
        }

        this.logging.warn('Waiting for busy job queue');

        await pWaitFor(() => this.queue.idle() === true, options);

        this.logging.warn('Job queue finished');
    }
}

module.exports = JobManager;
