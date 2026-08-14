import sinon from 'sinon';
import {deferred} from '../../../../utils/deferred';
import {EmailAnalyticsJobScheduler} from '../../../../../core/server/services/email-analytics/jobs/email-analytics-job-scheduler';

function buildNewsletterQuery(emailCount: string | number = 1) {
    const query = {
        where: sinon.stub(),
        count: sinon.stub().resolves(emailCount)
    };
    query.where.returns(query);

    return query;
}

function buildAutomationsQuery(automatedEmailRecipient: unknown = null) {
    const query = {
        where: sinon.stub(),
        whereNotNull: sinon.stub(),
        first: sinon.stub().resolves(automatedEmailRecipient)
    };
    query.where.returns(query);
    query.whereNotNull.returns(query);

    return query;
}

function buildScheduler({
    emailAnalyticsEnabled = true,
    backgroundJobEnabled = true,
    emailCount = 1,
    automationAnalyticsEnabled = false,
    automatedEmailRecipient = null
}: {
    emailAnalyticsEnabled?: boolean;
    backgroundJobEnabled?: boolean;
    emailCount?: string | number;
    automationAnalyticsEnabled?: boolean;
    automatedEmailRecipient?: unknown;
} = {}) {
    const newsletterQuery = buildNewsletterQuery(emailCount);
    const automationsQuery = buildAutomationsQuery(automatedEmailRecipient);
    const models = {
        Email: {
            where: newsletterQuery.where
        },
        AutomatedEmailRecipient: {
            query: sinon.stub().returns(automationsQuery)
        }
    };
    const config = {
        get: sinon.stub()
    };
    config.get.withArgs('emailAnalytics:enabled').returns(emailAnalyticsEnabled);
    config.get.withArgs('backgroundJobs:emailAnalytics').returns(backgroundJobEnabled);

    const labs = {
        isSet: sinon.stub()
    };
    labs.isSet.withArgs('automationAnalytics').returns(automationAnalyticsEnabled);

    const jobManager = {
        addJob: sinon.stub()
    };

    return {
        scheduler: new EmailAnalyticsJobScheduler({
            models,
            config,
            labs,
            jobManager
        }),
        config,
        labs,
        jobManager,
        newsletterQuery,
        automationsQuery,
        models
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

        await scheduler.scheduleRecurringNewslettersJob();

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
            const {scheduler, jobManager, newsletterQuery, automationsQuery, models} = buildScheduler(options);

            await scheduler.scheduleRecurringNewslettersJob();
            await scheduler.scheduleRecurringAutomationsJob();

            sinon.assert.notCalled(jobManager.addJob);
            sinon.assert.notCalled(newsletterQuery.count);
            sinon.assert.notCalled(models.AutomatedEmailRecipient.query);
            sinon.assert.notCalled(automationsQuery.first);
        }
    });

    it('does not add another job when called twice', async function () {
        const {scheduler, jobManager, newsletterQuery} = buildScheduler();

        await scheduler.scheduleRecurringNewslettersJob();
        await scheduler.scheduleRecurringNewslettersJob();

        sinon.assert.calledOnce(jobManager.addJob);
        sinon.assert.calledOnce(newsletterQuery.count);
    });

    it('does not add another newsletter job when called concurrently', async function () {
        const {scheduler, jobManager, newsletterQuery} = buildScheduler();
        const emailCount = deferred();
        newsletterQuery.count.returns(emailCount.promise.then(() => 1));

        const firstSchedule = scheduler.scheduleRecurringNewslettersJob();
        sinon.assert.calledOnce(newsletterQuery.count);

        const secondSchedule = scheduler.scheduleRecurringNewslettersJob(true);
        emailCount.done();

        await Promise.all([firstSchedule, secondSchedule]);

        sinon.assert.calledOnce(jobManager.addJob);
        sinon.assert.calledOnce(newsletterQuery.count);
    });

    it('does not add another automation job when called twice', async function () {
        const {scheduler, jobManager, automationsQuery} = buildScheduler({
            emailCount: 0,
            automationAnalyticsEnabled: true,
            automatedEmailRecipient: {id: 'recipient-id'}
        });

        await scheduler.scheduleRecurringAutomationsJob();
        await scheduler.scheduleRecurringAutomationsJob();

        sinon.assert.calledOnce(jobManager.addJob);
        sinon.assert.calledOnce(automationsQuery.first);
    });

    it('does not add another automation job when called concurrently', async function () {
        const {scheduler, jobManager, automationsQuery} = buildScheduler({
            emailCount: 0,
            automationAnalyticsEnabled: true
        });
        const automatedEmailRecipient = deferred();
        automationsQuery.first.returns(automatedEmailRecipient.promise.then(() => ({id: 'recipient-id'})));

        const firstSchedule = scheduler.scheduleRecurringAutomationsJob();
        const secondSchedule = scheduler.scheduleRecurringAutomationsJob();

        sinon.assert.calledTwice(automationsQuery.first);
        automatedEmailRecipient.done();

        await Promise.all([firstSchedule, secondSchedule]);

        sinon.assert.calledOnce(jobManager.addJob);
    });

    it('does not add a job when no emails are found', async function () {
        const {scheduler, jobManager, newsletterQuery} = buildScheduler({emailCount: 0});

        await scheduler.scheduleRecurringNewslettersJob();

        sinon.assert.notCalled(jobManager.addJob);
        sinon.assert.calledOnce(newsletterQuery.count);
    });

    it('can add a job later when emails are found', async function () {
        const {scheduler, jobManager, newsletterQuery} = buildScheduler();
        newsletterQuery.count.onFirstCall().resolves(0);
        newsletterQuery.count.onSecondCall().resolves(1);

        await scheduler.scheduleRecurringNewslettersJob();
        await scheduler.scheduleRecurringNewslettersJob();

        sinon.assert.calledOnce(jobManager.addJob);
        sinon.assert.calledTwice(newsletterQuery.count);
    });

    it('can skip the email lookup', async function () {
        const {scheduler, jobManager, newsletterQuery} = buildScheduler({emailCount: 0});

        await scheduler.scheduleRecurringNewslettersJob(true);

        sinon.assert.calledOnce(jobManager.addJob);
        sinon.assert.notCalled(newsletterQuery.where);
        sinon.assert.notCalled(newsletterQuery.count);
    });

    it('adds an automation job when automation analytics is enabled and recipients exist', async function () {
        sinon.stub(Math, 'random')
            .onFirstCall().returns(0.2)
            .onSecondCall().returns(0.8);

        const {scheduler, jobManager, newsletterQuery, automationsQuery, models} = buildScheduler({
            emailCount: 0,
            automationAnalyticsEnabled: true,
            automatedEmailRecipient: {id: 'recipient-id'}
        });

        await scheduler.scheduleRecurringAutomationsJob();

        sinon.assert.calledOnceWithExactly(jobManager.addJob, {
            at: '12 4/5 * * * *',
            job: sinon.match((value: unknown) => (
                typeof value === 'string' &&
                value.endsWith('automation-fetch-latest/index.js')
            )),
            name: 'email-analytics-automation-fetch-latest'
        });
        sinon.assert.calledOnce(models.AutomatedEmailRecipient.query);
        sinon.assert.calledOnceWithExactly(automationsQuery.where, 'created_at', '>', sinon.match.date);
        sinon.assert.calledOnceWithExactly(automationsQuery.whereNotNull, 'mailgun_message_id');
        sinon.assert.calledOnceWithExactly(automationsQuery.first, 'id');
    });

    it('can skip the automation email recipient lookup', async function () {
        const {scheduler, jobManager, automationsQuery} = buildScheduler({
            emailCount: 0,
            automationAnalyticsEnabled: true,
            automatedEmailRecipient: null
        });

        await scheduler.scheduleRecurringAutomationsJob(true);

        sinon.assert.calledOnceWithMatch(jobManager.addJob, {
            job: sinon.match((value: unknown) => (
                typeof value === 'string' &&
                value.endsWith('automation-fetch-latest/index.js')
            )),
            name: 'email-analytics-automation-fetch-latest'
        });
        sinon.assert.notCalled(automationsQuery.first);
    });

    it('adds both newsletter and automation jobs when conditions are met', async function () {
        const {scheduler, jobManager} = buildScheduler({
            emailCount: 1,
            automationAnalyticsEnabled: true,
            automatedEmailRecipient: {id: 'recipient-id'}
        });

        await scheduler.scheduleRecurringNewslettersJob();
        await scheduler.scheduleRecurringAutomationsJob();

        sinon.assert.calledTwice(jobManager.addJob);
        sinon.assert.calledWithMatch(jobManager.addJob, {
            job: sinon.match((value: unknown) => (
                typeof value === 'string' &&
                value.endsWith('fetch-latest/index.js')
            )),
            name: 'email-analytics-fetch-latest'
        });
        sinon.assert.calledWithMatch(jobManager.addJob, {
            job: sinon.match((value: unknown) => (
                typeof value === 'string' &&
                value.endsWith('automation-fetch-latest/index.js')
            )),
            name: 'email-analytics-automation-fetch-latest'
        });
    });

    it('does not look for automation recipients when automation analytics is disabled', async function () {
        const {scheduler, jobManager, automationsQuery, models} = buildScheduler({
            emailCount: 0,
            automationAnalyticsEnabled: false,
            automatedEmailRecipient: {id: 'recipient-id'}
        });

        await scheduler.scheduleRecurringAutomationsJob();

        sinon.assert.notCalled(jobManager.addJob);
        sinon.assert.notCalled(models.AutomatedEmailRecipient.query);
        sinon.assert.notCalled(automationsQuery.first);
    });

    it('does not add an automation job when no automation recipients are found', async function () {
        const {scheduler, jobManager, automationsQuery} = buildScheduler({
            emailCount: 0,
            automationAnalyticsEnabled: true,
            automatedEmailRecipient: null
        });

        await scheduler.scheduleRecurringAutomationsJob();

        sinon.assert.notCalled(jobManager.addJob);
        sinon.assert.calledOnce(automationsQuery.first);
    });
});
