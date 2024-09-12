const workerpool = require('workerpool');
const path = require('path');
const JobsRepository = require('./JobsRepository');
const debug = require('@tryghost/debug')('job-manager:JobQueueManager');
const logging = require('@tryghost/logging');

/**
 * @typedef {Object} QueueConfig
 * @property {number} MIN_POLL_INTERVAL - Minimum polling interval in milliseconds
 * @property {number} MAX_POLL_INTERVAL - Maximum polling interval in milliseconds
 * @property {number} QUEUE_CAPACITY - Maximum number of pending tasks in the queue
 * @property {number} FETCH_COUNT - Number of jobs to fetch in each polling cycle
 * @property {number} INCREASE_INTERVAL_THRESHOLD - Time threshold to increase polling interval
 */

/**
 * @typedef {Object} QueueState
 * @property {number} currentPollInterval - Current polling interval in milliseconds
 * @property {number} lastFoundJobTime - Timestamp of when the last job was found
 * @property {boolean} isPolling - Flag indicating if the queue is currently polling
 * @property {Set<string>} queuedJobs - Set of job names currently in the queue
 */

/**
 * @class JobQueueManager
 * @description Manages background jobs using a worker pool and job repository.
 */
class JobQueueManager {
    #queueConfig;
    #logger;

    /**
     * @constructor
     * @param {Object} options - Configuration options for the job manager.
     * @param {Object} options.JobModel - A model which can persist job data in storage.
     * @param {Object} options.config - The configuration object.
     * @param {Object} options.db - The database object.
     */
    constructor({JobModel, config, db}) {
        this.jobsRepository = new JobsRepository({JobModel, db});
        this.#queueConfig = config?.get('services:jobs:queue') || {};
        this.#logger = this.#createLogger(this.#queueConfig.logLevel);
        let poolOptions = {
            workerType: 'thread',
            workerTerminateTimeout: 10000
        };
        if (this.#queueConfig?.maxWorkers) {
            poolOptions.maxWorkers = this.#queueConfig.maxWorkers;
        }
        // @ts-ignore
        this.pool = workerpool.pool(path.join(__dirname, '/workers/generic-worker.js'), poolOptions);
    }

    /**
     * @method #createLogger
     * @param {string} logLevel - The log level to use for the logger.
     * @returns {Object} A logger object with info and error methods.
     */
    #createLogger(logLevel) {
        return {
            info: (message) => {
                if (logLevel === 'info') {
                    logging.info(`[JobQueueManager] ${message}`);
                }
            },
            error: (message, error) => {
                if (logLevel === 'info' || logLevel === 'error') {
                    logging.error(`[JobQueueManager] ${message}`, error);
                }
            }
        };
    }

    /**
     * @method init
     * @async
     * @description Initializes the job manager, starts reporting stats, and optionally starts the queue filler.
     * @returns {Promise<void>}
     */
    async init() {
        debug('[JobQueueManager] Initializing job queue');
        this.startQueueProcessor();
        if (this.#queueConfig.reportStats) {
            this.reportStats();
        }
    }

    /**
     * @method startQueueProcessor
     * @async
     * @description Starts a polling process which checks for jobs and adds them to the queue/worker pool.
     * 
     * This method initializes a polling mechanism to continuously check for and process queued jobs.
     * It dynamically adjusts the polling interval based on job availability and system load.
     * 
     * Key features:
     * - Maintains a minimum of 500 pending tasks in the worker pool
     * - Dynamically adjusts polling interval between 1 second and 1 minute
     * - Uses an in-memory set to prevent duplicate job processing
     * - Handles job execution and cleanup
     * 
     * @returns {Promise<void>}
     */
    async startQueueProcessor() {
        const config = this.#initializeConfig();
        const state = this.#initializeState();

        const poll = async () => {
            if (state.isPolling) {
                return;
            }

            state.isPolling = true;
            this.#logger.info(`Polling for jobs; current interval: ${Math.floor(state.currentPollInterval / 1000)}s`);

            try {
                await this.#processPendingJobs(config, state);
            } catch (error) {
                this.#logger.error('Error in queue filler:', error);
            } finally {
                state.isPolling = false;
                this.queueFillerTimeout = setTimeout(poll, state.currentPollInterval);
            }
        };

        poll(); // Initial poll
    }

    /**
     * @method #initializeConfig
     * @description Initializes the configuration object for the queue processor.
     * @returns {QueueConfig} The configuration object.
     */
    #initializeConfig() {
        const {pollMinInterval, pollMaxInterval, queueCapacity, fetchCount} = this.#queueConfig;
        return {
            MIN_POLL_INTERVAL: pollMinInterval || 1000,
            MAX_POLL_INTERVAL: pollMaxInterval || 60000,
            QUEUE_CAPACITY: queueCapacity || 500,
            FETCH_COUNT: fetchCount || 500,
            INCREASE_INTERVAL_THRESHOLD: 30000
        };
    }

    /**
     * @method #initializeState
     * @description Initializes the state object for the queue processor.
     * @returns {QueueState} The state object.
     */
    #initializeState() {
        return {
            currentPollInterval: this.#initializeConfig().MIN_POLL_INTERVAL,
            lastFoundJobTime: Date.now(),
            isPolling: false,
            queuedJobs: new Set()
        };
    }

    /**
     * @method #processPendingJobs
     * @async
     * @description Processes pending jobs in the queue.
     * @param {QueueConfig} config - The configuration object.
     * @param {QueueState} state - The current state object.
     * @returns {Promise<void>}
     */
    async #processPendingJobs(config, state) {
        const stats = await this.getStats();
        if (stats.pendingTasks <= config.QUEUE_CAPACITY) {
            const entriesToAdd = Math.min(config.FETCH_COUNT, config.FETCH_COUNT - stats.pendingTasks);
            this.#logger.info(`Adding up to ${entriesToAdd} queue entries. Current pending tasks: ${stats.pendingTasks}. Current worker count: ${stats.totalWorkers}`);
            
            const jobs = await this.jobsRepository.getQueuedJobs(entriesToAdd);
            this.#updatePollInterval(jobs, config, state);
            await this.#processJobs(jobs, state);
        }
    }

    /**
     * @method #updatePollInterval
     * @description Updates the polling interval based on job availability.
     * @param {Array} jobs - The array of jobs fetched.
     * @param {QueueConfig} config - The configuration object.
     * @param {QueueState} state - The current state object.
     */
    #updatePollInterval(jobs, config, state) {
        if (jobs.length > 0) {
            state.lastFoundJobTime = Date.now();
            state.currentPollInterval = config.MIN_POLL_INTERVAL;
        } else {
            const timeSinceLastJob = Date.now() - state.lastFoundJobTime;
            if (timeSinceLastJob > config.INCREASE_INTERVAL_THRESHOLD) {
                state.currentPollInterval = config.MAX_POLL_INTERVAL;
            }
        }
    }

    /**
     * @method #processJobs
     * @async
     * @description Processes a batch of jobs.
     * @param {Array} jobs - The array of jobs to process.
     * @param {QueueState} state - The current state object.
     * @returns {Promise<void>}
     */
    async #processJobs(jobs, state) {
        for (const job of jobs) {
            const jobName = job.get('name');
            if (state.queuedJobs.has(jobName)) {
                continue;
            }

            const jobMetadata = JSON.parse(job.get('metadata'));
            await this.#executeJob(job, jobName, jobMetadata, state);
        }
    }

    /**
     * @method #executeJob
     * @async
     * @description Executes a single job.
     * @param {Object} job - The job object to execute.
     * @param {string} jobName - The name of the job.
     * @param {Object} jobMetadata - The metadata of the job.
     * @param {QueueState} state - The current state object.
     * @returns {Promise<void>}
     */
    async #executeJob(job, jobName, jobMetadata, state) {
        state.queuedJobs.add(jobName);
        try {
            await this.pool.exec('executeJob', [jobMetadata.job, jobMetadata.data]);
            await this.jobsRepository.delete(job.id);
        } catch (error) {
            await this.#handleJobError(job, jobMetadata, error);
        } finally {
            state.queuedJobs.delete(jobName);
        }
    }

    /**
     * @method #handleJobError
     * @async
     * @description Handles errors that occur during job execution.
     * @param {Object} job - The job object that encountered an error.
     * @param {Object} jobMetadata - The metadata of the job.
     * @param {Error} error - The error that occurred.
     * @returns {Promise<void>}
     */
    async #handleJobError(job, jobMetadata, error) {
        await this.jobsRepository.update(job.id, {
            status: 'error',
            finished_at: new Date(),
            metadata: {
                error: error.message,
                retries: jobMetadata.retries + 1,
                ...jobMetadata
            }
        });
    }

    /**
     * @method addJob
     * @async
     * @description Adds a new job to the job repository.
     * @param {Object} jobEntry - The options for adding a job.
     * @param {string} jobEntry.name - The name or identifier of the job.
     * @param {Object} jobEntry.metadata - Metadata associated with the job.
     * @returns {Promise<Object>} The added job model.
     */
    async addJob({name, metadata}) {
        const model = await this.jobsRepository.addQueuedJob({name, metadata});
        return model;
    }

    /**
     * @method getStats
     * @async
     * @description Retrieves the current stats of the worker pool.
     * @returns {Promise<Object>} The worker pool stats.
     */
    async getStats() {
        return this.pool.stats();
    }

    /**
     * @method reportStats
     * @async
     * @description Starts periodic reporting of JobManagerBackground stats.
     */
    async reportStats() {
        const interval = this.#queueConfig.reportInterval || 60000;
        setInterval(() => {
            this.#logger.info('-- job queue stats --');
            this.#logger.info(JSON.stringify(this.pool.stats(), null, 2));
        }, interval);
    }
}

module.exports = JobQueueManager;