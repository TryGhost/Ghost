// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');
const path = require('path');
const sinon = require('sinon');
const delay = require('delay');

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
        const jobManager = new JobManager(logging);

        should.exist(jobManager.addJob);
        should.exist(jobManager.scheduleJob);
    });

    describe('Add a Job', function () {
        it('adds a job to a queue', async function () {
            const spy = sinon.spy();
            const jobManager = new JobManager(logging);

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
            const jobManager = new JobManager(logging);

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

    describe('Schedule Job', function () {
        it('fails to schedule for invalid scheduling expression', function () {
            const jobManager = new JobManager(logging);

            try {
                jobManager.scheduleJob('invalid expression', 'jobName', {});
            } catch (err) {
                err.message.should.equal('Invalid schedule format');
            }
        });

        it('fails to schedule for no job name', function () {
            const jobManager = new JobManager(logging);

            try {
                jobManager.scheduleJob('invalid expression', () => {}, {});
            } catch (err) {
                err.message.should.equal('Name parameter should be present if job is a function');
            }
        });
    });

    describe('Shutdown', function () {
        it('gracefully shuts down a synchronous jobs', async function () {
            const jobManager = new JobManager(logging);

            jobManager.addJob(require('./jobs/timed-job'), 200);

            should(jobManager.queue.idle()).be.false();

            await jobManager.shutdown();

            should(jobManager.queue.idle()).be.true();
        });

        it('gracefully shuts down an interval job', async function () {
            const jobManager = new JobManager(logging);

            jobManager.scheduleJob('every 5 seconds', path.resolve(__dirname, './jobs/graceful.js'));

            await delay(1); // let the job execution kick in

            should(Object.keys(jobManager.bree.workers).length).equal(1);

            await jobManager.shutdown();

            should(Object.keys(jobManager.bree.workers).length).equal(0);
        });
    });
});
