import assert from 'node:assert/strict';
import sinon from 'sinon';
import createKnex from 'knex';
import logging from '@tryghost/logging';
import { vi } from 'vitest';
import { EmailAnalyticsService } from '../../../../../core/server/services/email-analytics/email-analytics-service';
import { Queries } from '../../../../../core/server/services/email-analytics/lib/queries';
import { StartEmailAnalyticsJobEvent } from '../../../../../core/server/services/email-analytics/events/start-email-analytics-job-event';
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
      recipientEmail: 'a&b@müller.de',
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

  it('runs queued webhook statistics from the existing newsletter schedule', async () => {
    const { WebhookStatsAggregator } =
      await import('../../../../../core/server/services/email-analytics/webhook-stats-aggregator');
    const flush = sinon.stub(WebhookStatsAggregator.prototype, 'flush').resolves();
    deps.provider = {
      source: 'test',
      getEventSource: () => ({ type: 'webhook', verify: sinon.stub() }),
    };
    analytics.init(deps);
    await subscribers.get(StartEmailAnalyticsJobEvent.name)!();
    sinon.assert.calledOnce(flush);
    sinon.assert.notCalled(wrappers[0].startFetch);
    sinon.assert.notCalled(fetch);
  });

  for (const [analyticsEnabled, jobsEnabled] of [
    [true, true],
    [true, false],
    [false, true],
    [false, false],
  ]) {
    it(`records webhook tracking and suppression with analytics=${analyticsEnabled}, jobs=${jobsEnabled}`, async () => {
      const { WebhookStatsAggregator } =
        await import('../../../../../core/server/services/email-analytics/webhook-stats-aggregator');
      const enqueue = sinon.stub(WebhookStatsAggregator.prototype, 'enqueue').resolves();
      const get = deps.config.get as sinon.SinonStub;
      get.withArgs('emailAnalytics:enabled').returns(analyticsEnabled);
      get.withArgs('backgroundJobs:emailAnalytics').returns(jobsEnabled);
      const event = {
        id: 'opened',
        family: 'automations',
        type: 'opened',
        recipientEmail: 'reader@example.com',
        providerId: 'message',
        timestamp: new Date(),
      };
      deps.provider = {
        source: 'test',
        getEventSource: () => ({
          type: 'webhook',
          verify: async () => ({
            events: [event, { ...event, id: 'complaint', type: 'complained', suppress: true }],
          }),
        }),
      } as typeof deps.provider;
      (deps.automationsApi.getAutomatedEmailRecipientsByMailgunIds as sinon.SinonStub).resolves([
        {
          id: 'recipient',
          member_id: 'member',
          member_email: event.recipientEmail,
          mailgun_message_id: event.providerId,
          automation_action_revision_id: 'revision',
        },
      ]);
      analytics.init(deps);
      await analytics.getEventService().webhook('test', { body: Buffer.from('{}'), headers: {} });
      assert.deepEqual(
        (
          deps.automationsApi.trackEmailDeliveredAndOpened as sinon.SinonStub
        ).firstCall.firstArg.get('recipient'),
        { automationActionRevisionId: 'revision', openedAt: event.timestamp },
      );
      sinon.assert.calledOnce(deps.emailSuppressionList.handleComplaint as sinon.SinonStub);
      sinon.assert.calledOnce(deps.emailSuppressionList.removeComplaint as sinon.SinonStub);
      assert.equal(enqueue.callCount, analyticsEnabled && jobsEnabled ? 1 : 0);
    });
  }

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

  it('keeps automation polling safety events unhandled without changing preferences', async () => {
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
        { ...event, type: 'complained', timestamp: new Date(2000) },
        {
          ...event,
          type: 'failed',
          severity: 'permanent',
          suppress: true,
          timestamp: new Date(2000),
        },
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
    sinon.assert.notCalled(unsubscribe);
    sinon.assert.notCalled(log);
    sinon.assert.notCalled(deps.emailSuppressionList.handleComplaint as sinon.SinonStub);
    sinon.assert.notCalled(deps.emailSuppressionList.handleBounce as sinon.SinonStub);
    assert.equal(result.eventCount, 5);
    assert.equal(result.result.delivered, 1);
    assert.equal(result.result.opened, 1);
    assert.equal(result.result.unsubscribed, 0);
    assert.equal(result.result.processingFailures, 0);
    assert.equal(result.result.unhandled, 3);

    fetch.callsFake(async ({ batchHandler }) => {
      await batchHandler([]);
      return {};
    });
    await service.fetchLatestNonOpenedEvents();
    assert.deepEqual(
      fetch.args.map(([options]) => options.begin),
      [initialCursor, nextCursor],
    );
    sinon.assert.notCalled(unsubscribe);
    sinon.assert.notCalled(deps.emailSuppressionList.removeUnsubscribe as sinon.SinonStub);
  });

  it('keeps gift polling outcomes and leaves safety events unhandled', async () => {
    const handleComplaint = deps.emailSuppressionList.handleComplaint as sinon.SinonStub;
    handleComplaint.rejects(new Error('suppression failed'));
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
          { ...event, type: 'opened' },
          { ...event, type: 'unsubscribed' },
          { ...event, type: 'failed', severity: 'permanent', suppress: true },
          { ...event, type: 'delivered', timestamp: new Date(2000) },
        ],
        result,
        {},
      );

    sinon.assert.notCalled(handleComplaint);
    sinon.assert.notCalled(deps.emailSuppressionList.handleBounce as sinon.SinonStub);
    sinon.assert.notCalled(deps.emailSuppressionList.removeComplaint as sinon.SinonStub);
    sinon.assert.calledThrice(deps.giftDeliveryService.recordOutcome as sinon.SinonStub);
    assert.equal(result.delivered, 2);
    assert.equal(result.permanentFailed, 1);
    assert.equal(result.unhandled, 3);
    assert.equal(result.processingFailures, 0);
  });

  for (const family of ['automations', 'gifts'] as const) {
    it(`still fails the polling window for ${family} tracking write errors`, async () => {
      sinon.stub(logging, 'error');
      analytics.init(deps);
      const initialCursor = new Date(0);
      const failure = new Error('tracking write failed');
      const write = (
        family === 'automations'
          ? deps.automationsApi.trackEmailDeliveredAndOpened
          : deps.giftDeliveryService.recordOutcome
      ) as sinon.SinonStub;
      write.rejects(failure);
      fetch.callsFake(async ({ batchHandler }) => {
        await batchHandler([
          {
            id: 'event',
            family,
            type: 'delivered',
            recipientEmail: 'reader@example.com',
            providerId: 'message',
            timestamp: new Date(1000),
          },
        ]);
      });
      const queries = sinon.createStubInstance(Queries);
      queries.getLastEventTimestamp.resolves(initialCursor);
      const service = new EmailAnalyticsService({
        ...wrappers[family === 'automations' ? 1 : 2].options,
        queries,
      });

      await assert.rejects(service.fetchLatestNonOpenedEvents(), (err) => err === failure);
      sinon.assert.calledOnce(write);
      assert.deepEqual(service.getStatus().latest.lastEventTimestamp, initialCursor);
      assert.equal(
        queries.setJobTimestamp.args.some(([, status]) => status === 'finished'),
        false,
      );
    });
  }

  for (const eventSource of ['poll', 'webhook'] as const) {
    it(`wires newsletter unsubscribe failures to the ${eventSource} policy`, async () => {
      const EmailEventProcessor = (
        await import(
          // @ts-expect-error This module lacks type definitions.
          '../../../../../core/server/services/email-service/email-event-processor'
        )
      ).default;
      const NewsletterEmailEventStorage = (
        await import(
          // @ts-expect-error This module lacks type definitions.
          '../../../../../core/server/services/email-service/newsletter-email-event-storage'
        )
      ).default;
      const log = sinon.stub(logging, 'error');
      const lookup = deps.membersRepository.get as sinon.SinonStub;
      lookup.rejects(new Error('lookup failed'));
      (deps.config.get as sinon.SinonStub).withArgs('emailAnalytics:batchProcessing').returns(true);
      Object.assign(deps.domainEvents, { dispatch: sinon.stub() });
      sinon.stub(EmailEventProcessor.prototype, 'batchGetRecipients').resolves(new Map());
      sinon
        .stub(EmailEventProcessor.prototype, 'getRecipient')
        .resolves({ emailId: 'a'.repeat(24), memberId: 'member', emailRecipientId: 'recipient' });
      const flush = sinon
        .stub(NewsletterEmailEventStorage.prototype, 'flushBatchedUpdates')
        .resolves();
      const event = {
        id: 'event',
        family: 'newsletters',
        type: 'unsubscribed',
        recipientEmail: 'a&b@example.com',
        providerId: 'message',
        timestamp: new Date(1000),
      };
      const events = [event, { ...event, type: 'opened', timestamp: new Date(2000) }];
      deps.provider = {
        source: 'test',
        getEventSource: () =>
          eventSource === 'poll'
            ? { type: 'poll', fetch }
            : { type: 'webhook', verify: sinon.stub().resolves({ events }) },
      };
      analytics.init(deps);

      if (eventSource === 'webhook') {
        await assert.rejects(
          analytics.getEventService().webhook('test', { body: Buffer.from('{}'), headers: {} }),
          { statusCode: 503 },
        );
      } else {
        const { EventProcessingResult } =
          await import('../../../../../core/server/services/email-analytics/event-processing-result');
        const result = new EventProcessingResult();
        const fetchData: { lastEventTimestamp?: Date } = {};
        await wrappers[0].options.createEventProcessor().processBatch(events, result, fetchData);
        assert.equal(result.unsubscribed, 1);
        assert.equal(result.opened, 1);
        assert.equal(result.processingFailures, 0);
        assert.deepEqual(fetchData.lastEventTimestamp, new Date(2000));
        sinon.assert.calledOnce(flush);
        sinon.assert.calledOnce(log);
      }
      sinon.assert.calledOnce(lookup);
      sinon.assert.notCalled(deps.emailSuppressionList.removeUnsubscribe as sinon.SinonStub);
    });
  }
});
