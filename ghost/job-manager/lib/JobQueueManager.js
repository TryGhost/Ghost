const workerpool = require('workerpool');
const path = require('path');
const JobsRepository = require('./JobsRepository');
const debug = require('@tryghost/debug')('job-manager:JobQueueManager');
const logging = require('@tryghost/logging');

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
        const {pollMinInterval, pollMaxInterval, queueCapacity, fetchCount} = this.#queueConfig;
        const MIN_POLL_INTERVAL = pollMinInterval || 1000; // 1 second
        const MAX_POLL_INTERVAL = pollMaxInterval || 60000; // 1 minute
        const QUEUE_CAPACITY = queueCapacity || 500;
        const FETCH_COUNT = fetchCount || 500;
        const INCREASE_INTERVAL_THRESHOLD = 30000; // 30 seconds
        let currentPollInterval = MIN_POLL_INTERVAL;
        let lastFoundJobTime = Date.now();
        let isPolling = false;
        const queuedJobs = new Set(); // In-memory set to track queued jobs

        const poll = async () => {
            if (isPolling) {
                return;
            }

            isPolling = true;
            this.#logger.info(`Polling for jobs; current interval: ${Math.floor(currentPollInterval / 1000)}s`);
            try {
                const stats = await this.getStats();
                if (stats.pendingTasks <= QUEUE_CAPACITY) {
                    const entriesToAdd = Math.min(FETCH_COUNT, FETCH_COUNT - stats.pendingTasks);
                    this.#logger.info(`Adding up to ${entriesToAdd} queue entries. Current pending tasks: ${stats.pendingTasks}. Current worker count: ${stats.totalWorkers}`);
                    const jobs = await this.jobsRepository.getQueuedJobs(entriesToAdd);

                    if (jobs.length > 0) {
                        lastFoundJobTime = Date.now();
                        currentPollInterval = MIN_POLL_INTERVAL;
                    } else {
                        const timeSinceLastJob = Date.now() - lastFoundJobTime;
                        if (timeSinceLastJob > INCREASE_INTERVAL_THRESHOLD) {
                            currentPollInterval = MAX_POLL_INTERVAL;
                        }
                    }

                    jobs.forEach((job) => {
                        const jobName = job.get('name');
                        if (queuedJobs.has(jobName)) {
                            return;
                        }
                        const jobMetadata = JSON.parse(job.get('metadata'));
                        const jobData = jobMetadata.data;
                        const jobPath = jobMetadata.job;

                        queuedJobs.add(jobName);

                        this.pool.exec('executeJob', [jobPath, jobData])
                            .then(async () => {
                                await this.jobsRepository.delete(job.id);
                                queuedJobs.delete(jobName); // clear memory entry last
                            })
                            .catch(async (error) => {
                                queuedJobs.delete(jobName);
                                await this.jobsRepository.update(job.id, {
                                    status: 'error',
                                    finished_at: new Date(),
                                    metadata: {
                                        error: error.message,
                                        retries: jobMetadata.retries + 1,
                                        ...jobMetadata
                                    }
                                });
                            });
                    });
                }
            } catch (error) {
                this.#logger.error('Error in queue filler:', error);
            } finally {
                isPolling = false;
                this.queueFillerTimeout = setTimeout(poll, currentPollInterval);
            }
        };

        poll(); // Initial poll
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