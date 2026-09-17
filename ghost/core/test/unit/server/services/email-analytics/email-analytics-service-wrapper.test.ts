import assert from 'node:assert/strict';
import sinon from 'sinon';
import logging from '@tryghost/logging';
import { EmailAnalyticsServiceWrapper } from '../../../../../core/server/services/email-analytics/email-analytics-service-wrapper';
import type { EmailAnalyticsFetchResult } from '../../../../../core/server/services/email-analytics/email-analytics-service';
import { EventProcessingResult } from '../../../../../core/server/services/email-analytics/event-processing-result';
import { Queries } from '../../../../../core/server/services/email-analytics/lib/queries';

const jobTypes = {
  newsletters: 'email-analytics-fetch-latest',
  automations: 'email-analytics-automation-fetch-latest',
  gifts: 'email-analytics-gift-fetch-latest',
};

describe('EmailAnalyticsServiceWrapper', function () {
  let metricStub: sinon.SinonStub;

  beforeEach(function () {
    metricStub = sinon.stub();
  });

  afterEach(async function () {
    sinon.restore();
  });

  function initWrapper(
    logName: keyof typeof jobTypes,
    configOverrides: Record<string, unknown> = {},
  ) {
    const wrapper = new EmailAnalyticsServiceWrapper({
      logName,
      jobType: jobTypes[logName],
      config: {
        get: (key?: string) => (key ? configOverrides[key] : undefined),
      },
      queries: sinon.createStubInstance(Queries),
      mailgunTags: [],
      jobNames: {
        latestNonOpened: 'email-analytics-latest-others',
        missing: 'email-analytics-missing',
        latestOpened: 'email-analytics-latest-opened',
        scheduled: 'email-analytics-scheduled',
      },
      cursorSeed: {
        tableName: 'email_recipients',
        eventColumns: {
          delivered: 'delivered_at',
          opened: 'opened_at',
          failed: 'failed_at',
        },
      },
      settingsCache: {
        get: sinon.stub(),
      },
      createEventProcessor: sinon.stub().returns({
        process: sinon.stub().resolves(),
      }),
      metrics: {
        metric: metricStub,
      },
    });
    return wrapper;
  }

  function createFetchResult(overrides: Partial<EmailAnalyticsFetchResult> = {}) {
    return {
      eventCount: 10,
      apiPollingTimeMs: 500,
      processingTimeMs: 1000,
      aggregationTimeMs: 500,
      emailAggregationTimeMs: 300,
      memberAggregationTimeMs: 200,
      result: new EventProcessingResult(),
      ...overrides,
    };
  }

  function logLatestOpenedJob(logName: keyof typeof jobTypes) {
    const wrapper = initWrapper(logName, {
      'emailAnalytics:metrics:openThroughput:enabled': true,
      'emailAnalytics:metrics:openThroughput:threshold': 0,
    });
    wrapper._logJobCompletion('latest-opened', createFetchResult(), 2000);

    return wrapper;
  }

  function stubFetch(wrapper: EmailAnalyticsServiceWrapper) {
    sinon.stub(wrapper.service, 'restoreScheduled').resolves();
    return {
      opened: sinon.stub(wrapper, 'fetchLatestOpenedEvents').resolves(0),
      latest: sinon.stub(wrapper, 'fetchLatestNonOpenedEvents').resolves(0),
      missing: sinon.stub(wrapper, 'fetchMissing').resolves(0),
      scheduled: sinon.stub(wrapper, 'fetchScheduled').resolves(0),
    };
  }

  it('skips overlapping fetches while a sibling wrapper makes progress', async function () {
    const first = initWrapper('newsletters');
    const sibling = initWrapper('automations');
    const fetch = stubFetch(first);
    const other = stubFetch(sibling);
    let release!: () => void;
    fetch.opened.returns(
      new Promise<number>((resolve) => {
        release = () => resolve(0);
      }),
    );
    const active = first.startFetch();
    await Promise.resolve();
    await first.startFetch();
    await sibling.startFetch();
    sinon.assert.calledOnce(fetch.opened);
    sinon.assert.calledOnce(other.scheduled);
    sinon.assert.notCalled(fetch.latest);
    release();
    await active;
  });

  it('preserves fetch ordering and budgets', async function () {
    const wrapper = initWrapper('newsletters');
    const fetch = stubFetch(wrapper);
    fetch.opened.resolves(10);
    fetch.latest.resolves(20);
    await wrapper.startFetch();
    sinon.assert.callOrder(fetch.opened, fetch.latest, fetch.missing, fetch.scheduled);
    sinon.assert.calledWithExactly(fetch.latest, { maxEvents: 9990 });
    sinon.assert.calledWithExactly(fetch.missing, { maxEvents: 9970 });
    sinon.assert.calledWithExactly(fetch.scheduled, { maxEvents: 10000 });
  });

  it('swallows ordinary fetch failures and permits the next tick', async function () {
    const wrapper = initWrapper('newsletters');
    const fetch = stubFetch(wrapper);
    fetch.opened.onFirstCall().rejects(new Error('fetch failed'));
    await wrapper.startFetch();
    await wrapper.startFetch();
    sinon.assert.calledTwice(fetch.opened);
    sinon.assert.calledOnce(fetch.scheduled);
  });

  it('completes the returned invocation while its detached continuation is pending', async function () {
    const wrapper = initWrapper('newsletters');
    const fetch = stubFetch(wrapper);
    let release!: () => void;
    fetch.opened.onFirstCall().resolves(10000);
    fetch.opened.onSecondCall().returns(
      new Promise<number>((resolve) => {
        release = () => resolve(0);
      }),
    );
    const finished = new Promise<void>((resolve) => {
      fetch.scheduled.callsFake(async () => {
        resolve();
        return 0;
      });
    });
    await wrapper.startFetch();
    sinon.assert.calledTwice(fetch.opened);
    sinon.assert.notCalled(fetch.latest);
    release();
    await finished;
  });

  it('uses existing open throughput metric name for newsletters', function () {
    logLatestOpenedJob('newsletters');

    sinon.assert.calledOnceWithExactly(metricStub, 'email-analytics-open-throughput', {
      value: 5,
      events: 10,
      duration: 2000,
    });
  });

  it('uses pipeline-specific open throughput metric name for automations', function () {
    logLatestOpenedJob('automations');

    sinon.assert.calledOnceWithExactly(metricStub, 'email-automations-analytics-open-throughput', {
      value: 5,
      events: 10,
      duration: 2000,
    });
  });

  it('uses the gift analytics job name in lifecycle logs', function () {
    const infoLog = sinon.stub(logging, 'info');

    logLatestOpenedJob('gifts');

    sinon.assert.calledWith(
      infoLog,
      sinon.match.object,
      sinon.match('[Background Job] email-analytics-gift-fetch-latest processed'),
    );
  });

  it('tags job completions with the fields the email analytics alert queries', function () {
    const infoLog = sinon.stub(logging, 'info');

    logLatestOpenedJob('newsletters');

    sinon.assert.calledWith(
      infoLog,
      sinon.match({
        system: {
          event: 'job.completed',
          job_type: 'email-analytics-fetch-latest',
          task: 'latest-opened',
          event_count: 10,
        },
      }),
      sinon.match('[Background Job] email-analytics-fetch-latest processed'),
    );
  });

  it('logs and preserves initial schedule restoration failures', async function () {
    const errorLog = sinon.stub(logging, 'error');
    const wrapper = logLatestOpenedJob('newsletters');
    const restoreError = new Error('Restore failed');
    sinon.stub(wrapper.service, 'restoreScheduled').rejects(restoreError);

    await assert.rejects(wrapper.startFetch(), (error) => error === restoreError);

    sinon.assert.calledOnceWithExactly(
      errorLog,
      restoreError,
      sinon.match(
        '[Background Job] email-analytics-fetch-latest failed while restoring scheduled events',
      ),
    );
  });

  it('logs exactly one terminal event with a run duration', async function () {
    const infoLog = sinon.stub(logging, 'info');
    const wrapper = logLatestOpenedJob('newsletters');
    infoLog.resetHistory();
    sinon.stub(wrapper.service, 'restoreScheduled').resolves();
    sinon.stub(wrapper, 'fetchLatestOpenedEvents').resolves(1);
    sinon.stub(wrapper, 'fetchLatestNonOpenedEvents').resolves(0);
    sinon.stub(wrapper, 'fetchMissing').resolves(0);
    sinon.stub(wrapper, 'fetchScheduled').resolves(0);

    await wrapper.startFetch();

    const completions = infoLog.args.filter(
      ([, message]) =>
        typeof message === 'string' &&
        message.startsWith('[Background Job] email-analytics-fetch-latest completed'),
    );
    assert.equal(completions.length, 1);
    assert.match(
      completions[0][1] as string,
      /^\[Background Job\] email-analytics-fetch-latest completed in \d+ms with 1 events \| \[EmailAnalytics:newsletters\]$/,
    );
    sinon.assert.calledWithExactly(
      infoLog,
      {
        system: {
          event: 'email_analytics_fetch_latest.completed',
          event_count: 1,
          duration_ms: sinon.match.number,
        },
      },
      sinon.match.string,
    );
  });

  function jobCompletionLogs(infoLog: sinon.SinonStub) {
    return infoLog.args.filter(
      ([payload]) =>
        (payload as { system?: { event?: string } })?.system?.event === 'job.completed',
    );
  }

  it('includes the pipeline lag in job completion logs', function () {
    const infoLog = sinon.stub(logging, 'info');
    const wrapper = initWrapper('newsletters');

    wrapper._logJobCompletion('latest', createFetchResult(), 2000, 330);

    sinon.assert.calledWith(
      infoLog,
      sinon.match({
        system: sinon.match({ event: 'job.completed', task: 'latest', lag_seconds: 330 }),
      }),
      sinon.match(' | Lag: 5.5m | '),
    );
  });

  it('leaves lag out of job completion logs when it is not known', function () {
    const infoLog = sinon.stub(logging, 'info');

    logLatestOpenedJob('newsletters');

    const [payload, message] = jobCompletionLogs(infoLog)[0];
    assert.equal('lag_seconds' in payload.system, false);
    assert.doesNotMatch(message, /Lag:/);
  });

  it('logs the opened and delivery pipelines with the lag measured after their fetch', async function () {
    const infoLog = sinon.stub(logging, 'info');
    const wrapper = initWrapper('newsletters');
    const fetchResult = createFetchResult({ eventCount: 1 });
    const fetchStubs = [
      sinon.stub(wrapper.service, 'fetchLatestOpenedEvents').resolves(fetchResult),
      sinon.stub(wrapper.service, 'fetchLatestNonOpenedEvents').resolves(fetchResult),
      sinon.stub(wrapper.service, 'fetchMissing').resolves(fetchResult),
    ];
    const pipeline = (jobName: string, lagSeconds: number) => ({
      running: false,
      jobName,
      fetchedThrough: null,
      lagSeconds,
    });
    const statusStub = sinon.stub(wrapper.service, 'getStatus').returns({
      latestOpened: pipeline('email-analytics-latest-opened', 60),
      latest: pipeline('email-analytics-latest-others', 120),
      missing: pipeline('email-analytics-missing', 1800),
      scheduled: { running: false, jobName: 'email-analytics-scheduled' },
    });

    await wrapper.fetchLatestOpenedEvents();
    await wrapper.fetchLatestNonOpenedEvents();
    await wrapper.fetchMissing();

    const completions = jobCompletionLogs(infoLog).map(([payload]) => [
      payload.system.task,
      payload.system.lag_seconds,
    ]);
    // The missing-events sweep trails the delivery pipeline by design, so its lag is not logged
    assert.deepEqual(completions, [
      ['latest-opened', 60],
      ['latest', 120],
      ['missing', undefined],
    ]);
    // Read after each fetch, so a clean run counts as caught up
    sinon.assert.calledTwice(statusStub);
    assert.ok(statusStub.firstCall.calledAfter(fetchStubs[0].firstCall));
    assert.ok(statusStub.secondCall.calledAfter(fetchStubs[1].firstCall));
  });

  it('skips opened event polling when the cursor seed has no opened column', async function () {
    const wrapper = new EmailAnalyticsServiceWrapper({
      logName: 'gifts',
      jobType: jobTypes.gifts,
      config: { get: sinon.stub() },
      queries: sinon.createStubInstance(Queries),
      mailgunTags: [],
      jobNames: {
        latestNonOpened: 'email-analytics-gifts-latest-others',
        missing: 'email-analytics-gifts-missing',
        latestOpened: 'email-analytics-gifts-latest-opened',
        scheduled: 'email-analytics-gifts-scheduled',
      },
      cursorSeed: {
        tableName: 'gift_deliveries',
        eventColumns: {
          delivered: 'outcome_at',
          failed: 'outcome_at',
        },
      },
      settingsCache: { get: sinon.stub() },
      createEventProcessor: sinon.stub().returns({
        processBatch: sinon.stub().resolves(),
      }),
      metrics: { metric: metricStub },
    });

    sinon.stub(wrapper.service, 'restoreScheduled').resolves();
    const fetchLatestOpenedEvents = sinon.stub(wrapper, 'fetchLatestOpenedEvents').resolves(0);
    sinon.stub(wrapper, 'fetchLatestNonOpenedEvents').resolves(0);
    sinon.stub(wrapper, 'fetchMissing').resolves(0);
    sinon.stub(wrapper, 'fetchScheduled').resolves(0);

    await wrapper.startFetch();

    sinon.assert.notCalled(fetchLatestOpenedEvents);
  });
});
