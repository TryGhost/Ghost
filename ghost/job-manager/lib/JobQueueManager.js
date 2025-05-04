const workerpool = require('workerpool');
const path = require('path');
const JobsRepository = require('./JobsRepository');
const debug = require('@tryghost/debug')('job-manager:JobQueueManager');
const logging = require('@tryghost/logging');
const metrics = require('@tryghost/metrics');

class JobQueueManager {
    constructor({JobModel, config, logger = logging, metricLogger = metrics, WorkerPool = workerpool, eventEmitter}) {
        this.jobsRepository = new JobsRepository({JobModel});
        this.config = this.initializeConfig(config?.get('services:jobs:queue') || {});
        this.logger = this.createLogger(logger, this.config.logLevel);
        this.metricLogger = metricLogger;
        this.WorkerPool = WorkerPool;
        this.pool = this.createWorkerPool();
        this.state = this.initializeState();
        this.eventEmitter = eventEmitter;
        this.metricCache = {
            jobCompletionCount: 0,
            queueDepth: 0,
            emailAnalyticsAggregateMemberStatsCount: 0
        };
    }

    createLogger(logger, logLevel) {
        return {
            debug: (message) => {
                if (logLevel === 'debug') {
                    logger.debug(`[JobQueueManager] ${message}`);
                }
            },
            info: (message) => {
                if (logLevel === 'info' || logLevel === 'debug') {
                    logger.info(`[JobQueueManager] ${message}`);
                }
            },
            error: (message, error) => {
                if (logLevel === 'info' || logLevel === 'error' || logLevel === 'debug') {
                    logger.error(`[JobQueueManager] ${message}`, error);
                }
            }
        };
    }

    initializeConfig(queueConfig) {
        return {
            MIN_POLL_INTERVAL: queueConfig.pollMinInterval || 1000,
            MAX_POLL_INTERVAL: queueConfig.pollMaxInterval || 60000,
            QUEUE_CAPACITY: queueConfig.queueCapacity || 500,
            FETCH_COUNT: queueConfig.fetchCount || 500,
            INCREASE_INTERVAL_THRESHOLD: 30000,
            maxWorkers: queueConfig.maxWorkers,
            reportStats: queueConfig.reportStats,
            reportInterval: queueConfig.reportInterval || 60000,
            logLevel: queueConfig.logLevel
        };
    }

    initializeState() {
        return {
            currentPollInterval: this.config.MIN_POLL_INTERVAL,
            lastFoundJobTime: Date.now(),
            isPolling: false,
            queuedJobs: new Set()
        };
    }

    createWorkerPool() {
        const poolOptions = {
            workerType: 'thread',
            workerTerminateTimeout: 10000
        };
        if (this.config.maxWorkers) {
            poolOptions.maxWorkers = this.config.maxWorkers;
        }
        return this.WorkerPool.pool(path.join(__dirname, '/workers/generic-worker.js'), poolOptions);
    }

    async init() {
        debug('[JobQueueManager] Initializing job queue');
        this.startQueueProcessor();
        if (this.config.reportStats) {
            this.reportStats();
        }
    }

    async startQueueProcessor() {
        const poll = async () => {
            if (this.state.isPolling) {
                this.logger.debug('Already polling, skipping this cycle');
                return;
            }

            this.state.isPolling = true;
            this.logger.debug(`Polling for jobs; current interval: ${Math.floor(this.state.currentPollInterval / 1000)}s`);

            try {
                await this.processPendingJobs();
            } catch (error) {
                this.logger.error('Error in queue filler:', error);
            } finally {
                this.state.isPolling = false;
                this.queueFillerTimeout = setTimeout(poll, this.state.currentPollInterval);
            }
        };

        poll(); // Initial poll
    }

    async processPendingJobs() {
        const stats = await this.getStats();
        if (stats.pendingTasks <= this.config.QUEUE_CAPACITY) {
            this.logger.debug('Processing pending jobs');
            const entriesToAdd = Math.min(this.config.FETCH_COUNT, this.config.FETCH_COUNT - stats.pendingTasks);
            const {data: jobs, total} = await this.jobsRepository.getQueuedJobs(entriesToAdd);
            this.metricCache.queueDepth = total || 0;
            this.logger.debug(`Adding up to ${entriesToAdd} queue entries. Current pending tasks: ${stats.pendingTasks}. Current worker count: ${stats.totalWorkers}. Current depth: ${total}.`);
            this.updatePollInterval(jobs);
            await this.processJobs(jobs);
        }
    }

    updatePollInterval(jobs) {
        if (jobs.length > 0) {
            this.state.lastFoundJobTime = Date.now();
            this.state.currentPollInterval = this.config.MIN_POLL_INTERVAL;
        } else {
            const timeSinceLastJob = Date.now() - this.state.lastFoundJobTime;
            if (timeSinceLastJob > this.config.INCREASE_INTERVAL_THRESHOLD) {
                this.state.currentPollInterval = this.config.MAX_POLL_INTERVAL;
            }
        }
    }

    /**
     * Emits events to the Node event emitter
     * @param {Array<{name: string, data: any}>} events - The events to emit, e.g. member.edited
     */
    emitEvents(events) {
        events.forEach((e) => {
            this.eventEmitter.emit(e.name, e.data);
        });
    }

    async processJobs(jobs) {
        for (const job of jobs) {
            const jobMetadata = JSON.parse(job.get('metadata'));
            const jobName = jobMetadata.name;
            if (this.state.queuedJobs.has(jobName)) {
                continue;
            }
            await this.executeJob(job, jobName, jobMetadata);
        }
    }

    async executeJob(job, jobName, jobMetadata) {
        this.state.queuedJobs.add(jobName);
        try {
            /**
             * @param {'executeJob'} jobName - This is the generic job execution fn
             * @param {Array<{name: string, data: any}>} args - The arguments to pass to the job execution fn
             * @returns {Promise<{success?: boolean, eventData?: {events: Array<{name: string, data: any}>}}>}
             */
            const result = await this.pool.exec('executeJob', [jobMetadata.job, jobMetadata.data]);
            await this.jobsRepository.delete(job.id);
            this.metricCache.jobCompletionCount += 1;
            if (jobName === 'update-member-email-analytics') {
                this.metricCache.emailAnalyticsAggregateMemberStatsCount += 1;
            }
            if (result && result.eventData) {
                this.emitEvents(result.eventData.events); // this is nested within eventData because we may want to support DomainEvents emission as well
            }
        } catch (error) {
            await this.handleJobError(job, jobMetadata, error);
        } finally {
            this.state.queuedJobs.delete(jobName);
        }
    }

    async handleJobError(job, jobMetadata, error) {
        let errorMessage;
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        } else {
            errorMessage = JSON.stringify(error);
        }
    
        const updateData = {
            status: 'failed',
            finished_at: new Date(),
            metadata: JSON.stringify({
                ...jobMetadata,
                error: errorMessage,
                retries: (jobMetadata.retries || 0) + 1
            })
        };
    
        await this.jobsRepository.update(job.id, updateData);
    }

    async addJob({name, metadata}) {
        const model = await this.jobsRepository.addQueuedJob({name, metadata});
        return model;
    }

    async getStats() {
        return this.pool.stats();
    }

    reportStats() {
        setInterval(() => {
            this._doReportStats();
        }, this.config.reportInterval);
    }

    _doReportStats() {
        const poolStats = this.pool.stats();
        const stats = {
            ...poolStats,
            ...this.metricCache
        };
        const statsString = JSON.stringify(stats, null, 2);
        this.logger.info(`Job Queue Stats: ${statsString}`);
        this.metricLogger.metric('job_manager_queue', stats);
    }

    async shutdown() {
        try {
            await this.pool.terminate();
        } catch (error) {
            this.logger.error('Error terminating worker pool:', error);
        }
    }
}

module.exports = JobQueueManager;