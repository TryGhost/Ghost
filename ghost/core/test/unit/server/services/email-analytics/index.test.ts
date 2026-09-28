import assert from 'node:assert/strict';
import sinon from 'sinon';
import createKnex from 'knex';
import { vi } from 'vitest';
import type { EmailAnalyticsServiceWrapper } from '../../../../../core/server/services/email-analytics/email-analytics-service-wrapper';

type Options = ConstructorParameters<typeof EmailAnalyticsServiceWrapper>[0];
type Analytics = typeof import('../../../../../core/server/services/email-analytics');

describe('email analytics provider wiring', () => {
  let analytics: Analytics;
  let deps: Parameters<Analytics['init']>[0];
  const wrappers: { options: Options; startFetch: sinon.SinonStub }[] = [];
  const subscribers = new Map<string, () => Promise<void>>();
  const fetch = sinon.stub().resolves();

  beforeEach(async () => {
    vi.resetModules();
    wrappers.length = 0;
    subscribers.clear();
    fetch.reset();
    fetch.resolves();

    vi.doMock(
      '../../../../../core/server/services/email-analytics/email-analytics-service-wrapper',
      () => ({
        EmailAnalyticsServiceWrapper: function (options: Options) {
          const wrapper = { options, startFetch: sinon.stub().resolves() };
          wrappers.push(wrapper);
          return wrapper;
        },
      }),
    );
    analytics = await import('../../../../../core/server/services/email-analytics');
    deps = {
      automationsApi: {
        getAutomatedEmailRecipientsByMailgunIds: sinon.stub().resolves([]),
        trackEmailDeliveredAndOpened: sinon.stub().resolves(),
      },
      giftDeliveryService: {
        recordOutcome: sinon.stub().resolves('recorded'),
      },
      emailSuppressionList: {
        removeComplaint: sinon.stub(),
        removeUnsubscribe: sinon.stub(),
      },
      membersRepository: {
        get: sinon.stub(),
        update: sinon.stub(),
      },
      models: { Email: {}, EmailRecipientFailure: {}, EmailSpamComplaintEvent: {} },
      prometheusClient: null,
      config: { get: sinon.stub() },
      db: { knex: createKnex({ client: 'mysql2' }) },
      metrics: { metric: sinon.stub() },
      domainEvents: {
        subscribe: (event: { name: string }, handler: () => Promise<void>) => {
          subscribers.set(event.name, handler);
        },
      },
      provider: { source: 'test', getEventSource: () => ({ type: 'poll', fetch }) },
    } as Parameters<Analytics['init']>[0];
  });
  afterEach(async () => {
    sinon.restore();
    await deps.db.knex.destroy();
    vi.doUnmock(
      '../../../../../core/server/services/email-analytics/email-analytics-service-wrapper',
    );
    vi.resetModules();
  });
  it('guards use before boot and initializes each family once', () => {
    assert.throws(() => analytics.getNewsletters(), /initialized/);
    analytics.init(deps);
    analytics.init(deps);
    assert.equal(wrappers.length, 3);
    assert.equal(analytics.getNewsletters(), wrappers[0]);
    assert.equal(analytics.getAutomations(), wrappers[1]);
    assert.equal(analytics.getGifts(), wrappers[2]);
    assert.equal(wrappers[0].options.jobNames.latestOpened, 'email-analytics-latest-opened');
  });
  it('starts the configured provider for all three workflows', async () => {
    analytics.init(deps);
    assert.equal(wrappers.length, 3);
    for (const handler of subscribers.values()) {
      await handler();
    }
    for (const wrapper of wrappers) {
      sinon.assert.calledOnce(wrapper.startFetch);
    }
  });
  it('passes the family to polling', async () => {
    analytics.init(deps);
    const request = {
      begin: new Date(),
      end: new Date(),
      maxEvents: 10,
      batchHandler: sinon.stub(),
    };
    await wrappers[1].options.fetchEvents(request);
    sinon.assert.calledWithMatch(fetch, { family: 'automations', begin: request.begin });
  });
  it('registers Prometheus metrics for member stat aggregation', () => {
    const registerCounter = sinon.stub();
    analytics.init({
      ...deps,
      prometheusClient: {
        registerCounter,
        getMetric: sinon.stub(),
      },
    });
    sinon.assert.calledWith(
      registerCounter,
      sinon.match({
        name: 'email_analytics_aggregate_member_stats_count',
        help: 'Count of member stats aggregations',
      }),
    );
  });
});
