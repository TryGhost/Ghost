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
  const ingest = sinon.stub().resolves();

  beforeEach(async () => {
    vi.resetModules();
    wrappers.length = 0;
    subscribers.clear();
    fetch.resetHistory();
    ingest.resetHistory();
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
      config: { get: sinon.stub() },
      db: { knex: createKnex({ client: 'mysql2' }) },
      metrics: { metric: sinon.stub() },
      settingsCache: { get: sinon.stub() },
      domainEvents: {
        subscribe: (event, handler) => {
          subscribers.set(event.name, handler);
        },
      },
      provider: { getEventSource: () => ({ type: 'poll', fetch }) },
      eventService: { ingest },
    };
  });
  afterEach(async () => {
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
  it('passes the family to polling and processes events before advancing', async () => {
    analytics.init(deps);
    const options = wrappers[1].options;
    const request = {
      begin: new Date(),
      end: new Date(),
      maxEvents: 10,
      batchHandler: sinon.stub(),
    };
    await options.fetchEvents!(request);
    sinon.assert.calledWithMatch(fetch, { ...request, family: 'automations' });
    const event = { timestamp: new Date() };
    const result = new (
      await import('../../../../../core/server/services/email-analytics/event-processing-result')
    ).EventProcessingResult();
    await options.createEventProcessor().processBatch([event], result, {});
    sinon.assert.calledWithExactly(ingest, [event], 'automations');
  });
  it('does not poll a webhook provider', async () => {
    deps.provider = { getEventSource: () => ({ type: 'webhook', verify: sinon.stub() }) };
    analytics.init(deps);
    for (const wrapper of wrappers) {
      assert.equal(wrapper.options.polling, false);
    }
  });

  it('does not advance the polling timestamp when processing fails', async () => {
    analytics.init(deps);
    const event = { timestamp: new Date() };
    const result = new (
      await import('../../../../../core/server/services/email-analytics/event-processing-result')
    ).EventProcessingResult();
    const fetchData = {};
    const error = new Error('Database unavailable');
    ingest.rejects(error);
    try {
      await assert.rejects(
        wrappers[0].options.createEventProcessor().processBatch([event], result, fetchData),
        error,
      );
      assert.deepEqual(fetchData, {});
    } finally {
      ingest.resolves();
    }
  });
});
