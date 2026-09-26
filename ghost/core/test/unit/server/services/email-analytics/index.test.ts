import assert from 'node:assert/strict';
import sinon from 'sinon';
import createKnex from 'knex';
import logging from '@tryghost/logging';
import { vi } from 'vitest';
import { EmailAnalyticsService } from '../../../../../core/server/services/email-analytics/email-analytics-service';
import { Queries } from '../../../../../core/server/services/email-analytics/lib/queries';
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
        getRecipientEmailForMessage: sinon.stub().resolves(null),
      },
      emailSuppressionList: {
        handleBounce: sinon.stub(),
        handleComplaint: sinon.stub(),
        removeComplaint: sinon.stub(),
        removeUnsubscribe: sinon.stub(),
      },
      membersRepository: {
        get: sinon.stub(),
        update: sinon.stub(),
        unsubscribeFromUpdates: sinon.stub().resolves(),
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
  it('passes the family to polling and processes events before advancing', async () => {
    analytics.init(deps);
    const options = wrappers[1].options;
    const request = {
      begin: new Date(),
      end: new Date(),
      maxEvents: 10,
      batchHandler: sinon.stub(),
    };
    await options.fetchEvents(request);
    sinon.assert.calledWithMatch(fetch, { family: 'automations', begin: request.begin });
    const event = {
      id: 'event',
      family: 'automations',
      type: 'opened',
      recipientEmail: 'a@example.com',
      providerId: '<opaque-id>',
      timestamp: new Date(),
      suppress: false,
    };
    await fetch.firstCall.firstArg.batchHandler([event]);
    sinon.assert.calledWithExactly(request.batchHandler, [event]);
    const { EventProcessingResult } =
      await import('../../../../../core/server/services/email-analytics/event-processing-result');
    const result = new EventProcessingResult();
    await options.createEventProcessor().processBatch([event], result, {});
    sinon.assert.calledWithExactly(
      deps.automationsApi.getAutomatedEmailRecipientsByMailgunIds as sinon.SinonStub,
      ['<opaque-id>'],
    );
    sinon.assert.calledOnce(deps.automationsApi.trackEmailDeliveredAndOpened as sinon.SinonStub);
    assert.equal(result.unprocessable, 1);
    assert.equal(typeof wrappers[0].options.createEventProcessor().aggregate, 'function');
  });
  it('does not poll a webhook provider', async () => {
    deps.provider = {
      source: 'test',
      getEventSource: () => ({ type: 'webhook', verify: sinon.stub() }),
    };
    analytics.init(deps);
    for (const wrapper of wrappers) {
      assert.equal(wrapper.options.polling, false);
    }
  });

  it('preserves capped and completed polling results for cursor advancement', async () => {
    analytics.init(deps);
    const request = {
      begin: new Date(0),
      end: new Date(10000),
      maxEvents: 10,
      batchHandler: sinon.stub(),
    };
    for (const result of [{ safeCursor: new Date(5000) }, {}]) {
      fetch.resolves(result);
      for (const wrapper of wrappers) {
        assert.equal(await wrapper.options.fetchEvents(request), result);
      }
    }
  });

  for (const allInvalid of [false, true]) {
    it(`preserves counts and cursors for ${allInvalid ? 'entirely invalid' : 'mixed'} polling pages`, async () => {
      const warn = sinon.stub(logging, 'warn');
      analytics.init(deps);
      const event = {
        id: 'event',
        family: 'automations',
        type: 'opened',
        recipientEmail: 'reader@example.com',
        providerId: '<Opaque-ID>',
        timestamp: new Date(1000),
        suppress: false,
      };
      const invalid = [
        { ...event, recipientEmail: 'invalid', timestamp: new Date(2000) },
        { ...event, emailId: 'invalid', timestamp: new Date(3000) },
        { ...event, type: 'failed', timestamp: new Date(4000) },
        { ...event, family: 'gifts', timestamp: new Date(5000) },
        { ...event, timestamp: 'invalid' },
      ];
      const events = allInvalid
        ? invalid
        : [event, ...invalid, { ...event, timestamp: new Date(6000) }];
      (deps.automationsApi.getAutomatedEmailRecipientsByMailgunIds as sinon.SinonStub).resolves([
        {
          id: 'recipient',
          member_id: 'member',
          member_email: event.recipientEmail,
          mailgun_message_id: event.providerId,
          automation_action_revision_id: 'revision',
        },
      ]);
      const safeCursor = new Date(4000);
      fetch.callsFake(async ({ batchHandler }) => {
        await batchHandler(events);
        return allInvalid ? {} : { safeCursor };
      });
      const queries = sinon.createStubInstance(Queries);
      queries.getLastEventTimestamp.resolves(new Date(0));
      const service = new EmailAnalyticsService({ ...wrappers[1].options, queries });
      const result = await service.fetchLatestNonOpenedEvents({ maxEvents: events.length });

      assert.equal(result.eventCount, events.length);
      assert.equal(result.result.unprocessable, invalid.length);
      assert.equal(result.result.opened, allInvalid ? 0 : 2);
      const expectedCursor = allInvalid ? new Date(5000) : safeCursor;
      assert.deepEqual(service.getStatus().latest.lastEventTimestamp, expectedCursor);
      sinon.assert.calledWithExactly(
        queries.setJobTimestamp,
        wrappers[1].options.jobNames.latestNonOpened,
        'finished',
        expectedCursor,
      );
      sinon.assert.calledOnce(warn);
      if (!allInvalid) {
        sinon.assert.calledWithExactly(
          deps.automationsApi.getAutomatedEmailRecipientsByMailgunIds as sinon.SinonStub,
          [event.providerId],
        );
      }
    });
  }

  it('retries a failed safety write from the same cursor after saving earlier tracking', async () => {
    const log = sinon.stub(logging, 'error');
    analytics.init(deps);
    const initialCursor = new Date(0);
    const event = {
      id: 'event',
      family: 'automations',
      type: 'delivered',
      recipientEmail: 'READER@example.com',
      providerId: '<Opaque-ID>',
      timestamp: new Date(1000),
      suppress: false,
    };
    (deps.automationsApi.getAutomatedEmailRecipientsByMailgunIds as sinon.SinonStub).resolves([
      {
        id: 'recipient',
        member_id: 'member',
        member_email: 'reader@example.com',
        mailgun_message_id: event.providerId,
        automation_action_revision_id: 'revision',
      },
    ]);
    const failure = new Error('preference write failed');
    const unsubscribe = deps.membersRepository.unsubscribeFromUpdates as sinon.SinonStub;
    unsubscribe.rejects(failure);
    fetch.callsFake(async ({ batchHandler }) => {
      await batchHandler([event, { ...event, type: 'unsubscribed', timestamp: new Date(2000) }]);
      return {};
    });
    const queries = sinon.createStubInstance(Queries);
    queries.getLastEventTimestamp.resolves(initialCursor);
    const service = new EmailAnalyticsService({ ...wrappers[1].options, queries });

    await assert.rejects(service.fetchLatestNonOpenedEvents(), (error) => error === failure);
    assert.deepEqual(service.getStatus().latest.lastEventTimestamp, initialCursor);
    sinon.assert.calledOnceWithExactly(
      deps.automationsApi.trackEmailDeliveredAndOpened as sinon.SinonStub,
      new Map([
        ['recipient', { automationActionRevisionId: 'revision', deliveredAt: event.timestamp }],
      ]),
    );
    sinon.assert.notCalled(deps.emailSuppressionList.removeUnsubscribe as sinon.SinonStub);
    assert.equal(
      queries.setJobTimestamp.args.some(([, status]) => status === 'finished'),
      false,
    );
    sinon.assert.calledWithExactly(log, failure);

    unsubscribe.resolves();
    const result = await service.fetchLatestNonOpenedEvents();
    assert.deepEqual(
      fetch.args.map(([options]) => options.begin),
      [initialCursor, initialCursor],
    );
    assert.equal(result.result.delivered, 1);
    assert.equal(result.result.unsubscribed, 1);
    sinon.assert.calledWithExactly(unsubscribe, { id: 'member', email: 'reader@example.com' });
    sinon.assert.calledOnce(deps.emailSuppressionList.removeUnsubscribe as sinon.SinonStub);
  });

  it('propagates domain failures through the original automation processor', async () => {
    analytics.init(deps);
    const error = new Error('Database unavailable');
    (deps.automationsApi.trackEmailDeliveredAndOpened as sinon.SinonStub).rejects(error);
    const { EventProcessingResult } =
      await import('../../../../../core/server/services/email-analytics/event-processing-result');
    await assert.rejects(
      wrappers[1].options.createEventProcessor().processBatch([], new EventProcessingResult(), {}),
      error,
    );
  });
});
