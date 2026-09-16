import assert from 'node:assert/strict';
import ObjectId from 'bson-objectid';
import { GIFT_DELIVERY_EMAIL_TAG } from '../../../../core/server/services/gifts/constants';
import { AUTOMATION_EMAIL_TAG } from '../../../../core/server/services/member-welcome-emails/constants';
import sinon from 'sinon';
import { vi } from 'vitest';
import type { Knex } from 'knex';

const { agentProvider, fixtureManager } = require('../../../utils/e2e-framework');
const { knex }: { knex: Knex } = require('../../../utils');
const emailAnalytics = require('../../../../core/server/services/email-analytics');
const jobsService = require('../../../../core/server/services/jobs-service');
const MailgunClient = require('../../../../core/server/services/lib/mailgun-client');
const logging = require('@tryghost/logging');
const EmailAnalyticsFetchLatestJob =
  require('../../../../core/server/services/email-analytics/jobs/email-analytics-fetch-latest-job').default;

const EmailAnalyticsAutomationFetchLatestJob =
  require('../../../../core/server/services/email-analytics/jobs/email-analytics-automation-fetch-latest-job').default;

const EmailAnalyticsGiftFetchLatestJob =
  require('../../../../core/server/services/email-analytics/jobs/email-analytics-gift-fetch-latest-job').default;
const models = require('../../../../core/server/models');

type MailgunEvent = {
  id: string;
  event: string;
  recipient: string;
  tags: string[];
  timestamp: number;
  message: { headers: { 'message-id': string } };
  'user-variables'?: { 'email-id': string };
};

const eventDate = new Date('2024-01-01T00:00:00Z');
const cursorDate = new Date('2023-12-31T23:59:00Z');
const namespaces = ['email-analytics', 'email-analytics-automation', 'email-analytics-gifts'];

describe('email analytics JobsService delivery', function () {
  let events: MailgunEvent[];
  let info: sinon.SinonSpy;

  beforeAll(async function () {
    await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('newsletters', 'members:newsletters', 'members:emails');
  });

  beforeEach(async function () {
    events = [];
    info = sinon.spy(logging, 'info');
    for (const prefix of namespaces) {
      for (const suffix of ['latest-others', 'latest-opened', 'missing']) {
        await knex('jobs')
          .insert({
            id: ObjectId().toHexString(),
            name: `${prefix}-${suffix}`,
            created_at: cursorDate,
            started_at: cursorDate,
            finished_at: cursorDate,
            status: 'finished',
          })
          .onConflict('name')
          .merge({ started_at: cursorDate, finished_at: cursorDate, status: 'finished' });
      }
    }
    for (const wrapper of [
      emailAnalytics.getNewsletters(),
      emailAnalytics.getAutomations(),
      emailAnalytics.getGifts(),
    ]) {
      for (const data of Object.values(wrapper.service.getStatus()) as Array<{
        lastEventTimestamp?: Date;
        lastBegin?: Date;
      }>) {
        delete data.lastEventTimestamp;
        delete data.lastBegin;
      }
    }
    sinon.stub(MailgunClient.prototype, 'fetchEvents').callsFake(async function (
      this: { normalizeEvent: (event: MailgunEvent) => unknown },
      ...args: unknown[]
    ) {
      const [options, batchHandler] = args as [
        { event: string; tags: string; begin?: number; end?: number },
        (events: unknown[]) => Promise<unknown>,
      ];
      const matching = events.filter(
        (event) =>
          options.event.split(' OR ').includes(event.event) &&
          options.tags.split(' AND ').every((tag) => event.tags.includes(tag)) &&
          (options.begin === undefined || event.timestamp >= options.begin) &&
          (options.end === undefined || event.timestamp <= options.end),
      );
      return matching.length
        ? [await batchHandler(matching.map((event) => this.normalizeEvent(event)).filter(Boolean))]
        : [];
    });
  });

  afterEach(function () {
    sinon.restore();
  });

  function mailgunEvent(
    type: string,
    messageId: string,
    recipient: string,
    tag: string,
  ): MailgunEvent {
    return {
      id: `${type}-${messageId}`,
      event: type,
      recipient,
      tags: [tag],
      timestamp: eventDate.getTime() / 1000,
      message: { headers: { 'message-id': `<${messageId.replace(/^<|>$/g, '')}>` } },
    };
  }

  async function dispatchAndWait(job: object, type: string, prefix: string) {
    const siblings = await knex('jobs')
      .whereIn(
        'name',
        namespaces
          .filter((name) => name !== prefix)
          .flatMap((name) =>
            ['latest-others', 'latest-opened', 'missing'].map((suffix) => `${name}-${suffix}`),
          ),
      )
      .orderBy('name');
    await jobsService.getInstance().dispatch(job);
    await vi.waitFor(
      () => {
        assert.ok(
          info.args.some(
            ([payload]) => payload?.system?.event === `${type.replaceAll('-', '_')}.completed`,
          ),
        );
      },
      { timeout: 5000, interval: 20 },
    );
    const cursor = await knex('jobs').where('name', `${prefix}-latest-others`).first();
    assert.ok(new Date(cursor.finished_at) > cursorDate);
    const after = await knex('jobs')
      .whereIn(
        'name',
        siblings.map((row) => row.name),
      )
      .orderBy('name');
    assert.deepEqual(after, siblings);
  }

  it('persists newsletter delivery, opens, aggregation, and its cursor through the booted backend', async function () {
    const recipient = fixtureManager.get('email_recipients', 0);
    const batch = fixtureManager.get('email_batches', 0);
    await knex('email_recipients')
      .where('id', recipient.id)
      .update({ delivered_at: null, opened_at: null });
    events = ['opened', 'delivered'].map((type) => ({
      ...mailgunEvent(type, batch.mailgun_message_id, recipient.member_email, 'bulk-email'),
      'user-variables': { 'email-id': batch.email_id },
    }));
    await dispatchAndWait(
      new EmailAnalyticsFetchLatestJob(),
      EmailAnalyticsFetchLatestJob.type,
      'email-analytics',
    );
    const updated = await knex('email_recipients').where('id', recipient.id).first();
    assert.equal(new Date(updated.delivered_at).getTime(), eventDate.getTime());
    assert.equal(new Date(updated.opened_at).getTime(), eventDate.getTime());
    const email = await knex('emails').where('id', batch.email_id).first();
    assert.ok(email.delivered_count > 0);
    assert.ok(email.opened_count > 0);
  });
  it('persists automation delivery, opens, and its cursor through the booted backend', async function () {
    const now = new Date();
    const automationId = ObjectId().toHexString();
    const actionId = ObjectId().toHexString();
    const revisionId = ObjectId().toHexString();
    const recipientId = ObjectId().toHexString();
    const member = fixtureManager.get('members', 0);
    const messageId = 'analytics-job-automation@example.com';
    await knex('automations').insert({
      id: automationId,
      name: 'Analytics job',
      slug: `analytics-${automationId}`,
      status: 'inactive',
      created_at: now,
      updated_at: now,
    });
    await knex('automation_actions').insert({
      id: actionId,
      automation_id: automationId,
      type: 'send_email',
      created_at: now,
      updated_at: now,
    });
    await knex('automation_action_revisions').insert({
      id: revisionId,
      action_id: actionId,
      created_at: now,
      email_sent_count: 1,
      email_opened_count: 0,
    });
    await knex('automated_email_recipients').insert({
      id: recipientId,
      automation_action_revision_id: revisionId,
      member_id: member.id,
      member_uuid: member.uuid,
      member_email: member.email,
      mailgun_message_id: messageId,
      track_opens: true,
      track_clicks: true,
      created_at: now,
    });
    try {
      events = ['opened', 'delivered'].map((type) =>
        mailgunEvent(type, messageId, member.email, AUTOMATION_EMAIL_TAG),
      );
      await dispatchAndWait(
        new EmailAnalyticsAutomationFetchLatestJob(),
        EmailAnalyticsAutomationFetchLatestJob.type,
        'email-analytics-automation',
      );
      const updated = await knex('automated_email_recipients').where('id', recipientId).first();
      assert.equal(new Date(updated.delivered_at).getTime(), eventDate.getTime());
      assert.equal(new Date(updated.opened_at).getTime(), eventDate.getTime());
      const revision = await knex('automation_action_revisions').where('id', revisionId).first();
      assert.equal(revision.email_opened_count, 1);
    } finally {
      await knex('automated_email_recipients').where('id', recipientId).del();
      await knex('automation_action_revisions').where('id', revisionId).del();
      await knex('automation_actions').where('id', actionId).del();
      await knex('automations').where('id', automationId).del();
    }
  });
  it('persists gift delivery outcomes and its cursor without fetching opens', async function () {
    const tier = await models.Product.findOne({ type: 'paid' }, { require: true });
    const token = ObjectId().toHexString();
    const gift = await models.Gift.add({
      token,
      tier_id: tier.id,
      buyer_email: 'buyer@example.com',
      cadence: 'year',
      duration: 1,
      currency: 'usd',
      amount: 5000,
      status: 'purchased',
      purchased_at: eventDate,
      expires_at: new Date('2030-01-01'),
      stripe_checkout_session_id: `cs_${token}`,
      stripe_payment_intent_id: `pi_${token}`,
    });
    const messageId = 'analytics-job-gift@example.com';
    const delivery = await models.GiftDelivery.add({
      gift_id: gift.id,
      recipient_email: 'gift-recipient@example.com',
      status: 'sent',
      email_sent_at: eventDate,
      email_provider_message_id: messageId,
      outcome: 'unknown',
    });
    try {
      events = [
        mailgunEvent('delivered', messageId, 'gift-recipient@example.com', GIFT_DELIVERY_EMAIL_TAG),
      ];
      await dispatchAndWait(
        new EmailAnalyticsGiftFetchLatestJob(),
        EmailAnalyticsGiftFetchLatestJob.type,
        'email-analytics-gifts',
      );
      const updated = await knex('gift_deliveries').where('id', delivery.id).first();
      assert.equal(updated.outcome, 'delivered');
      assert.equal(new Date(updated.outcome_at).getTime(), eventDate.getTime());
      const opened = await knex('jobs')
        .where('name', 'email-analytics-gifts-latest-opened')
        .first();
      assert.equal(new Date(opened.finished_at).getTime(), cursorDate.getTime());
      const fetches = (MailgunClient.prototype.fetchEvents as sinon.SinonStub).args;
      assert.ok(fetches.every(([options]) => options.event !== 'opened'));
    } finally {
      await knex('gift_deliveries').where('id', delivery.id).del();
      await knex('gifts').where('id', gift.id).del();
    }
  });
});
