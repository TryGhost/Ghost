// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');
const assert = require('assert/strict');
const path = require('path');
const sinon = require('sinon');
const delay = require('delay');
const FakeTimers = require('@sinonjs/fake-timers');
const logging = require('@tryghost/logging');

const JobManager = require('../index');

const sandbox = sinon.createSandbox();

const jobModelInstance = {
    id: 'unique',
    get: (field) => {
        if (field === 'status') {
            return 'finished';
        }
    }
};

const queuedJob = {
    name: 'test-job',
    metadata: {
        job: path.resolve(__dirname, './jobs/simple.js'),
        data: 'test data'
    }
};

describe('Job Manager', function () {
    let stubConfig, stubJobQueueManager, jobManager;

    beforeEach(function () {
        sandbox.stub(logging, 'info');
        sandbox.stub(logging, 'warn');
        sandbox.stub(logging, 'error');

        stubConfig = {
            get: sinon.stub().returns({
                enabled: true,
                queue: {
                    enabled: true
                }
            })
        };

        stubJobQueueManager = {
            addJob: sinon.stub().resolves({id: 'job1'})
        };

        jobManager = new JobManager({
            config: stubConfig,
            jobQueueManager: stubJobQueueManager
        });
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('public interface', function () {
        should.exist(jobManager.addJob);
        should.exist(jobManager.hasExecutedSuccessfully);
        should.exist(jobManager.awaitOneOffCompletion);
        should.exist(jobManager.awaitCompletion);
        should.exist(jobManager.allSettled);
        should.exist(jobManager.removeJob);
        should.exist(jobManager.shutdown);
        should.exist(jobManager.inlineJobHandler);
        should.exist(jobManager.addQueuedJob);
    });

    describe('Add a job', function () {
        describe('Inline jobs', function () {
            it('adds a job to a queue', async function () {
                const spy = sinon.spy();
                jobManager.addJob({
                    job: spy,
                    data: 'test data',
                    offloaded: false
                });
                should(jobManager.inlineQueue.idle()).be.false();

                // give time to execute the job
                await delay(1);

                should(jobManager.inlineQueue.idle()).be.true();
                should(spy.called).be.true();
                should(spy.args[0][0]).equal('test data');
            });

            it('handles failed job gracefully', async function () {
                const spy = sinon.stub().throws();
                const jobModelSpy = {
                    findOne: sinon.spy()
                };

                jobManager.addJob({
                    job: spy,
                    data: 'test data',
                    offloaded: false
                });
                should(jobManager.inlineQueue.idle()).be.false();

                // give time to execute the job
                await delay(1);

                should(jobManager.inlineQueue.idle()).be.true();
                should(spy.called).be.true();
                should(spy.args[0][0]).equal('test data');
                should(logging.error.called).be.true();
                // a one-off job without a name should not have persistance
                should(jobModelSpy.findOne.called).be.false();
            });
        });

        describe('Offloaded jobs', function () {
            it('fails to schedule for invalid scheduling expression', function () {
                try {
                    jobManager.addJob({
                        at: 'invalid expression',
                        name: 'jobName'
                    });
                } catch (err) {
                    err.message.should.equal('Invalid schedule format');
                }
            });

            it('fails to schedule for no job name', function () {
                try {
                    jobManager.addJob({
                        at: 'invalid expression',
                        job: () => {}
                    });
                } catch (err) {
                    err.message.should.equal('Name parameter should be present if job is a function');
                }
            });

            it('schedules a job using date format', async function () {
                const timeInTenSeconds = new Date(Date.now() + 10);
                const jobPath = path.resolve(__dirname, './jobs/simple.js');

                const clock = FakeTimers.install({now: Date.now()});
                jobManager.addJob({
                    at: timeInTenSeconds,
                    job: jobPath,
                    name: 'job-in-ten'
                });

                should(jobManager.bree.timeouts['job-in-ten']).type('object');
                should(jobManager.bree.workers['job-in-ten']).type('undefined');

                // allow to run the job and start the worker
                await clock.nextAsync();

                should(jobManager.bree.workers['job-in-ten']).type('object');

                const promise = new Promise((resolve, reject) => {
                    jobManager.bree.workers['job-in-ten'].on('error', reject);
                    jobManager.bree.workers['job-in-ten'].on('exit', (code) => {
                        should(code).equal(0);
                        resolve();
                    });
                });

                // allow job to finish execution and exit
                clock.next();

                await promise;

                should(jobManager.bree.workers['job-in-ten']).type('undefined');

                clock.uninstall();
            });

            it('schedules a job to run immediately', async function () {
                const clock = FakeTimers.install({now: Date.now()});

                const jobPath = path.resolve(__dirname, './jobs/simple.js');
                jobManager.addJob({
                    job: jobPath,
                    name: 'job-now'
                });

                should(jobManager.bree.timeouts['job-now']).type('object');

                // allow scheduler to pick up the job
                clock.tick(1);

                should(jobManager.bree.workers['job-now']).type('object');

                const promise = new Promise((resolve, reject) => {
                    jobManager.bree.workers['job-now'].on('error', reject);
                    jobManager.bree.workers['job-now'].on('exit', (code) => {
                        should(code).equal(0);
                        resolve();
                    });
                });

                await promise;

                should(jobManager.bree.workers['job-now']).type('undefined');

                clock.uninstall();
            });

            it('fails to schedule a job with the same name to run immediately one after another', async function () {
                const clock = FakeTimers.install({now: Date.now()});

                const jobPath = path.resolve(__dirname, './jobs/simple.js');
                jobManager.addJob({
                    job: jobPath,
                    name: 'job-now'
                });

                should(jobManager.bree.timeouts['job-now']).type('object');

                // allow scheduler to pick up the job
                clock.tick(1);

                should(jobManager.bree.workers['job-now']).type('object');

                const promise = new Promise((resolve, reject) => {
                    jobManager.bree.workers['job-now'].on('error', reject);
                    jobManager.bree.workers['job-now'].on('exit', (code) => {
                        should(code).equal(0);
                        resolve();
                    });
                });

                await promise;

                should(jobManager.bree.workers['job-now']).type('undefined');

                (() => {
                    jobManager.addJob({
                        job: jobPath,
                        name: 'job-now'
                    });
                }).should.throw('Job #1 has a duplicate job name of job-now');

                clock.uninstall();
            });

            it('uses custom error handler when job fails', async function (){
                let job = function namedJob() {
                    throw new Error('job error');
                };
                const spyHandler = sinon.spy();
                jobManager = new JobManager({errorHandler: spyHandler, config: stubConfig});
                const completion = jobManager.awaitCompletion('will-fail');

                jobManager.addJob({
                    job,
                    name: 'will-fail'
                });

                await assert.rejects(completion, /job error/);

                should(spyHandler.called).be.true();
                should(spyHandler.args[0][0].message).equal('job error');
                should(spyHandler.args[0][1].name).equal('will-fail');
            });

            it('uses worker message handler when job sends a message', async function (){
                const workerMessageHandlerSpy = sinon.spy();
                jobManager = new JobManager({workerMessageHandler: workerMessageHandlerSpy, config: stubConfig});
                const completion = jobManager.awaitCompletion('will-send-msg');

                jobManager.addJob({
                    job: path.resolve(__dirname, './jobs/message.js'),
                    name: 'will-send-msg'
                });
                jobManager.bree.run('will-send-msg');
                await delay(100);
                jobManager.bree.workers['will-send-msg'].postMessage('hello from Ghost!');

                await completion;

                should(workerMessageHandlerSpy.called).be.true();
                should(workerMessageHandlerSpy.args[0][0].name).equal('will-send-msg');
                should(workerMessageHandlerSpy.args[0][0].message).equal('Worker received: hello from Ghost!');
            });
        });
    });

    describe('Add one off job', function () {
        it('throws if name parameter is not provided', async function () {
            try {
                await jobManager.addOneOffJob({
                    job: () => {}
                });
                throw new Error('should have thrown');
            } catch (err) {
                should.equal(err.message, 'The name parameter is required for a one off job.');
            }
        });

        describe('Inline jobs', function () {
            it('adds job to the queue when it is a unique one', async function () {
                const spy = sinon.spy();
                const JobModel = {
                    findOne: sinon.stub().resolves(undefined),
                    add: sinon.stub().resolves()
                };

                jobManager = new JobManager({JobModel, config: stubConfig});
                await jobManager.addOneOffJob({
                    job: spy,
                    name: 'unique name',
                    data: 'test data',
                    offloaded: false
                });

                assert.equal(JobModel.add.called, true);
            });

            it('does not add a job to the queue when it already exists', async function () {
                const spy = sinon.spy();
                const JobModel = {
                    findOne: sinon.stub().resolves(jobModelInstance),
                    add: sinon.stub().throws('should not be called')
                };

                jobManager = new JobManager({JobModel, config: stubConfig});

                try {
                    await jobManager.addOneOffJob({
                        job: spy,
                        name: 'I am the only one',
                        data: 'test data',
                        offloaded: false
                    });
                    throw new Error('should not reach this point');
                } catch (error) {
                    assert.equal(error.message, 'A "I am the only one" one off job has already been executed.');
                }
            });

            it('sets a finished state on an inline job', async function () {
                const JobModel = {
                    findOne: sinon.stub()
                        .onCall(0)
                        .resolves(null)
                        .resolves({id: 'unique', name: 'successful-oneoff'}),
                    add: sinon.stub().resolves({name: 'successful-oneoff'}),
                    edit: sinon.stub().resolves({name: 'successful-oneoff'})
                };

                jobManager = new JobManager({JobModel, config: stubConfig});
                const completion = jobManager.awaitCompletion('successful-oneoff');

                jobManager.addOneOffJob({
                    job: async () => {
                        return await delay(10);
                    },
                    name: 'successful-oneoff',
                    offloaded: false
                });

                await completion;

                // tracks the job queued
                should(JobModel.add.args[0][0].status).equal('queued');
                should(JobModel.add.args[0][0].name).equal('successful-oneoff');

                // tracks the job started
                should(JobModel.edit.args[0][0].status).equal('started');
                should(JobModel.edit.args[0][0].started_at).not.equal(undefined);
                should(JobModel.edit.args[0][1].id).equal('unique');

                // tracks the job finish
                should(JobModel.edit.args[1][0].status).equal('finished');
                should(JobModel.edit.args[1][0].finished_at).not.equal(undefined);
                should(JobModel.edit.args[1][1].id).equal('unique');
            });

            it('sets a failed state on a job', async function () {
                const JobModel = {
                    findOne: sinon.stub()
                        .onCall(0)
                        .resolves(null)
                        .resolves({id: 'unique', name: 'failed-oneoff'}),
                    add: sinon.stub().resolves({name: 'failed-oneoff'}),
                    edit: sinon.stub().resolves({name: 'failed-oneoff'})
                };

                let job = function namedJob() {
                    throw new Error('job error');
                };
                const spyHandler = sinon.spy();
                jobManager = new JobManager({errorHandler: spyHandler, JobModel, config: stubConfig});
                const completion = jobManager.awaitCompletion('failed-oneoff');

                await jobManager.addOneOffJob({
                    job,
                    name: 'failed-oneoff',
                    offloaded: false
                });

                await assert.rejects(completion, /job error/);

                // tracks the job start
                should(JobModel.edit.args[0][0].status).equal('started');
                should(JobModel.edit.args[0][0].started_at).not.equal(undefined);
                should(JobModel.edit.args[0][1].id).equal('unique');

                // tracks the job failure
                should(JobModel.edit.args[1][0].status).equal('failed');
                should(JobModel.edit.args[1][1].id).equal('unique');
            });

            it('adds job to the queue after failing', async function () {
                const JobModel = {
                    findOne: sinon.stub()
                        .onCall(0)
                        .resolves(null)
                        .onCall(1)
                        .resolves({id: 'unique'})
                        .resolves({
                            id: 'unique',
                            get: (field) => {
                                if (field === 'status') {
                                    return 'failed';
                                }
                            }
                        }),
                    add: sinon.stub().resolves({}),
                    edit: sinon.stub().resolves()
                };

                let job = function namedJob() {
                    throw new Error('job error');
                };
                const spyHandler = sinon.spy();
                jobManager = new JobManager({errorHandler: spyHandler, JobModel, config: stubConfig});
                const completion1 = jobManager.awaitCompletion('failed-oneoff');

                await jobManager.addOneOffJob({
                    job,
                    name: 'failed-oneoff',
                    offloaded: false
                });

                // give time to execute the job and fail
                await assert.rejects(completion1, /job error/);
                should(JobModel.edit.args[1][0].status).equal('failed');

                // simulate process restart and "fresh" slate to add the job
                jobManager.removeJob('failed-oneoff');
                const completion2 = jobManager.awaitCompletion('failed-oneoff');

                await jobManager.addOneOffJob({
                    job,
                    name: 'failed-oneoff',
                    offloaded: false
                });

                // give time to execute the job and fail AGAIN
                await assert.rejects(completion2, /job error/);
                should(JobModel.edit.args[3][0].status).equal('started');
                should(JobModel.edit.args[4][0].status).equal('failed');
            });
        });

        describe('Offloaded jobs', function () {
            it('adds job to the queue when it is a unique one', async function () {
                const spy = sinon.spy();
                const JobModel = {
                    findOne: sinon.stub().resolves(undefined),
                    add: sinon.stub().resolves()
                };

                jobManager = new JobManager({JobModel, config: stubConfig});
                await jobManager.addOneOffJob({
                    job: spy,
                    name: 'unique name',
                    data: 'test data'
                });

                assert.equal(JobModel.add.called, true);
            });

            it('does not add a job to the queue when it already exists', async function () {
                const spy = sinon.spy();
                const JobModel = {
                    findOne: sinon.stub().resolves(jobModelInstance),
                    add: sinon.stub().throws('should not be called')
                };

                jobManager = new JobManager({JobModel, config: stubConfig});

                try {
                    await jobManager.addOneOffJob({
                        job: spy,
                        name: 'I am the only one',
                        data: 'test data'
                    });
                    throw new Error('should not reach this point');
                } catch (error) {
                    assert.equal(error.message, 'A "I am the only one" one off job has already been executed.');
                }
            });

            it('sets a finished state on a job', async function () {
                const JobModel = {
                    findOne: sinon.stub()
                        .onCall(0)
                        .resolves(null)
                        .resolves({id: 'unique', name: 'successful-oneoff'}),
                    add: sinon.stub().resolves({name: 'successful-oneoff'}),
                    edit: sinon.stub().resolves({name: 'successful-oneoff'})
                };

                jobManager = new JobManager({JobModel, config: stubConfig});

                const jobCompletion = jobManager.awaitCompletion('successful-oneoff');

                await jobManager.addOneOffJob({
                    job: path.resolve(__dirname, './jobs/message.js'),
                    name: 'successful-oneoff'
                });

                // allow job to get picked up and executed
                await delay(100);

                jobManager.bree.workers['successful-oneoff'].postMessage('be done!');

                // allow the message to be passed around
                await jobCompletion;

                // tracks the job start
                should(JobModel.edit.args[0][0].status).equal('started');
                should(JobModel.edit.args[0][0].started_at).not.equal(undefined);
                should(JobModel.edit.args[0][1].id).equal('unique');

                // tracks the job finish
                should(JobModel.edit.args[1][0].status).equal('finished');
                should(JobModel.edit.args[1][0].finished_at).not.equal(undefined);
                should(JobModel.edit.args[1][1].id).equal('unique');
            });

            it('handles a failed job', async function () {
                const JobModel = {
                    findOne: sinon.stub()
                        .onCall(0)
                        .resolves(null)
                        .resolves(jobModelInstance),
                    add: sinon.stub().resolves({name: 'failed-oneoff'}),
                    edit: sinon.stub().resolves({name: 'failed-oneoff'})
                };

                let job = function namedJob() {
                    throw new Error('job error');
                };
                const spyHandler = sinon.spy();
                jobManager = new JobManager({errorHandler: spyHandler, JobModel, config: stubConfig});

                const completion = jobManager.awaitCompletion('failed-oneoff');

                await jobManager.addOneOffJob({
                    job,
                    name: 'failed-oneoff'
                });

                await assert.rejects(completion, /job error/);

                // still calls the original error handler
                should(spyHandler.called).be.true();
                should(spyHandler.args[0][0].message).equal('job error');
                should(spyHandler.args[0][1].name).equal('failed-oneoff');

                // tracks the job start
                should(JobModel.edit.args[0][0].status).equal('started');
                should(JobModel.edit.args[0][0].started_at).not.equal(undefined);
                should(JobModel.edit.args[0][1].id).equal('unique');

                // tracks the job failure
                should(JobModel.edit.args[1][0].status).equal('failed');
                should(JobModel.edit.args[1][1].id).equal('unique');
            });
        });
    });

    describe('Job execution progress', function () {
        it('checks if job has ever been executed', async function () {
            const JobModel = {
                findOne: sinon.stub()
                    .withArgs('solovei')
                    .onCall(0)
                    .resolves(null)
                    .onCall(1)
                    .resolves({
                        id: 'unique',
                        get: (field) => {
                            if (field === 'status') {
                                return 'finished';
                            }
                        }
                    })
                    .onCall(2)
                    .resolves({
                        id: 'unique',
                        get: (field) => {
                            if (field === 'status') {
                                return 'failed';
                            }
                        }
                    })
            };

            jobManager = new JobManager({JobModel, config: stubConfig});
            let executed = await jobManager.hasExecutedSuccessfully('solovei');
            should.equal(executed, false);

            executed = await jobManager.hasExecutedSuccessfully('solovei');
            should.equal(executed, true);

            executed = await jobManager.hasExecutedSuccessfully('solovei');
            should.equal(executed, false);
        });

        it('can wait for job completion', async function () {
            const spy = sinon.spy();
            let status = 'queued';
            const jobWithDelay = async () => {
                await delay(80);
                status = 'finished';
                spy();
            };
            const JobModel = {
                findOne: sinon.stub()
                    // first call when adding a job
                    .withArgs('solovei')
                    .onCall(0)
                    // first call when adding a job
                    .resolves(null)
                    .onCall(1)
                    .resolves(null)
                    .resolves({
                        id: 'unique',
                        get: () => status
                    }),
                add: sinon.stub().resolves()
            };

            jobManager = new JobManager({JobModel, config: stubConfig});

            await jobManager.addOneOffJob({
                job: jobWithDelay,
                name: 'solovei',
                offloaded: false
            });

            should.equal(spy.called, false);
            await jobManager.awaitOneOffCompletion('solovei');
            should.equal(spy.called, true);
        });
    });

    describe('Remove a job', function () {
        it('removes a scheduled job from the queue', async function () {
            jobManager = new JobManager({config: stubConfig});

            const timeInTenSeconds = new Date(Date.now() + 10);
            const jobPath = path.resolve(__dirname, './jobs/simple.js');

            jobManager.addJob({
                at: timeInTenSeconds,
                job: jobPath,
                name: 'job-in-ten'
            });
            jobManager.bree.config.jobs[0].name.should.equal('job-in-ten');

            await jobManager.removeJob('job-in-ten');

            should(jobManager.bree.config.jobs[0]).be.undefined;
        });
    });

    describe('Add a queued job', function () {
        it('submits a job to the job queue if enabled', async function () {
            stubConfig.get.returns(true);
            const result = await jobManager.addQueuedJob(queuedJob);
            should(stubJobQueueManager.addJob.calledOnce).be.true();
            should(stubJobQueueManager.addJob.firstCall.args[0]).deepEqual(queuedJob);
            should(result).have.property('id', 'job1');
        });

        it('does not submit a job to the job queue if disabled', async function () {
            stubConfig.get.returns(false);
            const result = await jobManager.addQueuedJob(queuedJob);
            should(stubJobQueueManager.addJob.called).be.false();
            should(result).be.undefined();
        });
    });

    describe('Shutdown', function () {
        it('gracefully shuts down inline jobs', async function () {
            jobManager = new JobManager({config: stubConfig});

            jobManager.addJob({
                job: require('./jobs/timed-job'),
                data: 200,
                offloaded: false
            });

            should(jobManager.inlineQueue.idle()).be.false();

            await jobManager.shutdown();

            should(jobManager.inlineQueue.idle()).be.true();
        });

        it('gracefully shuts down an interval job', async function () {
            jobManager = new JobManager({config: stubConfig});

            jobManager.addJob({
                at: 'every 5 seconds',
                job: path.resolve(__dirname, './jobs/graceful.js')
            });

            await delay(1); // let the job execution kick in

            should(Object.keys(jobManager.bree.workers).length).equal(0);
            should(Object.keys(jobManager.bree.timeouts).length).equal(0);
            should(Object.keys(jobManager.bree.intervals).length).equal(1);

            await jobManager.shutdown();

            should(Object.keys(jobManager.bree.intervals).length).equal(0);
        });

        it('gracefully shuts down the job queue worker pool');
    });
});