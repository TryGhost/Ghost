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

  it('processes complaints for addresses accepted by Ghost without discarding them during polling', async () => {
    const addresses = ['josé@example.com', 'a&b@example.com', 'x=y@example.com', 'user@müller.de'];
    const events = addresses.map((recipientEmail, index) => ({
      id: `event-${index}`,
      family: 'automations',
      type: 'complained',
      recipientEmail,
      providerId: `message-${index}`,
      timestamp: new Date(),
    }));
    (deps.automationsApi.getAutomatedEmailRecipientsByMailgunIds as sinon.SinonStub).resolves(
      events.map((event, index) => ({
        id: `recipient-${index}`,
        member_id: `member-${index}`,
        member_email: event.recipientEmail,
        mailgun_message_id: event.providerId,
        automation_action_revision_id: 'revision',
      })),
    );
    analytics.init(deps);
    const { EventProcessingResult } =
      await import('../../../../../core/server/services/email-analytics/event-processing-result');
    const result = new EventProcessingResult();
    await wrappers[1].options.createEventProcessor().processBatch(events, result, {});

    assert.equal(result.complained, addresses.length);
    assert.equal(result.unprocessable, 0);
    assert.equal(result.processingFailures, 0);
    for (const email of addresses) {
      sinon.assert.calledWithMatch(deps.emailSuppressionList.handleComplaint as sinon.SinonStub, {
        email,
      });
      sinon.assert.calledWith(deps.emailSuppressionList.removeComplaint as sinon.SinonStub, email);
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
        { ...event, recipientEmail: '', timestamp: new Date(2000) },
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

  it('retries only the failed event once and advances past a persistent safety failure', async () => {
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
      await batchHandler([
        event,
        { ...event, type: 'unsubscribed', timestamp: new Date(2000) },
        { ...event, type: 'opened', timestamp: new Date(3000) },
      ]);
      return {};
    });
    const queries = sinon.createStubInstance(Queries);
    queries.getLastEventTimestamp.resolves(initialCursor);
    const service = new EmailAnalyticsService({ ...wrappers[1].options, queries });

    const result = await service.fetchLatestNonOpenedEvents();
    const nextCursor = new Date(4000);
    assert.deepEqual(service.getStatus().latest.lastEventTimestamp, nextCursor);
    sinon.assert.calledOnceWithExactly(
      deps.automationsApi.trackEmailDeliveredAndOpened as sinon.SinonStub,
      new Map([
        [
          'recipient',
          {
            automationActionRevisionId: 'revision',
            deliveredAt: event.timestamp,
            openedAt: new Date(3000),
          },
        ],
      ]),
    );
    sinon.assert.notCalled(deps.emailSuppressionList.removeUnsubscribe as sinon.SinonStub);
    assert.equal(
      queries.setJobTimestamp.args.some(([, status]) => status === 'finished'),
      true,
    );
    sinon.assert.calledTwice(unsubscribe);
    sinon.assert.calledOnce(log);
    assert.match(log.firstCall.firstArg.message, /after one retry/);
    assert.equal(result.eventCount, 3);
    assert.equal(result.result.delivered, 1);
    assert.equal(result.result.opened, 1);
    assert.equal(result.result.unsubscribed, 0);
    assert.equal(result.result.processingFailures, 1);

    fetch.callsFake(async ({ batchHandler }) => {
      await batchHandler([]);
      return {};
    });
    await service.fetchLatestNonOpenedEvents();
    assert.deepEqual(
      fetch.args.map(([options]) => options.begin),
      [initialCursor, nextCursor],
    );
    sinon.assert.calledTwice(unsubscribe);
    sinon.assert.calledWithExactly(unsubscribe, { id: 'member', email: 'reader@example.com' });
    sinon.assert.notCalled(deps.emailSuppressionList.removeUnsubscribe as sinon.SinonStub);
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

  for (const persistent of [false, true]) {
    it(`continues gift polling after a ${persistent ? 'persistent' : 'transient'} safety failure`, async () => {
      const log = sinon.stub(logging, 'error');
      const handleComplaint = deps.emailSuppressionList.handleComplaint as sinon.SinonStub;
      if (persistent) {
        handleComplaint.rejects(new Error('suppression failed'));
      } else {
        handleComplaint.onFirstCall().rejects(new Error('suppression failed'));
      }
      (deps.giftDeliveryService.getRecipientEmailForMessage as sinon.SinonStub).resolves(
        'reader@example.com',
      );
      analytics.init(deps);
      const event = {
        id: 'event',
        family: 'gifts',
        type: 'complained',
        recipientEmail: 'reader@example.com',
        providerId: 'message',
        timestamp: new Date(1000),
      };
      const { EventProcessingResult } =
        await import('../../../../../core/server/services/email-analytics/event-processing-result');
      const result = new EventProcessingResult();
      await wrappers[2].options
        .createEventProcessor()
        .processBatch(
          [
            { ...event, type: 'delivered' },
            event,
            { ...event, type: 'delivered', timestamp: new Date(2000) },
          ],
          result,
          {},
        );

      sinon.assert.calledTwice(handleComplaint);
      sinon.assert.calledTwice(deps.giftDeliveryService.recordOutcome as sinon.SinonStub);
      assert.equal(
        (deps.emailSuppressionList.removeComplaint as sinon.SinonStub).callCount,
        persistent ? 0 : 1,
      );
      assert.equal(result.delivered, 2);
      assert.equal(result.complained, persistent ? 0 : 1);
      assert.equal(result.processingFailures, persistent ? 1 : 0);
      assert.equal(log.callCount, persistent ? 1 : 0);
    });
  }

  for (const family of ['automations', 'gifts'] as const) {
    it(`still propagates ${family} webhook safety failures without skipping or retrying`, async () => {
      const event = {
        id: 'event',
        family,
        type: 'complained',
        recipientEmail: 'reader@example.com',
        providerId: 'message',
        timestamp: new Date(),
      };
      const failure = new Error('suppression failed');
      (deps.emailSuppressionList.handleComplaint as sinon.SinonStub).rejects(failure);
      (deps.automationsApi.getAutomatedEmailRecipientsByMailgunIds as sinon.SinonStub).resolves([
        {
          id: 'recipient',
          member_id: 'member',
          member_email: event.recipientEmail,
          mailgun_message_id: event.providerId,
          automation_action_revision_id: 'revision',
        },
      ]);
      (deps.giftDeliveryService.getRecipientEmailForMessage as sinon.SinonStub).resolves(
        event.recipientEmail,
      );
      deps.provider = {
        source: 'test',
        getEventSource: () => ({
          type: 'webhook',
          verify: sinon.stub().resolves({ events: [event] }),
        }),
      };
      analytics.init(deps);

      await assert.rejects(
        analytics.getEventService().webhook('test', {
          body: Buffer.from('{}'),
          headers: {},
        }),
        (err) => err === failure,
      );

      sinon.assert.calledOnce(deps.emailSuppressionList.handleComplaint as sinon.SinonStub);
      sinon.assert.notCalled(deps.emailSuppressionList.removeComplaint as sinon.SinonStub);
    });
  }
});
