const workerpool = require('workerpool');
const path = require('path');
const JobsRepository = require('./JobsRepository');
const debug = require('@tryghost/debug')('job-manager:JobQueueManager');
const logging = require('@tryghost/logging');

class JobQueueManager {
    constructor({JobModel, config, logger = logging, WorkerPool = workerpool, prometheusClient}) {
        this.jobsRepository = new JobsRepository({JobModel});
        this.config = this.initializeConfig(config?.get('services:jobs:queue') || {});
        this.logger = this.createLogger(logger, this.config.logLevel);
        this.WorkerPool = WorkerPool;
        this.pool = this.createWorkerPool();
        this.state = this.initializeState();
        this.prometheusClient = prometheusClient;

        if (prometheusClient) {
            this.prometheusClient.registerCounter({
                name: 'job_manager_queue_job_completion_count',
                help: 'The number of jobs completed by the job manager queue',
                labelNames: ['jobName']
            });
            this.prometheusClient.registerGauge({name: 'job_manager_queue_depth', help: 'The number of jobs in the job manager queue'});
        }
    }

    createLogger(logger, logLevel) {
        return {
            info: (message) => {
                if (logLevel === 'info') {
                    logger.info(`[JobQueueManager] ${message}`);
                }
            },
            error: (message, error) => {
                if (logLevel === 'info' || logLevel === 'error') {
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
                return;
            }

            this.state.isPolling = true;
            this.logger.info(`Polling for jobs; current interval: ${Math.floor(this.state.currentPollInterval / 1000)}s`);

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
            const entriesToAdd = Math.min(this.config.FETCH_COUNT, this.config.FETCH_COUNT - stats.pendingTasks);
            const {data: jobs, total} = await this.jobsRepository.getQueuedJobs(entriesToAdd);
            this.prometheusClient?.getMetric('job_manager_queue_depth')?.set(total || 0);
            this.logger.info(`Adding up to ${entriesToAdd} queue entries. Current pending tasks: ${stats.pendingTasks}. Current worker count: ${stats.totalWorkers}. Current depth: ${total}.`);
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
            await this.pool.exec('executeJob', [jobMetadata.job, jobMetadata.data]);
            await this.jobsRepository.delete(job.id);
            this.prometheusClient?.getMetric('job_manager_queue_job_completion_count')?.inc({jobName});
            if (jobName === 'update-member-email-analytics') {
                this.prometheusClient?.getMetric('email_analytics_aggregate_member_stats_count')?.inc();
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
            status: 'error',
            finished_at: new Date(),
            metadata: {
                ...jobMetadata,
                error: errorMessage,
                retries: (jobMetadata.retries || 0) + 1
            }
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
            this.logger.info('-- job queue stats --');
            this.logger.info(JSON.stringify(this.pool.stats(), null, 2));
        }, this.config.reportInterval);
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