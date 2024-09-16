const rewire = require('rewire');
const sinon = require('sinon');
const path = require('path');
const GhostErrors = require('@tryghost/errors');

describe('Generic Worker', function () {
    let genericWorker;
    let workerpoolStub;

    beforeEach(function () {
        workerpoolStub = {
            worker: sinon.stub()
        };

        genericWorker = rewire('../lib/workers/generic-worker');
        genericWorker.__set__('workerpool', workerpoolStub);
    });

    describe('executeJob', function () {
        it('should execute a valid job module', function () {
            const jobPath = path.join(__dirname, 'mock-job.js');
            const jobData = {test: 'data'};
            const mockJobModule = sinon.stub().returns('job result');

            genericWorker.__set__('require', p => (p === jobPath ? mockJobModule : require(p)));

            const result = genericWorker.executeJob(jobPath, jobData);

            mockJobModule.calledWith(jobData).should.be.true;
            result.should.equal('job result');
        });

        it('should throw an error if job module does not export a function', function () {
            const jobPath = path.join(__dirname, 'invalid-job.js');
            const jobData = {test: 'data'};

            genericWorker.__set__('require', p => (p === jobPath ? {} : require(p)));

            (() => genericWorker.executeJob(jobPath, jobData)).should.throw(GhostErrors.IncorrectUsageError, {
                message: `Job module at ${jobPath} does not export a function`
            });
        });

        it('should throw an error if job execution fails', function () {
            const jobPath = path.join(__dirname, 'failing-job.js');
            const jobData = {test: 'data'};
            const mockJobModule = sinon.stub().throws(new Error('Job execution failed'));

            genericWorker.__set__('require', p => (p === jobPath ? mockJobModule : require(p)));

            (() => genericWorker.executeJob(jobPath, jobData)).should.throw(GhostErrors.IncorrectUsageError, {
                message: 'Failed to execute job: Job execution failed'
            });
        });
    });
});