import sinon from 'sinon';
import createKnex from 'knex';

import assert from 'node:assert/strict';
import { vi } from 'vitest';
type Analytics = typeof import('../../../../../core/server/services/email-analytics');
let analytics: Analytics;
let init: Analytics['init'];

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

  beforeEach(async function () {
    config.get.reset();
    config.get.withArgs('bulkEmail:mailgun:tag').returns('custom-mailgun-tag');
    newslettersInit = sinon.stub().returns({ startFetch: sinon.stub().resolves() });
    automationsInit = sinon.stub().returns({ startFetch: sinon.stub().resolves() });
    giftsInit = sinon.stub().returns({ startFetch: sinon.stub().resolves() });
    const constructors = {
      newsletters: newslettersInit,
      automations: automationsInit,
      gifts: giftsInit,
    };
    vi.resetModules();
    vi.doMock(
      '../../../../../core/server/services/email-analytics/email-analytics-service-wrapper',
      () => ({
        EmailAnalyticsServiceWrapper: function (options: { logName: keyof typeof constructors }) {
          return constructors[options.logName](options);
        },
      }),
    );
    analytics = await import('../../../../../core/server/services/email-analytics');
    init = analytics.init;
    domainEvents.subscribe.resetHistory();

    dependencies = {
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

  afterEach(async function () {
    await dependencies.db.knex.destroy();
    vi.doUnmock(
      '../../../../../core/server/services/email-analytics/email-analytics-service-wrapper',
    );
    vi.resetModules();
    sinon.restore();
  });

  it('guards access before initialization and retains independent executors', async function () {
    assert.throws(() => analytics.getNewsletters(), /initialized/);
    assert.throws(() => analytics.getAutomations(), /initialized/);
    assert.throws(() => analytics.getGifts(), /initialized/);
    init(dependencies);
    const wrappers = [analytics.getNewsletters(), analytics.getAutomations(), analytics.getGifts()];
    assert.equal(new Set(wrappers).size, 3);
    init(dependencies);
    assert.equal(analytics.getNewsletters(), wrappers[0]);
    assert.equal(analytics.getAutomations(), wrappers[1]);
    assert.equal(analytics.getGifts(), wrappers[2]);
    sinon.assert.calledOnce(newslettersInit);
    sinon.assert.calledOnce(automationsInit);
    sinon.assert.calledOnce(giftsInit);
    sinon.assert.calledThrice(domainEvents.subscribe);
    for (const [index, call] of domainEvents.subscribe.getCalls().entries()) {
      await call.args[1]();
      sinon.assert.calledOnce(wrappers[index].startFetch as sinon.SinonStub);
    }
  });

  it('initializes newsletter, automation, and gift analytics with configured Mailgun tags', function () {
    init(dependencies);

    sinon.assert.calledOnceWithExactly(
      newslettersInit,
      sinon.match({
        config,
        jobType: 'email-analytics-fetch-latest',
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
        jobType: 'email-analytics-automation-fetch-latest',
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
        jobType: 'email-analytics-gift-fetch-latest',
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
