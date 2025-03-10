const path = require('path');
const util = require('util');
const setTimeoutPromise = util.promisify(setTimeout);
const fastq = require('fastq');
const later = require('@breejs/later');
const Bree = require('bree');
const pWaitFor = require('p-wait-for');
const {UnhandledJobError, IncorrectUsageError} = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const metrics = require('@tryghost/metrics');
const isCronExpression = require('./is-cron-expression');
const assembleBreeJob = require('./assemble-bree-job');
const JobsRepository = require('./JobsRepository');
const JobQueueManager = require('./JobQueueManager');

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

/**
 * @typedef {Object} ScheduledJob
 * @property {Function | string} job - Function or path to a module defining a job
 * @property {string} [name] - Unique job name, if not provided takes function name or job script filename
 * @property {string | Date} [at] - Date, cron or human readable schedule format
 * @property {Object} [data] - Data to be passed into the job
 * @property {boolean} [offloaded=true] - If true, creates an "offloaded" job running in a worker thread. If false, runs an "inline" job on the same event loop
 */
class JobManager {
    #domainEvents;
    #completionPromises = new Map();
    #jobQueueManager = null;
    #config;
    #JobModel;
    #events;

    /**
     * @param {Object} options
     * @param {Function} [options.errorHandler] - custom job error handler
     * @param {Function} [options.workerMessageHandler] - custom message handler coming from workers
     * @param {Object} [options.JobModel] - a model which can persist job data in the storage
     * @param {Object} [options.domainEvents] - domain events emitter
     * @param {Object} [options.config] - config
     * @param {boolean} [options.isDuplicate] - if true, the job manager will not initialize the job queue
     * @param {JobQueueManager} [options.jobQueueManager] - job queue manager instance (for testing)
     * @param {Object} [options.events] - events instance (for testing)
     */
    constructor({errorHandler, workerMessageHandler, JobModel, domainEvents, config, isDuplicate = false, jobQueueManager = null, events = null}) {
        this.inlineQueue = fastq(this, worker, 3);
        this._jobMessageHandler = this._jobMessageHandler.bind(this);
        this._jobErrorHandler = this._jobErrorHandler.bind(this);
        this.#domainEvents = domainEvents;
        this.#config = config;
        this.#JobModel = JobModel;
        this.#events = events;

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

        if (jobQueueManager) {
            this.#jobQueueManager = jobQueueManager;
        } else if (!isDuplicate) {
            this.#initializeJobQueueManager();
        }
    }

    #initializeJobQueueManager() {
        if (this.#config?.get('services:jobs:queue:enabled') === true && !this.#jobQueueManager) {
            this.#jobQueueManager = new JobQueueManager({JobModel: this.#JobModel, config: this.#config, eventEmitter: this.#events, metricLogger: metrics});
            this.#jobQueueManager.init();
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

    /**
     * @typedef {Object} QueuedJob
     * @property {string} name - The name or identifier of the job.
     * @property {Object} metadata - Metadata associated with the job.
     * @property {string} metadata.job - The absolute path to the job to execute.
     * @property {string} metadata.name - The name of the job. Used for metrics.
     * @property {Object} metadata.data - The data associated with the job.
     */

    /**
     * @method addQueuedJob
     * @async
     * @description Adds a new job to the job repository, which will be polled and executed by the job queue manager.
     * @param {QueuedJob} job - The job to be added to the queue.
     * @returns {Promise<Object>} The added job model.
     */
    async addQueuedJob({name, metadata}) {
        // Try to initialize JobQueueManager if it's missing
        if (!this.#jobQueueManager) {
            this.#initializeJobQueueManager();
        }

        if (this.#config?.get('services:jobs:queue:enabled') === true && this.#jobQueueManager) {
            const model = await this.#jobQueueManager.addJob({name, metadata});
            return model;
        }
        return undefined;
    }

    async _jobMessageHandler({name, message}) {
        if (name) {
            if (message === ALL_STATUSES.started) {
                if (this._jobsRepository) {
                    const job = await this._jobsRepository.read(name);

                    if (job) {
                        await this._jobsRepository.update(job.id, {
                            status: ALL_STATUSES.started,
                            started_at: new Date()
                        });
                    }
                }
            } else if (message === 'done') {
                if (this._jobsRepository) {
                    const job = await this._jobsRepository.read(name);

                    if (job) {
                        await this._jobsRepository.update(job.id, {
                            status: ALL_STATUSES.finished,
                            finished_at: new Date()
                        });
                    }
                }

                // Check completion listeners
                if (this.#completionPromises.has(name)) {
                    for (const listeners of this.#completionPromises.get(name)) {
                        listeners.resolve();
                    }
                    // Clear the listeners
                    this.#completionPromises.delete(name);
                }

                if (this.inlineQueue.length() <= 1) {
                    if (this.#completionPromises.has('all')) {
                        for (const listeners of this.#completionPromises.get('all')) {
                            listeners.resolve();
                        }
                        // Clear the listeners
                        this.#completionPromises.delete('all');
                    }
                }
            } else {
                if (typeof message === 'object' && this.#domainEvents) {
                    // Is this an event?
                    if (message.event) {
                        this.#domainEvents.dispatchRaw(message.event.type, message.event.data);
                    }
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

        // Check completion listeners and call them with error
        if (this.#completionPromises.has(jobMeta.name)) {
            for (const listeners of this.#completionPromises.get(jobMeta.name)) {
                listeners.reject(error);
            }
            // Clear the listeners
            this.#completionPromises.delete(jobMeta.name);
        }

        if (this.inlineQueue.length() <= 1) {
            if (this.#completionPromises.has('all')) {
                for (const listeners of this.#completionPromises.get('all')) {
                    listeners.reject(error);
                }
                // Clear the listeners
                this.#completionPromises.delete('all');
            }
        }
    }

    /**
     * By default schedules an "offloaded" job. If `offloaded: true` parameter is set,
     * puts an "inline" immediate job into the inlineQueue.
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
            logging.info('Adding offloaded job to the inline job queue');
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
            logging.info(`Adding one-off job to inlineQueue with current length = ${this.inlineQueue.length()} called '${name || 'anonymous'}'`);

            this.inlineQueue.push(async () => {
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
     * Awaits completion of the offloaded one-off job.
     * CAUTION: it might take a long time to resolve!
     * @param {string} name one-off job name
     * @returns resolves with a Job model at current state
     */
    async awaitOneOffCompletion(name) {
        const persistedJob = await this._jobsRepository.read(name);

        if (!persistedJob || ![ALL_STATUSES.finished, ALL_STATUSES.failed].includes(persistedJob.get('status'))) {
            // NOTE: can implement exponential backoff here if that's ever needed
            await setTimeoutPromise(500);

            return this.awaitOneOffCompletion(name);
        }

        return persistedJob;
    }

    /***
     * Create this promise before you add the job you want to listen for. Then await the returned promise.
     * Resolves if the job has been executed successfully.
     * Throws an error if the job has failed execution.
     */
    async awaitCompletion(name) {
        const promise = new Promise((resolve, reject) => {
            this.#completionPromises.set(name, [
                ...(this.#completionPromises.get(name) ?? []),
                {resolve, reject}
            ]);
        });

        return promise;
    }

    /**
     * Wait for all inline jobs to be completed.
     */
    async allSettled() {
        const name = 'all';

        return new Promise((resolve, reject) => {
            if (this.inlineQueue.idle()) {
                resolve();
                return;
            }

            this.#completionPromises.set(name, [
                ...(this.#completionPromises.get(name) ?? []),
                {resolve, reject}
            ]);
        });
    }

    /**
     * Removes an "offloaded" job from scheduled jobs inlineQueue.
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

        if (this.#jobQueueManager) {
            await this.#jobQueueManager.shutdown();
        }

        if (this.inlineQueue.idle()) {
            return;
        }

        logging.warn('Waiting for busy job in inline job queue');

        await pWaitFor(() => this.inlineQueue.idle() === true, options);

        logging.warn('Inline job queue finished');
    }
}

module.exports = JobManager;
