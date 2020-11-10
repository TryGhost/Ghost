// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');
const sinon = require('sinon');
const delay = require('delay');

const JobManager = require('../index');

describe('Job Manager', function () {
    let logging;

    beforeEach(() => {
        logging = {
            info: sinon.stub(),
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
        it('fails to run for invalid scheduling expression', function () {
            const jobManager = new JobManager(logging);

            try {
                jobManager.scheduleJob('invalid expression', () => {}, {});
            } catch (err) {
                err.message.should.equal('Invalid schedule format');
            }
        });
    });
});
