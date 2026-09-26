import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import sinon from 'sinon';
import ObjectId from 'bson-objectid';
import type { Knex } from 'knex';
import errors from '@tryghost/errors';
import { EmailProviderBase, type EmailEvent, type EventSource } from '@tryghost/adapter-base-email';
import { AdapterManager } from '../../../../core/server/services/adapter-manager/adapter-manager';
import { EmailEventService } from '../../../../core/server/services/email-provider/event-service';
import { EmailEventRepository } from '../../../../core/server/services/email-provider/event-repository';
import { Queries } from '../../../../core/server/services/email-analytics/lib/queries';
import { GiftDeliveryBookshelfRepository } from '../../../../core/server/services/gifts/gift-delivery-bookshelf-repository';
import config from '../../../../core/shared/config';
const testUtils = require('../../../utils');
const knex: Knex = require('../../../../core/server/data/db').knex;
const now = '2026-09-01 12:00:00';
const newId = () => ObjectId().toHexString();

class FakeWebhookProvider extends EmailProviderBase {
  readonly source = 'test-provider';
  readonly removeSuppression = sinon.stub().resolves();
  isConfigured() {
    return true;
  }
  async send() {
    return { id: 'opaque-message' };
  }
  async sendSingle() {
    return { id: 'opaque-message' };
  }
  getMaximumRecipients() {
    return 100;
  }
  getTargetDeliveryWindow() {
    return 0;
  }
  getEventSource(): EventSource {
    return {
      type: 'webhook',
      verify: async ({ body, headers }) => {
        const expected = createHmac('sha256', 'test-secret').update(body).digest('hex');
        if (headers['x-signature'] !== expected) {
          throw new errors.NoPermissionError({ message: 'Invalid signature' });
        }
        const payload = JSON.parse(body.toString());
        return payload.handshake
          ? { response: { status: 200, body: 'verified' } }
          : { events: payload.events };
      },
    };
  }
}

describe('provider email events', () => {
  let provider: FakeWebhookProvider;
  let service: EmailEventService;
  let queries: Queries;
  let event: EmailEvent;
  let memberId: string;
  let recipientId: string;
  let newsletterId: string;

  beforeEach(async () => {
    await require('../../../utils/db-utils').teardown();
    await testUtils.setup('default')();
    const get = sinon.stub(config, 'get').callThrough();
    get.withArgs('adapters').returns({ email: { active: 'FakeWebhookProvider' } });
    const manager = new AdapterManager({
      config,
      baseClasses: { email: FakeWebhookProvider },
      pathsToAdapters: [''],
      loadAdapterFromPath: () => FakeWebhookProvider,
    });
    provider = manager.getAdapter('email');
    queries = new Queries(knex);
    service = new EmailEventService({
      knex,
      queries,
      provider,
      gifts: { recordOutcome: sinon.stub().resolves('recorded') },
    });
    memberId = newId();
    recipientId = newId();
    const emailId = newId();
    const batchId = newId();
    newsletterId = (await knex('newsletters').first('id')).id;
    await knex('members').insert({
      id: memberId,
      uuid: randomUUID(),
      transient_id: newId(),
      email: 'reader@example.com',
      created_at: now,
      enable_updates_and_announcements: true,
    });
    await knex('members_newsletters').insert({
      id: newId(),
      member_id: memberId,
      newsletter_id: newsletterId,
    });
    await knex('emails').insert({
      id: emailId,
      post_id: newId(),
      uuid: randomUUID(),
      recipient_filter: 'all',
      submitted_at: now,
      created_at: now,
      newsletter_id: newsletterId,
      track_opens: true,
    });
    await knex('email_batches').insert({
      id: batchId,
      email_id: emailId,
      mailgun_message_id: 'opaque-message',
      created_at: now,
      updated_at: now,
    });
    await knex('email_recipients').insert({
      id: recipientId,
      email_id: emailId,
      batch_id: batchId,
      member_id: memberId,
      member_uuid: randomUUID(),
      member_email: 'reader@example.com',
    });
    event = {
      id: 'event-1',
      family: 'newsletters',
      type: 'delivered',
      recipientEmail: 'reader@example.com',
      providerId: 'opaque-message',
      emailId,
      timestamp: new Date('2026-09-01T12:00:00Z'),
      suppress: false,
    };
  });
  afterEach(() => {
    sinon.restore();
  });
  const sign = (payload: unknown) => {
    const body = Buffer.from(JSON.stringify(payload, null, 2));
    return {
      body,
      headers: {
        'content-type': 'text/plain',
        'x-signature': createHmac('sha256', 'test-secret').update(body).digest('hex'),
      },
    };
  };

  it('loads through AdapterManager and authenticates original bytes before processing', async () => {
    const request = sign({ events: [event] });
    await assert.rejects(
      service.webhook(provider.source, { ...request, body: Buffer.from('{}') }),
      /Invalid signature/,
    );
    assert.equal(
      (await knex('email_recipients').where({ id: recipientId }).first()).delivered_at,
      null,
    );
    await service.webhook(provider.source, request);
    assert((await knex('email_recipients').where({ id: recipientId }).first()).delivered_at);
    assert.equal((await knex('emails').where({ id: event.emailId }).first()).delivered_count, 1);
  });
  it('accepts verified handshakes without processing events', async () => {
    assert.deepEqual(await service.webhook(provider.source, sign({ handshake: true })), {
      response: { status: 200, body: 'verified' },
    });
    assert.equal(
      (await knex('email_recipients').where({ id: recipientId }).first()).delivered_at,
      null,
    );
  });
  it('validates a whole notification before applying any events', async () => {
    await assert.rejects(
      service.webhook(provider.source, sign({ events: [event, { ...event, id: '' }] })),
    );
    assert.equal(
      (await knex('email_recipients').where({ id: recipientId }).first()).delivered_at,
      null,
    );
  });
  it('counts replayed newsletter opens once in the existing tables', async () => {
    event.type = 'opened';
    await service.webhook(provider.source, sign({ events: [event, event] }));
    await service.webhook(provider.source, sign({ events: [event] }));
    assert.equal((await knex('emails').where({ id: event.emailId }).first()).opened_count, 1);
    assert.equal((await knex('email_recipients').where({ id: recipientId })).length, 1);
  });
  it('retries a webhook lookup in a fresh transaction after the send saves its ID', async () => {
    delete event.emailId;
    await knex('email_batches').update({ mailgun_message_id: null });
    let failedLookup!: () => void;
    const firstLookup = new Promise<void>((resolve) => {
      failedLookup = resolve;
    });
    const original = EmailEventRepository.prototype.apply;
    const apply = sinon.stub(EmailEventRepository.prototype, 'apply').callsFake(async function (
      this: EmailEventRepository,
      ...args
    ) {
      try {
        return await original.apply(this, args);
      } catch (error) {
        failedLookup();
        throw error;
      }
    });
    const pending = service.webhook(provider.source, sign({ events: [event] }));
    await firstLookup;
    // This needs a DB connection, proving the failed transaction was released
    // before the delay. The second lookup must see the newly committed ID.
    await knex('email_batches').update({ mailgun_message_id: event.providerId });
    await pending;
    sinon.assert.calledTwice(apply);
    assert((await knex('email_recipients').where({ id: recipientId }).first()).delivered_at);
  });
  it('returns a temporary error after one retry and rolls back the whole notification', async () => {
    const apply = sinon.spy(EmailEventRepository.prototype, 'apply');
    await assert.rejects(
      service.webhook(provider.source, sign({ events: [event, { ...event, emailId: newId() }] })),
      { code: 'EMAIL_RECIPIENT_NOT_FOUND', statusCode: 503 },
    );
    assert.equal(apply.callCount, 4);
    assert.equal(
      (await knex('email_recipients').where({ id: recipientId }).first()).delivered_at,
      null,
    );
    assert.equal((await knex('emails').where({ id: event.emailId }).first()).delivered_count, 0);
  });
  it('rejects webhooks for a provider other than the active one', async () => {
    await assert.rejects(service.webhook('inactive-provider', sign({ events: [event] })), {
      statusCode: 404,
    });
    assert.equal(
      (await knex('email_recipients').where({ id: recipientId }).first()).delivered_at,
      null,
    );
  });
  it('distinguishes permanent rejection from a suppressible mailbox failure', async () => {
    event.type = 'failed';
    event.severity = 'permanent';
    await service.ingest([event]);
    assert.equal((await knex('suppressions')).length, 0);
    await service.ingest([{ ...event, id: 'invalid-mailbox', suppress: true }]);
    assert.equal((await knex('suppressions').where({ email: event.recipientEmail })).length, 1);
    assert.equal(
      Boolean((await knex('members').where({ id: memberId }).first()).email_disabled),
      true,
    );
  });
  it('continues processing a polling batch containing an unmatched recipient', async () => {
    await service.ingest([{ ...event, emailId: newId() }, event], 'newsletters');
    assert((await knex('email_recipients').where({ id: recipientId }).first()).delivered_at);
    assert.equal((await knex('emails').where({ id: event.emailId }).first()).delivered_count, 1);
  });
  it('keeps opaque message IDs case-sensitive', async () => {
    await service.ingest([{ ...event, emailId: undefined, providerId: 'Opaque-Message' }]);
    assert.equal(
      (await knex('email_recipients').where({ id: recipientId }).first()).delivered_at,
      null,
    );
  });
  it('does not suppress a member’s replacement address', async () => {
    await knex('members').where({ id: memberId }).update({ email: 'replacement@example.com' });
    await service.ingest([{ ...event, type: 'complained' }]);
    assert.equal(
      Boolean((await knex('members').where({ id: memberId }).first()).email_disabled),
      false,
    );
    assert.equal((await knex('suppressions').first()).email, event.recipientEmail);
  });
  it('records automation opens once and applies consent without touching newsletter subscriptions', async () => {
    const automationId = newId();
    const actionId = newId();
    const revisionId = newId();
    await knex('automations').insert({
      id: automationId,
      name: 'Test',
      slug: 'event-test',
      status: 'active',
      created_at: now,
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
    });
    const id = newId();
    await knex('automated_email_recipients').insert({
      id,
      member_id: memberId,
      member_uuid: randomUUID(),
      member_email: event.recipientEmail,
      mailgun_message_id: event.providerId,
      automation_action_revision_id: revisionId,
      track_opens: true,
      created_at: now,
    });
    await service.ingest([
      { ...event, family: 'automations', type: 'opened' },
      { ...event, id: 'second-open', family: 'automations', type: 'opened' },
    ]);
    assert((await knex('automated_email_recipients').where({ id }).first()).opened_at);
    assert.equal(
      (await knex('automation_action_revisions').where({ id: revisionId }).first())
        .email_opened_count,
      1,
    );
    await service.ingest([
      { ...event, id: 'unsubscribe', family: 'automations', type: 'unsubscribed' },
    ]);
    assert.equal(
      Boolean(
        (await knex('members').where({ id: memberId }).first()).enable_updates_and_announcements,
      ),
      false,
    );
    assert.equal((await knex('members_newsletters').where({ member_id: memberId })).length, 1);
  });
  it('routes gift outcomes through their repository and applies gift complaints', async () => {
    const models = require('../../../../core/server/models');
    const giftId = newId();
    const deliveryId = newId();
    const tier = await knex('products').first();
    await knex('gifts').insert({
      id: giftId,
      token: 'provider-event-gift',
      buyer_email: 'buyer@example.com',
      tier_id: tier.id,
      cadence: 'year',
      duration: 1,
      currency: 'usd',
      amount: 100,
      status: 'purchased',
    });
    await knex('gift_deliveries').insert({
      id: deliveryId,
      gift_id: giftId,
      recipient_email: event.recipientEmail,
      email_provider_message_id: event.providerId,
      status: 'sent',
    });
    const repository = new GiftDeliveryBookshelfRepository({
      GiftDeliveryModel: models.GiftDelivery,
      knex,
    });
    service = new EmailEventService({
      knex,
      queries,
      provider,
      gifts: { recordOutcome: (options) => repository.recordOutcome(options) },
    });
    await service.ingest([{ ...event, family: 'gifts' }]);
    assert.equal(
      (await knex('gift_deliveries').where({ id: deliveryId }).first()).outcome,
      'delivered',
    );
    assert.equal(await repository.getByProviderMessageId('Opaque-Message'), null);
    await service.ingest([{ ...event, id: 'gift-complaint', family: 'gifts', type: 'complained' }]);
    assert.equal((await knex('suppressions').first()).email, event.recipientEmail);
    assert.equal(
      Boolean((await knex('members').where({ id: memberId }).first()).email_disabled),
      true,
    );
  });
  it('uses existing subscription history to preserve a resubscribe when cleanup is retried', async () => {
    event.type = 'unsubscribed';
    provider.removeSuppression.rejects(new Error('Provider unavailable'));
    const request = sign({ events: [event] });
    await assert.rejects(service.webhook(provider.source, request), /Provider unavailable/);
    assert.equal((await knex('members_newsletters').where({ member_id: memberId })).length, 0);
    await knex('members_newsletters').insert({
      id: newId(),
      member_id: memberId,
      newsletter_id: newsletterId,
    });
    provider.removeSuppression.resolves();
    await service.webhook(provider.source, request);
    assert.equal((await knex('members_newsletters').where({ member_id: memberId })).length, 1);
    assert.equal((await knex('members_subscribe_events').where({ member_id: memberId })).length, 1);
    sinon.assert.calledTwice(provider.removeSuppression);
  });
  it('propagates aggregation failures and recomputes totals when the provider retries', async () => {
    const aggregate = sinon
      .stub(queries, 'aggregateEmailStats')
      .rejects(new Error('Database unavailable'));
    const request = sign({ events: [event] });
    await assert.rejects(service.webhook(provider.source, request), /Database unavailable/);
    assert((await knex('email_recipients').where({ id: recipientId }).first()).delivered_at);
    aggregate.restore();
    await service.webhook(provider.source, request);
    assert.equal((await knex('emails').where({ id: event.emailId }).first()).delivered_count, 1);
  });
});
