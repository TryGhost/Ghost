// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');
const path = require('path');
const sinon = require('sinon');
const delay = require('delay');
const FakeTimers = require('@sinonjs/fake-timers');

const JobManager = require('../index');

describe('Job Manager', function () {
    let logging;

    beforeEach(function () {
        logging = {
            info: sinon.stub(),
            warn: sinon.stub(),
            error: sinon.stub()
        };
    });

    it('public interface', function () {
        const jobManager = new JobManager({logging});

        should.exist(jobManager.addJob);
        should.exist(jobManager.scheduleJob);
    });

    describe('Add a Job', function () {
        it('adds a job to a queue', async function () {
            const spy = sinon.spy();
            const jobManager = new JobManager({logging});

            jobManager.addJob(spy, 'test data');
            should(jobManager.queue.idle()).be.false();

            // give time to execute the job
            await delay(1);

            should(jobManager.queue.idle()).be.true();
            should(spy.called).be.true();
            should(spy.args[0][0]).equal('test data');
        });

        it('handles failed job gracefully', async function () {
            const spy = sinon.stub().throws();
            const jobManager = new JobManager({logging});

            jobManager.addJob(spy, 'test data');
            should(jobManager.queue.idle()).be.false();

            // give time to execute the job
            await delay(1);

            should(jobManager.queue.idle()).be.true();
            should(spy.called).be.true();
            should(spy.args[0][0]).equal('test data');
            should(logging.error.called).be.true();
        });
    });

    describe('Schedule a Job', function () {
        it('fails to schedule for invalid scheduling expression', function () {
            const jobManager = new JobManager({logging});

            try {
                jobManager.scheduleJob('invalid expression', 'jobName', {});
            } catch (err) {
                err.message.should.equal('Invalid schedule format');
            }
        });

        it('fails to schedule for no job name', function () {
            const jobManager = new JobManager({logging});

            try {
                jobManager.scheduleJob('invalid expression', () => {}, {});
            } catch (err) {
                err.message.should.equal('Name parameter should be present if job is a function');
            }
        });

        it('schedules a job using date format', async function () {
            const jobManager = new JobManager({logging});
            const timeInTenSeconds = new Date(Date.now() + 10);
            const jobPath = path.resolve(__dirname, './jobs/simple.js');

            const clock = FakeTimers.install({now: Date.now()});
            jobManager.scheduleJob(timeInTenSeconds, jobPath, null, 'job-in-ten');

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
            const jobManager = new JobManager({logging});
            const clock = FakeTimers.install({now: Date.now()});

            const jobPath = path.resolve(__dirname, './jobs/simple.js');
            jobManager.scheduleJob(undefined, jobPath, undefined, 'job-now');

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
            const jobManager = new JobManager({logging});
            const clock = FakeTimers.install({now: Date.now()});

            const jobPath = path.resolve(__dirname, './jobs/simple.js');
            jobManager.scheduleJob(undefined, jobPath, undefined, 'job-now');

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
                jobManager.scheduleJob(undefined, jobPath, undefined, 'job-now');
            }).should.throw('Job #1 has a duplicate job name of job-now');

            clock.uninstall();
        });

        it('uses custom error handler when job fails', async function (){
            let job = function namedJob() {
                throw new Error('job error');
            };
            const spyHandler = sinon.spy();
            const jobManager = new JobManager({logging, errorHandler: spyHandler});

            jobManager.scheduleJob(undefined, job, undefined, 'will-fail');

            // give time to execute the job
            await delay(100);

            should(spyHandler.called).be.true();
            should(spyHandler.args[0][0].message).equal('job error');
            should(spyHandler.args[1][1].name).equal('will-fail');
        });
    });

    describe('Remove a Job', function () {
        it('removes a scheduled job from the queue', async function () {
            const jobManager = new JobManager({logging});

            const timeInTenSeconds = new Date(Date.now() + 10);
            const jobPath = path.resolve(__dirname, './jobs/simple.js');

            jobManager.scheduleJob(timeInTenSeconds, jobPath, null, 'job-in-ten');
            jobManager.bree.config.jobs[0].name.should.equal('job-in-ten');

            await jobManager.removeJob('job-in-ten');

            should(jobManager.bree.config.jobs[0]).be.undefined;
        });
    });

    describe('Shutdown', function () {
        it('gracefully shuts down a synchronous jobs', async function () {
            const jobManager = new JobManager({logging});

            jobManager.addJob(require('./jobs/timed-job'), 200);

            should(jobManager.queue.idle()).be.false();

            await jobManager.shutdown();

            should(jobManager.queue.idle()).be.true();
        });

        it('gracefully shuts down an interval job', async function () {
            const jobManager = new JobManager({logging});

            jobManager.scheduleJob('every 5 seconds', path.resolve(__dirname, './jobs/graceful.js'));

            await delay(1); // let the job execution kick in

            should(Object.keys(jobManager.bree.workers).length).equal(0);
            should(Object.keys(jobManager.bree.timeouts).length).equal(0);
            should(Object.keys(jobManager.bree.intervals).length).equal(1);

            await jobManager.shutdown();

            should(Object.keys(jobManager.bree.intervals).length).equal(0);
        });
    });
});
