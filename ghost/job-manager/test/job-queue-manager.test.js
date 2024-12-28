const sinon = require('sinon');
const {expect} = require('chai');
const JobQueueManager = require('../lib/JobQueueManager');

describe('JobQueueManager', function () {
    let jobQueueManager;
    let mockJobModel;
    let mockConfig;
    let mockLogger;
    let mockWorkerPool;
    let mockPrometheusClient;
    let metricIncStub;
    let mockEventEmitter;
    beforeEach(function () {
        metricIncStub = sinon.stub();
        mockJobModel = {};
        mockConfig = {
            get: sinon.stub().returns({})
        };
        mockLogger = {
            info: sinon.stub(),
            error: sinon.stub()
        };
        mockPrometheusClient = {
            getMetric: sinon.stub().returns({
                set: sinon.stub(),
                inc: metricIncStub
            }),
            registerCounter: sinon.stub(),
            registerGauge: sinon.stub()
        };
        mockWorkerPool = {
            pool: sinon.stub().returns({
                exec: sinon.stub(),
                stats: sinon.stub().returns({}),
                terminate: sinon.stub()
            })
        };
        mockEventEmitter = {
            emit: sinon.stub()
        };

        jobQueueManager = new JobQueueManager({
            JobModel: mockJobModel,
            config: mockConfig,
            logger: mockLogger,
            WorkerPool: mockWorkerPool,
            prometheusClient: mockPrometheusClient,
            eventEmitter: mockEventEmitter
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('initialization', function () {
        it('should initialize with provided dependencies', function () {
            expect(jobQueueManager.jobsRepository).to.exist;
            expect(jobQueueManager.config).to.exist;
            expect(jobQueueManager.logger).to.exist;
            expect(jobQueueManager.pool).to.exist;
        });
    });

    describe('init', function () {
        it('should start the job queue manager', async function () {
            const startQueueProcessorStub = sinon.stub(jobQueueManager, 'startQueueProcessor');
            const reportStatsStub = sinon.stub(jobQueueManager, 'reportStats');

            await jobQueueManager.init();

            expect(startQueueProcessorStub.calledOnce).to.be.true;
            expect(reportStatsStub.called).to.be.false;

            // Test with reportStats enabled
            jobQueueManager.config.reportStats = true;
            await jobQueueManager.init();
            expect(reportStatsStub.calledOnce).to.be.true;
        });

        it('should call reportStats when config.reportStats is true', async function () {
            const startQueueProcessorStub = sinon.stub(jobQueueManager, 'startQueueProcessor');
            const reportStatsStub = sinon.stub(jobQueueManager, 'reportStats');
            jobQueueManager.config.reportStats = true;

            await jobQueueManager.init();

            expect(startQueueProcessorStub.calledOnce).to.be.true;
            expect(reportStatsStub.calledOnce).to.be.true;
        });
    });

    describe('shutdown', function () {
        it('should handle errors during shutdown', async function () {
            const error = new Error('Termination error');
            jobQueueManager.pool.terminate.rejects(error);
            const loggerErrorStub = sinon.stub(jobQueueManager.logger, 'error');

            await jobQueueManager.shutdown();

            expect(jobQueueManager.pool.terminate.calledOnce).to.be.true;
            expect(loggerErrorStub.calledWith('Error terminating worker pool:', error)).to.be.true;
        });

        it('should stop the job queue manager without errors', async function () {
            jobQueueManager.pool.terminate.resolves();
            const loggerErrorStub = sinon.stub(jobQueueManager.logger, 'error');

            await jobQueueManager.shutdown();

            expect(jobQueueManager.pool.terminate.calledOnce).to.be.true;
            expect(loggerErrorStub.called).to.be.false;
        });
    });

    describe('addJob', function () {
        it('should add a new job', async function () {
            const mockJob = {name: 'testJob', metadata: {}};
            const addQueuedJobStub = sinon.stub(jobQueueManager.jobsRepository, 'addQueuedJob').resolves('jobId');

            const result = await jobQueueManager.addJob(mockJob);

            expect(addQueuedJobStub.calledOnceWith(mockJob)).to.be.true;
            expect(result).to.equal('jobId');
        });
    });

    describe('processPendingJobs', function () {
        it('should process pending jobs', async function () {
            const mockStats = {pendingTasks: 0};
            const mockJobs = [{get: sinon.stub().returns('{}')}];

            sinon.stub(jobQueueManager, 'getStats').resolves(mockStats);
            sinon.stub(jobQueueManager.jobsRepository, 'getQueuedJobs').resolves({data: mockJobs, total: mockJobs.length});
            sinon.stub(jobQueueManager, 'updatePollInterval');
            sinon.stub(jobQueueManager, 'processJobs');

            await jobQueueManager.processPendingJobs();

            expect(jobQueueManager.jobsRepository.getQueuedJobs.calledOnce).to.be.true;
            expect(jobQueueManager.updatePollInterval.calledOnceWith(mockJobs)).to.be.true;
            expect(jobQueueManager.processJobs.calledOnceWith(mockJobs)).to.be.true;
        });
    });

    describe('createLogger', function () {
        it('should create a logger with info level', function () {
            const logger = jobQueueManager.createLogger(mockLogger, 'info');
            logger.info('Test info');
            logger.error('Test error');
            expect(mockLogger.info.calledOnce).to.be.true;
            expect(mockLogger.error.calledOnce).to.be.true;
        });

        it('should create a logger with error level', function () {
            const logger = jobQueueManager.createLogger(mockLogger, 'error');
            logger.info('Test info');
            logger.error('Test error');
            expect(mockLogger.info.called).to.be.false;
            expect(mockLogger.error.calledOnce).to.be.true;
        });
    });

    describe('initializeConfig', function () {
        it('should initialize config with default values', function () {
            const config = jobQueueManager.initializeConfig({});
            expect(config.MIN_POLL_INTERVAL).to.equal(1000);
            expect(config.MAX_POLL_INTERVAL).to.equal(60000);
            expect(config.QUEUE_CAPACITY).to.equal(500);
            expect(config.FETCH_COUNT).to.equal(500);
        });

        it('should use provided values in config', function () {
            const config = jobQueueManager.initializeConfig({
                pollMinInterval: 2000,
                pollMaxInterval: 120000,
                queueCapacity: 1000,
                fetchCount: 100
            });
            expect(config.MIN_POLL_INTERVAL).to.equal(2000);
            expect(config.MAX_POLL_INTERVAL).to.equal(120000);
            expect(config.QUEUE_CAPACITY).to.equal(1000);
            expect(config.FETCH_COUNT).to.equal(100);
        });
    });

    describe('startQueueProcessor', function () {
        it('should start polling for jobs', async function () {
            const clock = sinon.useFakeTimers();
            const processPendingJobsStub = sinon.stub(jobQueueManager, 'processPendingJobs').resolves();
            
            jobQueueManager.startQueueProcessor();
            
            // No need to tick the clock, as polling should start immediately
            expect(processPendingJobsStub.calledOnce).to.be.true;
            
            // Optionally, we can test the next poll
            await clock.tickAsync(jobQueueManager.state.currentPollInterval);
            expect(processPendingJobsStub.calledTwice).to.be.true;
            
            clock.restore();
        });

        it('should handle errors during polling', async function () {
            const clock = sinon.useFakeTimers();
            const error = new Error('Test error');
            sinon.stub(jobQueueManager, 'processPendingJobs').rejects(error);
            
            // Create a stub for the logger.error method
            const loggerErrorStub = sinon.stub();
            jobQueueManager.logger.error = loggerErrorStub;
            
            jobQueueManager.startQueueProcessor();
            
            await clock.tickAsync(jobQueueManager.state.currentPollInterval);
            expect(loggerErrorStub.calledWith('Error in queue filler:', error)).to.be.true;
            
            clock.restore();
        });
    });

    describe('updatePollInterval', function () {
        it('should set to MIN_POLL_INTERVAL when jobs are found', function () {
            jobQueueManager.state.currentPollInterval = 60000;
            jobQueueManager.updatePollInterval([{}]);
            expect(jobQueueManager.state.currentPollInterval).to.equal(jobQueueManager.config.MIN_POLL_INTERVAL);
        });

        it('should set to MAX_POLL_INTERVAL when no jobs found for a while', function () {
            const clock = sinon.useFakeTimers();
            jobQueueManager.state.lastFoundJobTime = Date.now() - 31000;
            jobQueueManager.updatePollInterval([]);
            expect(jobQueueManager.state.currentPollInterval).to.equal(jobQueueManager.config.MAX_POLL_INTERVAL);
            clock.restore();
        });
    });

    describe('processJobs', function () {
        it('should process new jobs', async function () {
            const executeJobStub = sinon.stub(jobQueueManager, 'executeJob').resolves();
            const jobs = [
                { 
                    get: sinon.stub().returns('{"name": "testJob1"}'),
                    id: '1'
                },
                { 
                    get: sinon.stub().returns('{"name": "testJob2"}'),
                    id: '2'
                }
            ];
            await jobQueueManager.processJobs(jobs);
            expect(executeJobStub.calledTwice).to.be.true;
        });

        it('should skip already queued jobs', async function () {
            const executeJobStub = sinon.stub(jobQueueManager, 'executeJob').resolves();
            jobQueueManager.state.queuedJobs.add('testJob1');
            const jobs = [
                { 
                    get: sinon.stub().returns('{"name": "testJob1"}'),
                    id: '1'
                },
                { 
                    get: sinon.stub().returns('{"name": "testJob2"}'),
                    id: '2'
                }
            ];
            await jobQueueManager.processJobs(jobs);
            expect(executeJobStub.calledOnce).to.be.true;
            expect(executeJobStub.calledWith(jobs[1], 'testJob2', {name: 'testJob2'})).to.be.true;
        });
    });

    describe('executeJob', function () {
        it('should execute a job successfully', async function () {
            const job = {id: '1', get: sinon.stub().returns('{"job": "testJob", "data": {}}')};
            const deleteStub = sinon.stub(jobQueueManager.jobsRepository, 'delete').resolves();
            
            await jobQueueManager.executeJob(job, 'testJob', {job: 'testJob', data: {}});
            
            expect(jobQueueManager.pool.exec.calledOnce).to.be.true;
            expect(deleteStub.calledWith('1')).to.be.true;
            expect(jobQueueManager.state.queuedJobs.has('testJob')).to.be.false;
        });

        it('should handle job execution errors', async function () {
            const job = {id: '1', get: sinon.stub().returns('{"job": "testJob", "data": {}}')};
            const error = new Error('Test error');
            jobQueueManager.pool.exec.rejects(error);
            const handleJobErrorStub = sinon.stub(jobQueueManager, 'handleJobError').resolves();
            
            await jobQueueManager.executeJob(job, 'testJob', {job: 'testJob', data: {}});
            
            expect(handleJobErrorStub.calledWith(job, {job: 'testJob', data: {}}, error)).to.be.true;
            expect(jobQueueManager.state.queuedJobs.has('testJob')).to.be.false;
        });

        it('should increment the job_manager_queue_job_completion_count metric', async function () {
            const job = {id: '1', get: sinon.stub().returns('{"job": "testJob", "data": {}}')};
            sinon.stub(jobQueueManager.jobsRepository, 'delete').resolves();
            await jobQueueManager.executeJob(job, 'testJob', {job: 'testJob', data: {}});
            expect(metricIncStub.calledOnce).to.be.true;
        });

        it('should increment the email_analytics_aggregate_member_stats_count metric', async function () {
            const job = {id: '1', get: sinon.stub().returns('{"job": "update-member-email-analytics", "data": {}}')};
            sinon.stub(jobQueueManager.jobsRepository, 'delete').resolves();
            await jobQueueManager.executeJob(job, 'update-member-email-analytics', {job: 'update-member-email-analytics', data: {}});
            expect(metricIncStub.calledTwice).to.be.true;
        });

        it('should emit events if present in result', async function () {
            const job = {id: '1', get: sinon.stub().returns('{"job": "testJob", "data": {}}')};
            jobQueueManager.pool.exec.resolves({eventData: {events: [{name: 'member.edited', data: {id: '1'}}]}});
            sinon.stub(jobQueueManager.jobsRepository, 'delete').resolves();
            await jobQueueManager.executeJob(job, 'testJob', {job: 'testJob', data: {}});
            expect(mockEventEmitter.emit.calledOnce).to.be.true;
            expect(mockEventEmitter.emit.calledWith('member.edited', {id: '1'})).to.be.true;
        });
    });

    describe('emitEvents', function () {
        it('should emit events', function () {
            jobQueueManager.emitEvents([{name: 'member.edited', data: {id: '1'}}]);
            expect(mockEventEmitter.emit.calledOnce).to.be.true;
            expect(mockEventEmitter.emit.calledWith('member.edited', {id: '1'})).to.be.true;
        });

        it('should handle multiple events', function () {
            jobQueueManager.emitEvents([{name: 'member.edited', data: {id: '1'}}, {name: 'site.changed', data: {}}]);
            expect(mockEventEmitter.emit.calledTwice).to.be.true;
            expect(mockEventEmitter.emit.calledWith('member.edited', {id: '1'})).to.be.true;
            expect(mockEventEmitter.emit.calledWith('site.changed', {})).to.be.true;
        });
    });

    describe('handleJobError', function () {
        it('should handle Error object', async function () {
            const job = {id: '1'};
            const jobMetadata = {retries: 0};
            
            // Ensure jobsRepository is properly initialized
            jobQueueManager.jobsRepository = jobQueueManager.jobsRepository || {};
            
            // Create the stub on the jobsRepository
            const updateStub = sinon.stub(jobQueueManager.jobsRepository, 'update').resolves();
            
            const error = new Error('Test error');
            
            await jobQueueManager.handleJobError(job, jobMetadata, error);
            
            expect(updateStub.called, 'update should be called').to.be.true;
            expect(updateStub.calledOnce, 'update should be called once').to.be.true;
            
            const [calledId, calledUpdateData] = updateStub.args[0];
            
            expect(calledId).to.equal('1');
            expect(calledUpdateData).to.deep.include({
                status: 'error',
                metadata: {
                    error: 'Test error',
                    retries: 1
                }
            });
            expect(calledUpdateData.finished_at).to.be.instanceOf(Date);
        });
    });
});