import sinon from 'sinon';
import {EmailAnalyticsJobScheduler} from '../../../../../core/server/services/email-analytics/jobs/email-analytics-job-scheduler';

function buildModels(emailCount: string | number = 1) {
    const query = {
        where: sinon.stub(),
        count: sinon.stub().resolves(emailCount)
    };
    query.where.returns(query);

    return {
        models: {
            Email: {
                where: query.where
            }
        },
        query
    };
}

function buildScheduler({
    emailAnalyticsEnabled = true,
    backgroundJobEnabled = true,
    emailCount = 1
}: {
    emailAnalyticsEnabled?: boolean;
    backgroundJobEnabled?: boolean;
    emailCount?: string | number;
} = {}) {
    const {models, query} = buildModels(emailCount);
    const config = {
        get: sinon.stub()
    };
    config.get.withArgs('emailAnalytics:enabled').returns(emailAnalyticsEnabled);
    config.get.withArgs('backgroundJobs:emailAnalytics').returns(backgroundJobEnabled);

    const jobManager = {
        addJob: sinon.stub()
    };

    return {
        scheduler: new EmailAnalyticsJobScheduler(models as any, config, jobManager),
        config,
        jobManager,
        query
    };
}

describe('EmailAnalyticsJobScheduler', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('adds a recurring job when conditions are met', async function () {
        sinon.stub(Math, 'random')
            .onFirstCall().returns(0.1)
            .onSecondCall().returns(0.7);

        const {scheduler, jobManager} = buildScheduler({emailCount: '3'});

        await scheduler.scheduleRecurringJobs();

        sinon.assert.calledOnceWithExactly(jobManager.addJob, {
            at: '6 3/5 * * * *',
            job: sinon.match((value: unknown) => (
                typeof value === 'string' &&
                value.endsWith('fetch-latest/index.js')
            )),
            name: 'email-analytics-fetch-latest'
        });
    });

    it('does not add a job when config options are disabled', async function () {
        for (const options of [
            {emailAnalyticsEnabled: false, backgroundJobEnabled: true},
            {emailAnalyticsEnabled: true, backgroundJobEnabled: false},
            {emailAnalyticsEnabled: false, backgroundJobEnabled: false}
        ]) {
            const {scheduler, jobManager, query} = buildScheduler(options);

            await scheduler.scheduleRecurringJobs();

            sinon.assert.notCalled(jobManager.addJob);
            sinon.assert.notCalled(query.count);
        }
    });

    it('does not add another job when called twice', async function () {
        const {scheduler, jobManager, query} = buildScheduler();

        await scheduler.scheduleRecurringJobs();
        await scheduler.scheduleRecurringJobs();

        sinon.assert.calledOnce(jobManager.addJob);
        sinon.assert.calledOnce(query.count);
    });

    it('does not add a job when no emails are found', async function () {
        const {scheduler, jobManager, query} = buildScheduler({emailCount: 0});

        await scheduler.scheduleRecurringJobs();

        sinon.assert.notCalled(jobManager.addJob);
        sinon.assert.calledOnce(query.count);
    });

    it('can add a job later when emails are found', async function () {
        const {scheduler, jobManager, query} = buildScheduler();
        query.count.onFirstCall().resolves(0);
        query.count.onSecondCall().resolves(1);

        await scheduler.scheduleRecurringJobs();
        await scheduler.scheduleRecurringJobs();

        sinon.assert.calledOnce(jobManager.addJob);
        sinon.assert.calledTwice(query.count);
    });

    it('can skip the email lookup', async function () {
        const {scheduler, jobManager, query} = buildScheduler({emailCount: 0});

        await scheduler.scheduleRecurringJobs(true);

        sinon.assert.calledOnce(jobManager.addJob);
        sinon.assert.notCalled(query.where);
        sinon.assert.notCalled(query.count);
    });
});
