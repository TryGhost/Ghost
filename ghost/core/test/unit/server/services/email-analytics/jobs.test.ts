import EmailAnalyticsGiftFetchLatestJob from '../../../../../core/server/services/email-analytics/jobs/email-analytics-gift-fetch-latest-job';
import assert from 'node:assert/strict';
import sinon from 'sinon';
import { vi } from 'vitest';
import EmailAnalyticsAutomationFetchLatestJob from '../../../../../core/server/services/email-analytics/jobs/email-analytics-automation-fetch-latest-job';
import EmailAnalyticsFetchLatestJob from '../../../../../core/server/services/email-analytics/jobs/email-analytics-fetch-latest-job';
import { EmailAnalyticsJobScheduler } from '../../../../../core/server/services/email-analytics/jobs/email-analytics-job-scheduler';
import { JobsService } from '../../../../../core/server/services/jobs-service/jobs-service';
import InMemoryJobsBackend from '../../../../../core/server/adapters/jobs/InMemoryJobsBackend';

const registerJobHandlers =
  require('../../../../../core/server/services/jobs-service/register-job-handlers').default;

const pipelines = [
  {
    JobClass: EmailAnalyticsGiftFetchLatestJob,
    type: 'email-analytics-gift-fetch-latest',
    wrapperName: 'gifts',
    schedule: 'scheduleRecurringGiftDeliveriesJob',
  },
  {
    JobClass: EmailAnalyticsAutomationFetchLatestJob,
    type: 'email-analytics-automation-fetch-latest',
    wrapperName: 'automations',
    schedule: 'scheduleRecurringAutomationsJob',
  },
  {
    JobClass: EmailAnalyticsFetchLatestJob,
    type: 'email-analytics-fetch-latest',
    wrapperName: 'newsletters',
    schedule: 'scheduleRecurringNewslettersJob',
  },
] as const;

describe.each(pipelines)('$type migration', function ({ JobClass, type, wrapperName, schedule }) {
  afterEach(function () {
    sinon.restore();
  });

  it('serializes only an empty payload and reconstructs the exact job type', function () {
    assert.equal(JobClass.type, type);
    const payload = JSON.parse(JSON.stringify(new JobClass()));
    assert.deepEqual(payload, {});
    const ReconstructedJob = JobClass as new (data: unknown) => object;
    assert.deepEqual(new ReconstructedJob(payload), new JobClass());
  });

  it('registers one handler in its own two-slot queue and awaits its injected executor', async function () {
    const jobsService = { handle: sinon.stub() };
    let release!: () => void;
    const newsletters = {
      startFetch: sinon.stub().returns(
        new Promise<void>((resolve) => {
          release = resolve;
        }),
      ),
    };
    registerJobHandlers({ jobsService, [wrapperName]: newsletters });
    const calls = jobsService.handle
      .getCalls()
      .filter((call) => call.args[0].type === JobClass.type);
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].args[2], {
      queue: JobClass.type,
      concurrency: 2,
    });
    let completed = false;
    const invocation = calls[0].args[1](new JobClass()).then(() => {
      completed = true;
    });
    await Promise.resolve();
    assert.equal(completed, false);
    release();
    await invocation;
    sinon.assert.calledOnceWithExactly(newsletters.startFetch);
    newsletters.startFetch.rejects(new Error('restoration failed'));
    await assert.rejects(calls[0].args[1](new JobClass()), /restoration failed/);
  });

  it('admits an overlapping tick while a sibling queue progresses', async function () {
    const backend = new InMemoryJobsBackend();
    const jobsService = new JobsService({ backend, logging: { info() {}, error() {} } });
    const siblingPipeline = pipelines.find((pipeline) => pipeline.wrapperName !== wrapperName)!;
    let release!: () => void;
    const wrapper = {
      startFetch: sinon.stub().returns(
        new Promise<void>((resolve) => {
          release = resolve;
        }),
      ),
    };
    const sibling = { startFetch: sinon.stub().resolves() };
    registerJobHandlers({
      jobsService,
      [wrapperName]: wrapper,
      [siblingPipeline.wrapperName]: sibling,
    });
    await jobsService.start();
    try {
      await jobsService.dispatch(new JobClass());
      await jobsService.dispatch(new JobClass());
      await jobsService.dispatch(new siblingPipeline.JobClass());
      await vi.waitFor(() => {
        sinon.assert.calledTwice(wrapper.startFetch);
        sinon.assert.calledOnce(sibling.startFetch);
      });
    } finally {
      release();
      await jobsService.shutdown();
    }
  });

  it('leaves registration retryable after rejection', async function () {
    const jobsService = {
      scheduleRecurring: sinon.stub().onFirstCall().rejects(new Error('unavailable')),
    };
    jobsService.scheduleRecurring.onSecondCall().resolves();
    const scheduler = new EmailAnalyticsJobScheduler({
      config: { get: () => true },
      models: {
        Email: { where: sinon.stub() },
        AutomatedEmailRecipient: { query: sinon.stub() },
        GiftDelivery: { query: sinon.stub() },
      },
      jobsService,
    });
    await assert.rejects(scheduler[schedule](true), /unavailable/);
    await scheduler[schedule](true);
    await scheduler[schedule](true);
    sinon.assert.calledTwice(jobsService.scheduleRecurring);
  });

  it('lets the real backend deduplicate concurrent recurring registration without fetching immediately', async function () {
    const backend = new InMemoryJobsBackend();
    const enqueue = sinon.spy(backend, 'enqueue');
    const jobsService = new JobsService({ backend, logging: { info() {}, error() {} } });
    const newsletters = { startFetch: sinon.stub().resolves() };
    registerJobHandlers({ jobsService, [wrapperName]: newsletters });
    const scheduler = new EmailAnalyticsJobScheduler({
      config: { get: () => true },
      models: {
        Email: { where: sinon.stub() },
        AutomatedEmailRecipient: { query: sinon.stub() },
        GiftDelivery: { query: sinon.stub() },
      },
      jobsService,
    });
    const clock = sinon.useFakeTimers({ now: new Date('2026-01-01T00:00:00Z') });
    sinon.stub(Math, 'random').returns(0);
    await jobsService.start();
    try {
      await Promise.all([scheduler[schedule](true), scheduler[schedule](true)]);
      sinon.assert.notCalled(newsletters.startFetch);
      await clock.tickAsync(300000);
      sinon.assert.calledOnce(newsletters.startFetch);
      sinon.assert.calledOnce(enqueue);
    } finally {
      clock.restore();
      await jobsService.shutdown();
    }
  });
});
