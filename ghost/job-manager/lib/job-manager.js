const path = require('path');
const util = require('util');
const setTimeoutPromise = util.promisify(setTimeout);
const fastq = require('fastq');
const later = require('@breejs/later');
const Bree = require('bree');
const pWaitFor = require('p-wait-for');
const {UnhandledJobError, IncorrectUsageError} = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const isCronExpression = require('./is-cron-expression');
const assembleBreeJob = require('./assemble-bree-job');
const JobsRepository = require('./jobs-repository');

const worker = async (task, callback) => {
    try {
        let result = await task();
        await callback(null, result);
    } catch (error) {
        await callback(error);
    }
};

const ALL_STATUSES = {
    started: 'started',
    finished: 'finished',
    failed: 'failed',
    queued: 'queued'
};

class JobManager {
    /**
     * @param {Object} options
     * @param {Function} [options.errorHandler] - custom job error handler
     * @param {Function} [options.workerMessageHandler] - custom message handler coming from workers
     * @param {Object} [options.JobModel] - a model which can persist job data in the storage
     */
    constructor({errorHandler, workerMessageHandler, JobModel}) {
        this.queue = fastq(this, worker, 1);
        this._jobMessageHandler = this._jobMessageHandler.bind(this);
        this._jobErrorHandler = this._jobErrorHandler.bind(this);

        const combinedMessageHandler = workerMessageHandler
            ? ({name, message}) => {
                workerMessageHandler({name, message});
                this._jobMessageHandler({name, message});
            }
            : this._jobMessageHandler;

        const combinedErrorHandler = errorHandler
            ? (error, workerMeta) => {
                errorHandler(error, workerMeta);
                this._jobErrorHandler(error, workerMeta);
            }
            : this._jobErrorHandler;

        this.bree = new Bree({
            root: false, // set this to `false` to prevent requiring a root directory of jobs
            hasSeconds: true, // precision is needed to avoid task overlaps after immediate execution
            outputWorkerMetadata: true,
            logger: logging,
            errorHandler: combinedErrorHandler,
            workerMessageHandler: combinedMessageHandler
        });

        this.bree.on('worker created', (name) => {
            this._jobMessageHandler({name, message: ALL_STATUSES.started});
        });

        if (JobModel) {
            this._jobsRepository = new JobsRepository({JobModel});
        }
    }

    inlineJobHandler(jobName) {
        return async (error, result) => {
            if (error) {
                await this._jobErrorHandler(error, {
                    name: jobName
                });
            } else {
                await this._jobMessageHandler({
                    name: jobName,
                    message: 'done'
                });
            }

            // Can potentially standardize the result here
            return result;
        };
    }

    async _jobMessageHandler({name, message}) {
        if (this._jobsRepository && name) {
            if (message === ALL_STATUSES.started) {
                const job = await this._jobsRepository.read(name);

                if (job) {
                    await this._jobsRepository.update(job.id, {
                        status: ALL_STATUSES.started,
                        started_at: new Date()
                    });
                }
            } else if (message === 'done') {
                const job = await this._jobsRepository.read(name);

                if (job) {
                    await this._jobsRepository.update(job.id, {
                        status: ALL_STATUSES.finished,
                        finished_at: new Date()
                    });
                }
            }
        }
    }

    async _jobErrorHandler(error, jobMeta) {
        if (this._jobsRepository && jobMeta.name) {
            const job = await this._jobsRepository.read(jobMeta.name);

            if (job) {
                await this._jobsRepository.update(job.id, {
                    status: ALL_STATUSES.failed
                });
            }
        }
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
            logging.info('Adding offloaded job to the queue');
            let schedule;

            if (!name) {
                if (typeof job === 'string') {
                    name = path.parse(job).name;
                } else {
                    throw new IncorrectUsageError({
                        message: 'Name parameter should be present if job is a function'
                    });
                }
            }

            if (at && !(at instanceof Date)) {
                if (isCronExpression(at)) {
                    schedule = later.parse.cron(at, true);
                } else {
                    schedule = later.parse.text(at);
                }

                if ((schedule.error && schedule.error !== -1) || schedule.schedules.length === 0) {
                    throw new IncorrectUsageError({
                        message: 'Invalid schedule format'
                    });
                }

                logging.info(`Scheduling job ${name} at ${at}. Next run on: ${later.schedule(schedule).next()}`);
            } else if (at !== undefined) {
                logging.info(`Scheduling job ${name} at ${at}`);
            } else {
                logging.info(`Scheduling job ${name} to run immediately`);
            }

            const breeJob = assembleBreeJob(at, job, data, name);
            this.bree.add(breeJob);
            return this.bree.start(name);
        } else {
            logging.info('Adding one off inline job to the queue');

            this.queue.push(async () => {
                try {
                    // NOTE: setting the status here otherwise it is impossible to
                    //       distinguish between states when the job fails immediately
                    await this._jobMessageHandler({
                        name: name,
                        message: ALL_STATUSES.started
                    });

                    if (typeof job === 'function') {
                        await job(data);
                    } else {
                        await require(job)(data);
                    }
                } catch (err) {
                    // NOTE: each job should be written in a safe way and handle all errors internally
                    //       if the error is caught here jobs implementation should be changed
                    logging.error(new UnhandledJobError({
                        context: (typeof job === 'function') ? 'function' : job,
                        err
                    }));

                    throw err;
                }
            }, this.inlineJobHandler(name));
        }
    }

    /**
    * Adds a job that could ever be executed once. In case the job fails
    * can be "added" again, effectively restarting the failed job.
    *
    * @param {Object} GhostJob - job options
    * @prop {Function | String} GhostJob.job - function or path to a module defining a job
    * @prop {String} GhostJob.name - unique job name, if not provided takes function name or job script filename
    * @prop {String | Date} [GhostJob.at] - Date, cron or human readable schedule format. Manage will do immediate execution if not specified. Not supported for "inline" jobs
    * @prop {Object} [GhostJob.data] - data to be passed into the job
    * @prop {Boolean} [GhostJob.offloaded] - creates an "offloaded" job running in a worker thread by default. If set to "false" runs an "inline" job on the same event loop
    */
    async addOneOffJob({name, job, data, offloaded = true}) {
        if (!name) {
            throw new IncorrectUsageError({
                message: `The name parameter is required for a one off job.`
            });
        }

        const persistedJob = await this._jobsRepository.read(name);

        if (persistedJob && (persistedJob.get('status') !== ALL_STATUSES.failed)) {
            throw new IncorrectUsageError({
                message: `A "${name}" one off job has already been executed.`
            });
        }

        if (persistedJob && (persistedJob.get('status') === ALL_STATUSES.failed)) {
            await this._jobsRepository.update(persistedJob.id, {
                status: ALL_STATUSES.queued
            });
        } else {
            await this._jobsRepository.add({
                name,
                status: ALL_STATUSES.queued
            });
        }

        // NOTE: there's a assumption the job with the same name failed while
        //       running under different instance of job manager (bree).
        //       For example, it failed and the process was restarted.
        //       If we want to be able to restart within the same instance,
        //       we'd need to handle job restart/removal in Bree first
        this.addJob({name, job, data, offloaded});
    }

    /**
     * Checks if the one-off job has ever been executed successfully.
     * @param {String} name one-off job name
     */
    async hasExecutedSuccessfully(name) {
        if (this._jobsRepository) {
            const persistedJob = await this._jobsRepository.read(name);

            if (!persistedJob) {
                return false;
            } else {
                return (persistedJob.get('status') !== ALL_STATUSES.failed);
            }
        } else {
            return false;
        }
    }

    /**
     * Awaits completion of the offloaded job.
     * CAUTION: it might take a long time to resolve!
     * @param {String} name one-off job name
     * @returns resolves with a Job model at current state
     */
    async awaitCompletion(name) {
        const persistedJob = await this._jobsRepository.read({
            name
        });

        if (!persistedJob || ![ALL_STATUSES.finished, ALL_STATUSES.failed].includes(persistedJob.get('status'))) {
            // NOTE: can implement exponential backoff here if that's ever needed
            await setTimeoutPromise(500);

            return this.awaitCompletion(name);
        }

        return persistedJob;
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

        logging.warn('Waiting for busy job queue');

        await pWaitFor(() => this.queue.idle() === true, options);

        logging.warn('Job queue finished');
    }
}

module.exports = JobManager;
