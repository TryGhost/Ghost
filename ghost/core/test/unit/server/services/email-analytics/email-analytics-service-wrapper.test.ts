import assert from 'node:assert/strict';
import sinon from 'sinon';
import logging from '@tryghost/logging';
import { EmailAnalyticsServiceWrapper } from '../../../../../core/server/services/email-analytics/email-analytics-service-wrapper';
import { EventProcessingResult } from '../../../../../core/server/services/email-analytics/event-processing-result';
import { Queries } from '../../../../../core/server/services/email-analytics/lib/queries';

class FakeEvent {
  timestamp = new Date();
  data = null;
}

describe('EmailAnalyticsServiceWrapper', function () {
  let metricStub: sinon.SinonStub;

  beforeEach(function () {
    metricStub = sinon.stub();
  });

  afterEach(async function () {
    sinon.restore();
  });

  function initWrapper(logName: string, configOverrides: Record<string, unknown> = {}) {
    const wrapper = new EmailAnalyticsServiceWrapper({ logName });
    wrapper.init({
      config: {
        get: (key) => configOverrides[key],
      },
      domainEvents: {
        subscribe: sinon.stub(),
      },
      event: FakeEvent,
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

  function logLatestOpenedJob(logName: string) {
    const wrapper = initWrapper(logName, {
      'emailAnalytics:metrics:openThroughput:enabled': true,
      'emailAnalytics:metrics:openThroughput:threshold': 0,
    });
    wrapper._logJobCompletion(
      'latest-opened',
      {
        eventCount: 10,
        apiPollingTimeMs: 500,
        processingTimeMs: 1000,
        aggregationTimeMs: 500,
        emailAggregationTimeMs: 300,
        memberAggregationTimeMs: 200,
        result: new EventProcessingResult(),
      },
      2000,
    );

    return wrapper;
  }

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
      ([message]) =>
        typeof message === 'string' &&
        message.startsWith('[Background Job] email-analytics-fetch-latest completed'),
    );
    assert.equal(completions.length, 1);
    assert.match(
      completions[0][0] as string,
      /^\[Background Job\] email-analytics-fetch-latest completed in \d+ms with 1 events /,
    );
  });

  function createLagWrapper(configOverrides: Record<string, unknown> = {}) {
    sinon.useFakeTimers(new Date(2026, 0, 1));
    const wrapper = initWrapper('newsletters', {
      'emailAnalytics:openedJobLagWarningMinutes': 30,
      ...configOverrides,
    });

    const lagStub = sinon.stub(wrapper.service, 'getOpenedEventsLagMinutes').resolves(null);
    sinon.stub(wrapper.service, 'fetchLatestOpenedEvents').resolves({
      eventCount: 0,
      apiPollingTimeMs: 0,
      processingTimeMs: 0,
      aggregationTimeMs: 0,
      emailAggregationTimeMs: 0,
      memberAggregationTimeMs: 0,
      result: new EventProcessingResult(),
    });

    return {
      wrapper,
      setLagMinutes(minutes: number) {
        lagStub.resolves(minutes);
      },
    };
  }

  it('warns with structured lag fields while opened event processing is behind', async function () {
    const warnLog = sinon.stub(logging, 'warn');
    const { wrapper, setLagMinutes } = createLagWrapper();
    setLagMinutes(45);

    await wrapper.fetchLatestOpenedEvents();

    sinon.assert.calledOnceWithExactly(
      warnLog,
      sinon.match({
        system: sinon.match({
          event: 'analytics.lagging',
          job_type: 'email-analytics-fetch-latest',
          task: 'latest-opened',
          lag_minutes: 45,
          lag_threshold_minutes: 30,
        }),
      }),
      sinon.match('Opened events processing is 45.0 minutes behind (threshold: 30)'),
    );
  });

  it('logs a caught-up event with peak lag once processing recovers', async function () {
    sinon.stub(logging, 'warn');
    const infoLog = sinon.stub(logging, 'info');
    const { wrapper, setLagMinutes } = createLagWrapper();

    setLagMinutes(45);
    await wrapper.fetchLatestOpenedEvents();
    setLagMinutes(60);
    await wrapper.fetchLatestOpenedEvents();
    setLagMinutes(5);
    await wrapper.fetchLatestOpenedEvents();

    sinon.assert.calledWith(
      infoLog,
      sinon.match({
        system: sinon.match({
          event: 'analytics.caught_up',
          job_type: 'email-analytics-fetch-latest',
          task: 'latest-opened',
          lag_minutes: 5,
          peak_lag_minutes: 60,
        }),
      }),
      sinon.match('Opened events processing caught up after'),
    );

    // A later recovery cycle must not log caught-up again
    infoLog.resetHistory();
    setLagMinutes(5);
    await wrapper.fetchLatestOpenedEvents();
    const caughtUpLogs = infoLog.args.filter(
      ([payload]) =>
        (payload as { system?: { event?: string } })?.system?.event === 'analytics.caught_up',
    );
    assert.equal(caughtUpLogs.length, 0);
  });

  it('emits an opened lag metric every cycle when enabled', async function () {
    sinon.stub(logging, 'warn');
    const { wrapper, setLagMinutes } = createLagWrapper({
      'emailAnalytics:metrics:openedLag:enabled': true,
    });

    setLagMinutes(45);
    await wrapper.fetchLatestOpenedEvents();
    setLagMinutes(5);
    await wrapper.fetchLatestOpenedEvents();

    const lagMetrics = metricStub.args.filter(([name]) => name === 'email-analytics-opened-lag');
    assert.equal(lagMetrics.length, 2);
    assert.equal(lagMetrics[0][1].value, 45);
    assert.equal(lagMetrics[1][1].value, 5);
  });

  it('emits the lag metric but does not warn when the warning threshold is unset', async function () {
    const warnLog = sinon.stub(logging, 'warn');
    const { wrapper, setLagMinutes } = createLagWrapper({
      'emailAnalytics:openedJobLagWarningMinutes': undefined,
      'emailAnalytics:metrics:openedLag:enabled': true,
    });
    setLagMinutes(500);

    await wrapper.fetchLatestOpenedEvents();

    sinon.assert.notCalled(warnLog);
    sinon.assert.calledOnceWithExactly(metricStub, 'email-analytics-opened-lag', { value: 500 });
  });

  it('skips lag reporting entirely when there is no cursor yet', async function () {
    const warnLog = sinon.stub(logging, 'warn');
    const { wrapper } = createLagWrapper({
      'emailAnalytics:metrics:openedLag:enabled': true,
    });

    await wrapper.fetchLatestOpenedEvents();

    sinon.assert.notCalled(warnLog);
    sinon.assert.notCalled(metricStub);
  });

  it('skips opened event polling when the cursor seed has no opened column', async function () {
    const wrapper = new EmailAnalyticsServiceWrapper({ logName: 'gifts' });
    wrapper.init({
      config: { get: sinon.stub() },
      domainEvents: { subscribe: sinon.stub() },
      event: FakeEvent,
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
