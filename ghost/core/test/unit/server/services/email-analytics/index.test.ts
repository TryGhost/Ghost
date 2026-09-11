import sinon from 'sinon';
import assert from 'node:assert/strict';
import { MailgunRateLimit } from '../../../../../core/server/services/email-analytics/mailgun-rate-limit';
import createKnex from 'knex';

import {
  automations,
  gifts,
  init,
  newsletters,
} from '../../../../../core/server/services/email-analytics';
import { GIFT_DELIVERY_EMAIL_TAG } from '../../../../../core/server/services/gifts/constants';
import { AUTOMATION_EMAIL_TAG } from '../../../../../core/server/services/member-welcome-emails/constants';

describe('email analytics service', function () {
  const automationsApi = {
    getAutomatedEmailRecipientsByMailgunIds: sinon.stub(),
    trackEmailDeliveredAndOpened: sinon.stub(),
  };
  const config = { get: sinon.stub() };
  const domainEvents = { subscribe: sinon.stub() };
  const metrics = { metric: sinon.stub() };
  const settingsCache = { get: sinon.stub() };
  const giftDeliveryService = { recordOutcome: sinon.stub() };

  let newslettersInit: sinon.SinonStub;
  let automationsInit: sinon.SinonStub;
  let giftsInit: sinon.SinonStub;

  let dependencies: Parameters<typeof init>[0];
  let ghostServer: { registerPreStopTask: sinon.SinonStub; registerCleanupTask: sinon.SinonStub };

  beforeEach(function () {
    config.get.reset();
    // Lifecycle tasks are registered once per server instance
    ghostServer = { registerPreStopTask: sinon.stub(), registerCleanupTask: sinon.stub() };
    config.get.withArgs('bulkEmail:mailgun:tag').returns('custom-mailgun-tag');
    newslettersInit = sinon.stub(newsletters, 'init');
    automationsInit = sinon.stub(automations, 'init');
    giftsInit = sinon.stub(gifts, 'init');

    dependencies = {
      ghostServer,
      automationsApi,
      config,
      db: {
        knex: createKnex({
          client: 'better-sqlite3',
          connection: {
            filename: ':memory:',
          },
          useNullAsDefault: true,
        }),
      },
      domainEvents,
      emailSuppressionList: {
        removeComplaint: sinon.stub(),
        removeUnsubscribe: sinon.stub(),
      },
      giftDeliveryService,
      membersRepository: {
        get: sinon.stub(),
        update: sinon.stub(),
      },
      models: {
        Email: {},
        EmailRecipientFailure: {},
        EmailSpamComplaintEvent: {},
      },
      metrics,
      prometheusClient: null,
      settingsCache,
    };
  });

  afterEach(function () {
    sinon.restore();
  });

  it('initializes all readers with the same provider cooldown', function () {
    init(dependencies);
    const limiter = newslettersInit.firstCall.args[0].rateLimiter;
    assert.ok(limiter instanceof MailgunRateLimit);
    assert.equal(automationsInit.firstCall.args[0].rateLimiter, limiter);
    assert.equal(giftsInit.firstCall.args[0].rateLimiter, limiter);
  });

  it('initializes analytics when Ghost boots without an HTTP server', function () {
    init({ ...dependencies, ghostServer: undefined });
    sinon.assert.calledOnce(newslettersInit);
    sinon.assert.calledOnce(automationsInit);
    sinon.assert.calledOnce(giftsInit);
    sinon.assert.notCalled(ghostServer.registerPreStopTask);
    sinon.assert.notCalled(ghostServer.registerCleanupTask);
  });

  it('registers lifecycle tasks once when the same server initializes analytics again', function () {
    init(dependencies);
    init(dependencies);
    sinon.assert.calledOnce(ghostServer.registerPreStopTask);
    sinon.assert.calledOnce(ghostServer.registerCleanupTask);
  });

  it('registers stop and drain hooks for all three analytics readers', async function () {
    const stop = [newsletters, automations, gifts].map((reader) => sinon.stub(reader, 'onPreStop'));
    let finish!: () => void;
    const drains = [newsletters, automations, gifts].map((reader) =>
      sinon.stub(reader, 'onShutdown').resolves(),
    );
    drains[0].returns(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    init(dependencies);
    sinon.assert.calledOnce(ghostServer.registerPreStopTask);
    sinon.assert.calledOnce(ghostServer.registerCleanupTask);
    ghostServer.registerPreStopTask.firstCall.args[0]();
    stop.forEach((stub) => sinon.assert.calledOnce(stub));
    let drained = false;
    const shutdown = ghostServer.registerCleanupTask.firstCall.args[0]().then(() => {
      drained = true;
    });
    await Promise.resolve();
    drains.forEach((stub) => sinon.assert.calledOnce(stub));
    assert.equal(drained, false);
    finish();
    await shutdown;
  });

  it('initializes newsletter, automation, and gift analytics with configured Mailgun tags', function () {
    init(dependencies);

    sinon.assert.calledOnceWithExactly(
      newslettersInit,
      sinon.match({
        config,
        domainEvents,
        event: {
          name: 'StartEmailAnalyticsJobEvent',
        },
        mailgunTags: ['bulk-email', 'custom-mailgun-tag'],
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
        metrics,
        settingsCache,
        createEventProcessor: sinon.match.func,
      }),
    );

    sinon.assert.calledOnceWithExactly(
      automationsInit,
      sinon.match({
        config,
        domainEvents,
        event: {
          name: 'StartAutomationEmailAnalyticsJobEvent',
        },
        mailgunTags: [AUTOMATION_EMAIL_TAG, 'custom-mailgun-tag'],
        jobNames: {
          latestNonOpened: 'email-analytics-automation-latest-others',
          missing: 'email-analytics-automation-missing',
          latestOpened: 'email-analytics-automation-latest-opened',
          scheduled: 'email-analytics-automation-scheduled',
        },
        cursorSeed: {
          tableName: 'automated_email_recipients',
          eventColumns: {
            delivered: 'delivered_at',
            opened: 'opened_at',
          },
        },
        metrics,
        settingsCache,
        createEventProcessor: sinon.match.func,
      }),
    );

    sinon.assert.calledOnceWithExactly(
      giftsInit,
      sinon.match({
        config,
        domainEvents,
        event: {
          name: 'StartGiftEmailAnalyticsJobEvent',
        },
        mailgunTags: [GIFT_DELIVERY_EMAIL_TAG, 'custom-mailgun-tag'],
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
        metrics,
        settingsCache,
        createEventProcessor: sinon.match.func,
      }),
    );
  });

  it('does not add a site tag to automation analytics when none is configured', function () {
    config.get.withArgs('bulkEmail:mailgun:tag').returns(undefined);

    init(dependencies);

    sinon.assert.calledOnceWithExactly(
      automationsInit,
      sinon.match({
        mailgunTags: [AUTOMATION_EMAIL_TAG],
      }),
    );
  });

  it.each([undefined, ''])(
    'does not add a gift analytics site tag when configured as %s',
    function (siteTag) {
      config.get.withArgs('bulkEmail:mailgun:tag').returns(siteTag);

      init(dependencies);

      sinon.assert.calledOnceWithExactly(
        giftsInit,
        sinon.match({ mailgunTags: [GIFT_DELIVERY_EMAIL_TAG] }),
      );
    },
  );

  it('registers Prometheus metrics for member stat aggregation', function () {
    const registerCounter = sinon.stub();

    init({
      ...dependencies,
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
