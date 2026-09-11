import sinon from 'sinon';
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

  beforeEach(function () {
    config.get.reset();
    config.get.withArgs('bulkEmail:mailgun:tag').returns('custom-mailgun-tag');
    newslettersInit = sinon.stub(newsletters, 'init');
    automationsInit = sinon.stub(automations, 'init');
    giftsInit = sinon.stub(gifts, 'init');

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

  afterEach(function () {
    sinon.restore();
  });

  it.each([
    [false, 'compare', false],
    [true, 'off', false],
    [true, undefined, false],
    [true, 'Compare', false],
    [true, 'compare', true],
    [true, 'incremental', true],
    [false, 'incremental', false],
  ])(
    'gates newsletter counter comparison with batchProcessing=%s and mode=%s',
    function (batchProcessing, mode, enabled) {
      config.get.withArgs('emailAnalytics:batchProcessing').returns(batchProcessing);
      config.get.withArgs('emailAnalytics:emailCounterMode').returns(mode);
      const registerCounter = sinon.stub();
      dependencies.prometheusClient = { registerCounter, getMetric: sinon.stub() };
      init(dependencies);
      const names = registerCounter.args.map(([definition]) => definition.name);
      expect(names.includes('email_analytics_email_counter_comparisons')).toBe(enabled);
      expect(names.includes('email_analytics_email_counter_drift')).toBe(enabled);
    },
  );

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

  it('enables member comparison only with batched email counters and preparation accounting', function () {
    config.get.withArgs('emailAnalytics:batchProcessing').returns(true);
    config.get.withArgs('emailAnalytics:emailCounterMode').returns('compare');
    config.get.withArgs('emailAnalytics:memberCounterMode').returns('compare');
    config.get.withArgs('emailAnalytics:memberCounterPreparation').returns(true);
    const registerCounter = sinon.stub();
    dependencies.prometheusClient = { registerCounter, getMetric: sinon.stub() };
    init(dependencies);
    const names = registerCounter.args.map(([definition]) => definition.name);
    expect(names).toContain('email_analytics_member_counter_comparisons');
    expect(names).toContain('email_analytics_member_counter_drift');
  });

  it.each([
    [false, 'compare', true, 'compare'],
    [true, 'off', true, 'compare'],
    [true, 'compare', false, 'compare'],
    [true, 'compare', true, 'unknown'],
  ])(
    'keeps member counters off for incompatible configuration (%s, %s, %s, %s)',
    function (batch, email, preparation, member) {
      config.get.withArgs('emailAnalytics:batchProcessing').returns(batch);
      config.get.withArgs('emailAnalytics:emailCounterMode').returns(email);
      config.get.withArgs('emailAnalytics:memberCounterPreparation').returns(preparation);
      config.get.withArgs('emailAnalytics:memberCounterMode').returns(member);
      const registerCounter = sinon.stub();
      dependencies.prometheusClient = { registerCounter, getMetric: sinon.stub() };
      // A counter flag mismatch must not stop Ghost from booting
      init(dependencies);
      const names = registerCounter.args.map(([definition]) => definition.name);
      expect(names).not.toContain('email_analytics_member_counter_comparisons');
    },
  );
});
