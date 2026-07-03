const assert = require('node:assert/strict');
const Module = require('module');
const path = require('path');

const sinon = require('sinon');

describe('Email analytics jobs', function () {
    const jobsIndexPath = '../../../../../core/server/services/email-analytics/jobs';
    let originalLoad;
    let originalEnv;
    let config;
    let jobsService;
    let models;
    let labs;

    function createCountModel(count) {
        const model = {
            where: sinon.stub(),
            count: sinon.stub().resolves(count)
        };

        model.where.returns(model);

        return model;
    }

    beforeEach(function () {
        originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';
        originalLoad = Module._load;

        config = {
            get: sinon.stub()
        };
        config.get.withArgs('emailAnalytics:enabled').returns(true);
        config.get.withArgs('backgroundJobs:emailAnalytics').returns(true);

        jobsService = {
            addJob: sinon.stub()
        };
        models = {
            Email: createCountModel(1),
            AutomatedEmailRecipient: createCountModel(1)
        };
        labs = {
            isSet: sinon.stub().withArgs('automations').returns(true)
        };

        Module._load = function (request, parent, isMain) {
            if (request === '../../../../shared/config') {
                return config;
            }

            if (request === '../../../models') {
                return models;
            }

            if (request === '../../jobs') {
                return jobsService;
            }

            if (request === '../../../../shared/labs') {
                return labs;
            }

            return originalLoad.call(this, request, parent, isMain);
        };

        delete require.cache[require.resolve(jobsIndexPath)];
    });

    afterEach(function () {
        process.env.NODE_ENV = originalEnv;
        Module._load = originalLoad;
        delete require.cache[require.resolve(jobsIndexPath)];
        sinon.restore();
    });

    it('registers separate newsletter and automation recurring analytics jobs', async function () {
        const jobs = require(jobsIndexPath);

        const didSchedule = await jobs.scheduleRecurringJobs();

        assert.equal(didSchedule, true);
        sinon.assert.calledWithExactly(labs.isSet, 'automations');
        sinon.assert.calledWith(models.AutomatedEmailRecipient.where, 'mailgun_message_id', 'is not', null);
        sinon.assert.calledTwice(jobsService.addJob);

        const registeredJobs = jobsService.addJob.getCalls().map(call => call.args[0]);
        const newsletterJob = registeredJobs.find(job => job.name === 'email-analytics-fetch-latest');
        const automationJob = registeredJobs.find(job => job.name === 'email-analytics-automation-fetch-latest');

        assert.ok(newsletterJob);
        assert.ok(automationJob);
        assert.match(newsletterJob.at, /^\d+ \d\/5 \* \* \* \*$/);
        assert.match(automationJob.at, /^\d+ \d\/5 \* \* \* \*$/);
        assert.equal(newsletterJob.job, path.resolve(__dirname, '../../../../../core/server/services/email-analytics/jobs/fetch-latest/index.js'));
        assert.equal(automationJob.job, path.resolve(__dirname, '../../../../../core/server/services/email-analytics/jobs/automation-fetch-latest/index.js'));
    });
});
