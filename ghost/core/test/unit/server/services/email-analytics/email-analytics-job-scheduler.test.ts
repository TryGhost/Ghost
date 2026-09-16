import EmailAnalyticsAutomationFetchLatestJob from '../../../../../core/server/services/email-analytics/jobs/email-analytics-automation-fetch-latest-job';
import sinon from 'sinon';
import EmailAnalyticsFetchLatestJob from '../../../../../core/server/services/email-analytics/jobs/email-analytics-fetch-latest-job';
import { vi } from 'vitest';
import { deferred } from '../../../../utils/deferred';
import { EmailAnalyticsJobScheduler } from '../../../../../core/server/services/email-analytics/jobs/email-analytics-job-scheduler';

function buildNewsletterQuery(emailCount: string | number = 1) {
  const query = {
    where: sinon.stub(),
    count: sinon.stub().resolves(emailCount),
  };
  query.where.returns(query);

  return query;
}

function buildAutomationsQuery(automatedEmailRecipient: unknown = null) {
  const query = {
    where: sinon.stub(),
    whereNotNull: sinon.stub(),
    first: sinon.stub().resolves(automatedEmailRecipient),
  };
  query.where.returns(query);
  query.whereNotNull.returns(query);

  return query;
}

function buildScheduler({
  emailAnalyticsEnabled = true,
  backgroundJobEnabled = true,
  emailCount = 1,
  automatedEmailRecipient = null,
  giftDelivery = null,
}: {
  emailAnalyticsEnabled?: boolean;
  backgroundJobEnabled?: boolean;
  emailCount?: string | number;
  automatedEmailRecipient?: unknown;
  giftDelivery?: unknown;
} = {}) {
  const newsletterQuery = buildNewsletterQuery(emailCount);
  const automationsQuery = buildAutomationsQuery(automatedEmailRecipient);
  const giftQuery = buildAutomationsQuery(giftDelivery);
  const models = {
    Email: {
      where: newsletterQuery.where,
    },
    AutomatedEmailRecipient: {
      query: sinon.stub().returns(automationsQuery),
    },
    GiftDelivery: {
      query: sinon.stub().returns(giftQuery),
    },
  };
  const config = {
    get: sinon.stub(),
  };
  config.get.withArgs('emailAnalytics:enabled').returns(emailAnalyticsEnabled);
  config.get.withArgs('backgroundJobs:emailAnalytics').returns(backgroundJobEnabled);

  const jobManager = {
    addJob: sinon.stub(),
  };

  const jobsService = { scheduleRecurring: sinon.stub().resolves() };

  return {
    jobsService,
    scheduler: new EmailAnalyticsJobScheduler({
      models,
      config,
      jobManager,
      jobsService,
    }),
    config,
    jobManager,
    newsletterQuery,
    automationsQuery,
    giftQuery,
    models,
  };
}

describe('EmailAnalyticsJobScheduler', function () {
  beforeEach(function () {
    vi.stubEnv('NODE_ENV', 'production');
  });

  afterEach(function () {
    vi.unstubAllEnvs();
    sinon.restore();
  });

  it('suppresses all scheduling in test environments, including bypasses', async function () {
    vi.stubEnv('NODE_ENV', 'testing');
    const { scheduler, jobsService, jobManager, newsletterQuery, automationsQuery, giftQuery } =
      buildScheduler();
    await scheduler.scheduleRecurringNewslettersJob(true);
    await scheduler.scheduleRecurringAutomationsJob(true);
    await scheduler.scheduleRecurringGiftDeliveriesJob(true);
    sinon.assert.notCalled(jobManager.addJob);
    sinon.assert.notCalled(jobsService.scheduleRecurring);
    sinon.assert.notCalled(newsletterQuery.count);
    sinon.assert.notCalled(automationsQuery.first);
    sinon.assert.notCalled(giftQuery.first);
  });

  it('adds a recurring job when conditions are met', async function () {
    sinon.stub(Math, 'random').onFirstCall().returns(0.1).onSecondCall().returns(0.7);

    const { scheduler, jobsService } = buildScheduler({ emailCount: '3' });

    await scheduler.scheduleRecurringNewslettersJob();

    sinon.assert.calledOnceWithExactly(
      jobsService.scheduleRecurring,
      new EmailAnalyticsFetchLatestJob(),
      { cron: '6 3/5 * * * *' },
    );
  });

  it('does not add a job when config options are disabled', async function () {
    for (const options of [
      { emailAnalyticsEnabled: false, backgroundJobEnabled: true },
      { emailAnalyticsEnabled: true, backgroundJobEnabled: false },
      { emailAnalyticsEnabled: false, backgroundJobEnabled: false },
    ]) {
      const { scheduler, jobsService, jobManager, newsletterQuery, automationsQuery, models } =
        buildScheduler(options);

      await scheduler.scheduleRecurringNewslettersJob();
      await scheduler.scheduleRecurringAutomationsJob();

      sinon.assert.notCalled(jobManager.addJob);
      sinon.assert.notCalled(jobsService.scheduleRecurring);
      sinon.assert.notCalled(newsletterQuery.count);
      sinon.assert.notCalled(models.AutomatedEmailRecipient.query);
      sinon.assert.notCalled(automationsQuery.first);
    }
  });

  it('does not add another job when called twice', async function () {
    const { scheduler, jobsService, newsletterQuery } = buildScheduler();

    await scheduler.scheduleRecurringNewslettersJob();
    await scheduler.scheduleRecurringNewslettersJob();

    sinon.assert.calledOnce(jobsService.scheduleRecurring);
    sinon.assert.calledOnce(newsletterQuery.count);
  });

  it('does not add another newsletter job when called concurrently', async function () {
    const { scheduler, jobsService, newsletterQuery } = buildScheduler();
    const emailCount = deferred();
    newsletterQuery.count.returns(emailCount.promise.then(() => 1));

    const firstSchedule = scheduler.scheduleRecurringNewslettersJob();
    sinon.assert.calledOnce(newsletterQuery.count);

    const secondSchedule = scheduler.scheduleRecurringNewslettersJob(true);
    emailCount.done();

    await Promise.all([firstSchedule, secondSchedule]);

    sinon.assert.calledOnce(jobsService.scheduleRecurring);
    sinon.assert.calledOnce(newsletterQuery.count);
  });

  it('does not add another automation job when called twice', async function () {
    const { scheduler, jobsService, automationsQuery } = buildScheduler({
      emailCount: 0,
      automatedEmailRecipient: { id: 'recipient-id' },
    });

    await scheduler.scheduleRecurringAutomationsJob();
    await scheduler.scheduleRecurringAutomationsJob();

    sinon.assert.calledOnce(jobsService.scheduleRecurring);
    sinon.assert.calledOnce(automationsQuery.first);
  });

  it('does not add another automation job when called concurrently', async function () {
    const { scheduler, jobsService, automationsQuery } = buildScheduler({
      emailCount: 0,
    });
    const automatedEmailRecipient = deferred();
    automationsQuery.first.returns(
      automatedEmailRecipient.promise.then(() => ({ id: 'recipient-id' })),
    );

    const firstSchedule = scheduler.scheduleRecurringAutomationsJob();
    const secondSchedule = scheduler.scheduleRecurringAutomationsJob();

    sinon.assert.calledTwice(automationsQuery.first);
    automatedEmailRecipient.done();

    await Promise.all([firstSchedule, secondSchedule]);

    sinon.assert.calledTwice(jobsService.scheduleRecurring);
  });

  it('does not add a job when no emails are found', async function () {
    const { scheduler, jobsService, newsletterQuery } = buildScheduler({ emailCount: 0 });

    await scheduler.scheduleRecurringNewslettersJob();

    sinon.assert.notCalled(jobsService.scheduleRecurring);
    sinon.assert.calledOnce(newsletterQuery.count);
  });

  it('can add a job later when emails are found', async function () {
    const { scheduler, jobsService, newsletterQuery } = buildScheduler();
    newsletterQuery.count.onFirstCall().resolves(0);
    newsletterQuery.count.onSecondCall().resolves(1);

    await scheduler.scheduleRecurringNewslettersJob();
    await scheduler.scheduleRecurringNewslettersJob();

    sinon.assert.calledOnce(jobsService.scheduleRecurring);
    sinon.assert.calledTwice(newsletterQuery.count);
  });

  it('can skip the email lookup', async function () {
    const { scheduler, jobsService, newsletterQuery } = buildScheduler({ emailCount: 0 });

    await scheduler.scheduleRecurringNewslettersJob(true);

    sinon.assert.calledOnce(jobsService.scheduleRecurring);
    sinon.assert.notCalled(newsletterQuery.where);
    sinon.assert.notCalled(newsletterQuery.count);
  });

  it('adds an automation job when recipients exist', async function () {
    sinon.stub(Math, 'random').onFirstCall().returns(0.2).onSecondCall().returns(0.8);

    const { scheduler, jobsService, automationsQuery, models } = buildScheduler({
      emailCount: 0,
      automatedEmailRecipient: { id: 'recipient-id' },
    });

    await scheduler.scheduleRecurringAutomationsJob();

    sinon.assert.calledOnceWithExactly(
      jobsService.scheduleRecurring,
      new EmailAnalyticsAutomationFetchLatestJob(),
      { cron: '12 4/5 * * * *' },
    );
    sinon.assert.calledOnce(models.AutomatedEmailRecipient.query);
    sinon.assert.calledOnceWithExactly(automationsQuery.where, 'created_at', '>', sinon.match.date);
    sinon.assert.calledOnceWithExactly(automationsQuery.whereNotNull, 'mailgun_message_id');
    sinon.assert.calledOnceWithExactly(automationsQuery.first, 'id');
  });

  it('can skip the automation email recipient lookup', async function () {
    const { scheduler, jobsService, automationsQuery } = buildScheduler({
      emailCount: 0,
      automatedEmailRecipient: null,
    });

    await scheduler.scheduleRecurringAutomationsJob(true);

    sinon.assert.calledOnceWithMatch(
      jobsService.scheduleRecurring,
      sinon.match.instanceOf(EmailAnalyticsAutomationFetchLatestJob),
    );
    sinon.assert.notCalled(automationsQuery.first);
  });

  it('adds both newsletter and automation jobs when conditions are met', async function () {
    const { scheduler, jobsService, jobManager } = buildScheduler({
      emailCount: 1,
      automatedEmailRecipient: { id: 'recipient-id' },
    });

    await scheduler.scheduleRecurringNewslettersJob();
    await scheduler.scheduleRecurringAutomationsJob();

    sinon.assert.notCalled(jobManager.addJob);
    sinon.assert.calledTwice(jobsService.scheduleRecurring);
    sinon.assert.calledWithMatch(
      jobsService.scheduleRecurring,
      sinon.match.instanceOf(EmailAnalyticsFetchLatestJob),
    );
    sinon.assert.calledWithMatch(
      jobsService.scheduleRecurring,
      sinon.match.instanceOf(EmailAnalyticsAutomationFetchLatestJob),
    );
  });

  it('does not add an automation job when no automation recipients are found', async function () {
    const { scheduler, jobsService, automationsQuery } = buildScheduler({
      emailCount: 0,
      automatedEmailRecipient: null,
    });

    await scheduler.scheduleRecurringAutomationsJob();

    sinon.assert.notCalled(jobsService.scheduleRecurring);
    sinon.assert.calledOnce(automationsQuery.first);
  });

  it('adds the existing recurring analytics collector for accepted gift email telemetry', async function () {
    const { scheduler, jobManager, giftQuery, models } = buildScheduler({
      emailCount: 0,
      giftDelivery: { id: 'gift-id' },
    });

    await scheduler.scheduleRecurringGiftDeliveriesJob();

    sinon.assert.calledOnceWithMatch(jobManager.addJob, {
      job: sinon.match(
        (value: unknown) =>
          typeof value === 'string' && value.endsWith('gift-fetch-latest/index.js'),
      ),
      name: 'email-analytics-gift-fetch-latest',
    });
    sinon.assert.calledOnce(models.GiftDelivery.query);
    sinon.assert.calledOnceWithExactly(giftQuery.where, 'email_sent_at', '>', sinon.match.date);
    sinon.assert.calledOnceWithExactly(giftQuery.whereNotNull, 'email_provider_message_id');
    sinon.assert.calledOnceWithExactly(giftQuery.first, 'id');
  });
});
