const assert = require('node:assert/strict');
const path = require('path');
const Module = require('module');
const sinon = require('sinon');

describe('Email analytics jobs', function () {
    const jobsPath = '../../../../../core/server/services/email-analytics/jobs';
    let originalLoad;
    let originalNodeEnv;
    let config;
    let models;
    let jobsService;
    let newsletterQuery;
    let automationEmailQuery;

    const loadJobs = () => {
        delete require.cache[require.resolve(jobsPath)];
        return require(jobsPath);
    };

    beforeEach(function () {
        originalLoad = Module._load;
        originalNodeEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        config = {
            get: sinon.stub().callsFake((key) => {
                if (key === 'emailAnalytics:enabled' || key === 'backgroundJobs:emailAnalytics') {
                    return true;
                }

                return undefined;
            })
        };

        newsletterQuery = {
            where: sinon.stub().returnsThis(),
            count: sinon.stub().resolves(0)
        };

        automationEmailQuery = {
            where: sinon.stub().returnsThis(),
            count: sinon.stub().returnsThis(),
            first: sinon.stub().resolves({count: 0})
        };

        models = {
            Email: {
                where: sinon.stub().returns(newsletterQuery)
            },
            Base: {
                knex: sinon.stub().withArgs('automated_email_recipients').returns(automationEmailQuery)
            }
        };

        jobsService = {
            addJob: sinon.stub()
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

            return originalLoad.call(this, request, parent, isMain);
        };
    });

    afterEach(function () {
        Module._load = originalLoad;
        process.env.NODE_ENV = originalNodeEnv;
        delete require.cache[require.resolve(jobsPath)];
        sinon.restore();
    });

    it('schedules once immediately when skipping the activity check', async function () {
        const jobs = loadJobs();

        assert.equal(await jobs.scheduleRecurringJobs(true), true);
        assert.equal(await jobs.scheduleRecurringJobs(true), true);

        sinon.assert.calledOnce(jobsService.addJob);
        sinon.assert.notCalled(models.Email.where);
        sinon.assert.notCalled(models.Base.knex);

        const job = jobsService.addJob.firstCall.args[0];
        assert.match(job.at, /^\d+ \d\/5 \* \* \* \*$/);
        assert.equal(job.name, 'email-analytics-fetch-latest');
        assert.equal(job.job, path.resolve(__dirname, '../../../../../core/server/services/email-analytics/jobs/fetch-latest/index.js'));
    });

    it('schedules when there are recent newsletter emails', async function () {
        newsletterQuery.count.resolves(1);
        const jobs = loadJobs();

        assert.equal(await jobs.scheduleRecurringJobs(), true);

        sinon.assert.calledOnce(jobsService.addJob);
        sinon.assert.calledOnceWithExactly(models.Email.where, 'created_at', '>', sinon.match.date);
        sinon.assert.calledOnceWithExactly(newsletterQuery.where, 'status', '<>', 'failed');
        sinon.assert.notCalled(models.Base.knex);
    });

    it('schedules when there are recent automation emails', async function () {
        automationEmailQuery.first.resolves({count: '1'});
        const jobs = loadJobs();

        assert.equal(await jobs.scheduleRecurringJobs(), true);

        sinon.assert.calledOnce(jobsService.addJob);
        sinon.assert.calledOnce(models.Base.knex);
        sinon.assert.calledWithExactly(automationEmailQuery.where, 'sent_at', '>', sinon.match.date);
        sinon.assert.calledOnceWithExactly(automationEmailQuery.count, {count: 'id'});
    });

    it('does not schedule when there is no recent email activity', async function () {
        const jobs = loadJobs();

        assert.equal(await jobs.scheduleRecurringJobs(), false);

        sinon.assert.notCalled(jobsService.addJob);
        sinon.assert.calledOnce(models.Email.where);
        sinon.assert.calledOnce(models.Base.knex);
    });

    it('does not query or schedule when disabled', async function () {
        config.get.callsFake((key) => {
            if (key === 'emailAnalytics:enabled') {
                return false;
            }

            return true;
        });
        const jobs = loadJobs();

        assert.equal(await jobs.scheduleRecurringJobs(true), false);

        sinon.assert.notCalled(jobsService.addJob);
        sinon.assert.notCalled(models.Email.where);
        sinon.assert.notCalled(models.Base.knex);
    });

    it('does not query or schedule in tests', async function () {
        process.env.NODE_ENV = 'test';
        const jobs = loadJobs();

        assert.equal(await jobs.scheduleRecurringJobs(true), false);

        sinon.assert.notCalled(jobsService.addJob);
        sinon.assert.notCalled(models.Email.where);
        sinon.assert.notCalled(models.Base.knex);
    });
});
