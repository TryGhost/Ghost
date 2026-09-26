import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import sinon from 'sinon';
import ObjectId from 'bson-objectid';
import type { Knex } from 'knex';
import errors from '@tryghost/errors';
import { EmailProviderBase, type EmailEvent, type EventSource } from '@tryghost/adapter-base-email';
import { AdapterManager } from '../../../../core/server/services/adapter-manager/adapter-manager';
import { EmailEventService } from '../../../../core/server/services/email-provider/event-service';
import { EmailInboxRepository } from '../../../../core/server/services/email-provider/inbox-repository';
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
      getSource: (source) => (source === provider.source ? provider : undefined),
      gifts: { recordOutcome: sinon.stub().resolves('recorded') },
      wake: sinon.stub().resolves(),
      logError: () => {},
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
      email_provider_source: provider.source,
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
  const retryNow = () =>
    knex('email_provider_events').where({ status: 'pending' }).update({ next_attempt_at: now });

  it('migrates existing tables and tolerates repeated up/down operations', async () => {
    const migration = require('../../../../core/server/data/migrations/versions/6.66/2026-09-25-23-51-52-add-email-provider-event-inbox');
    await migration.up({ connection: knex });
    await migration.down({ connection: knex });
    await migration.down({ connection: knex });
    assert.equal(await knex.schema.hasTable('email_provider_events'), false);
    await migration.up({ connection: knex });
    await migration.up({ connection: knex });
    assert.equal((await knex('email_batches').first()).email_provider_source, 'mailgun');
    assert.equal((await knex('email_recipients')).length, 1);
  });
  it('loads through AdapterManager and authenticates original bytes before durable acceptance', async () => {
    const request = sign({ events: [event] });
    await assert.rejects(
      service.webhook(provider.source, { ...request, body: Buffer.from('{}') }),
      /Invalid signature/,
    );
    assert.equal((await knex('email_provider_events')).length, 0);
    await service.webhook(provider.source, request);
    assert.equal((await knex('email_provider_events')).length, 1);
    assert.equal(
      (await knex('email_recipients').where({ id: recipientId }).first()).delivered_at,
      null,
    );
    await service.process();
    assert((await knex('email_recipients').where({ id: recipientId }).first()).delivered_at);
    assert.equal((await knex('emails').where({ id: event.emailId }).first()).delivered_count, 1);
    assert.equal((await knex('email_provider_events').first()).status, 'completed');
  });
  it('accepts verified handshakes without creating events', async () => {
    assert.deepEqual(await service.webhook(provider.source, sign({ handshake: true })), {
      response: { status: 200, body: 'verified' },
    });
    assert.equal((await knex('email_provider_events')).length, 0);
  });
  it('rejects a whole malformed notification without partially acknowledging it', async () => {
    await assert.rejects(
      service.webhook(provider.source, sign({ events: [event, { ...event, id: '' }] })),
    );
    assert.equal((await knex('email_provider_events')).length, 0);
  });
  it('deduplicates replayed events and counts opens once', async () => {
    event.type = 'opened';
    await service.ingest(provider.source, [event, event]);
    await service.process();
    await service.ingest(provider.source, [event]);
    await service.process();
    assert.equal((await knex('email_provider_events')).length, 1);
    assert.equal((await knex('emails').where({ id: event.emailId }).first()).opened_count, 1);
  });
  it('retries events that arrive before their send correlation exists', async () => {
    event.emailId = newId();
    await service.ingest(provider.source, [event]);
    await service.process();
    assert.equal((await knex('email_provider_events').first()).status, 'pending');
    assert.equal(
      (await knex('email_recipients').where({ id: recipientId }).first()).delivered_at,
      null,
    );
  });
  it('does not match the same message ID from another provider account', async () => {
    await knex('email_batches').update({ email_provider_source: 'another-account' });
    await service.ingest(provider.source, [event]);
    await service.process();
    assert.equal((await knex('email_provider_events').first()).status, 'pending');
    assert.equal(
      (await knex('email_recipients').where({ id: recipientId }).first()).delivered_at,
      null,
    );
  });
  it('distinguishes permanent rejection from a suppressible mailbox failure', async () => {
    event.type = 'failed';
    event.severity = 'permanent';
    await service.ingest(provider.source, [event]);
    await service.process();
    assert.equal((await knex('suppressions')).length, 0);
    await service.ingest(provider.source, [{ ...event, id: 'invalid-mailbox', suppress: true }]);
    await service.process();
    assert.equal((await knex('suppressions').where({ email: event.recipientEmail })).length, 1);
    assert.equal(
      Boolean((await knex('members').where({ id: memberId }).first()).email_disabled),
      true,
    );
  });
  it('keeps opaque message IDs case-sensitive', async () => {
    await service.ingest(provider.source, [
      { ...event, emailId: undefined, providerId: 'Opaque-Message' },
    ]);
    await service.process();
    assert.equal((await knex('email_provider_events').first()).status, 'pending');
    assert.equal(
      (await knex('email_recipients').where({ id: recipientId }).first()).delivered_at,
      null,
    );
  });
  it('does not suppress a member’s replacement address', async () => {
    await knex('members').where({ id: memberId }).update({ email: 'replacement@example.com' });
    await service.ingest(provider.source, [{ ...event, type: 'complained' }]);
    await service.process();
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
      email_provider_source: provider.source,
      automation_action_revision_id: revisionId,
      track_opens: true,
      created_at: now,
    });
    await service.ingest(provider.source, [
      { ...event, family: 'automations', type: 'opened' },
      { ...event, id: 'second-open', family: 'automations', type: 'opened' },
    ]);
    await service.process();
    assert((await knex('automated_email_recipients').where({ id }).first()).opened_at);
    assert.equal(
      (await knex('automation_action_revisions').where({ id: revisionId }).first())
        .email_opened_count,
      1,
    );
    await service.ingest(provider.source, [
      { ...event, id: 'unsubscribe', family: 'automations', type: 'unsubscribed' },
    ]);
    await service.process();
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
      email_provider_source: provider.source,
      status: 'sent',
    });
    const repository = new GiftDeliveryBookshelfRepository({
      GiftDeliveryModel: models.GiftDelivery,
      knex,
    });
    service = new EmailEventService({
      knex,
      queries,
      getSource: () => provider,
      gifts: { recordOutcome: (options) => repository.recordOutcome(options) },
      wake: async () => {},
      logError: () => {},
    });
    await service.ingest(provider.source, [{ ...event, family: 'gifts' }]);
    await service.process();
    assert.equal(
      (await knex('gift_deliveries').where({ id: deliveryId }).first()).outcome,
      'delivered',
    );
    assert.equal(
      await repository.getByProviderMessageId(event.providerId, 'another-account'),
      null,
    );
    assert.equal(await repository.getByProviderMessageId('Opaque-Message', provider.source), null);
    await service.ingest(provider.source, [
      { ...event, id: 'gift-complaint', family: 'gifts', type: 'complained' },
    ]);
    await service.process();
    assert.equal((await knex('suppressions').first()).email, event.recipientEmail);
    assert.equal(
      Boolean((await knex('members').where({ id: memberId }).first()).email_disabled),
      true,
    );
  });
  it('applies consent once and retries remote cleanup without undoing a later resubscribe', async () => {
    event.type = 'unsubscribed';
    provider.removeSuppression.rejects(new Error('Provider unavailable'));
    await service.ingest(provider.source, [event]);
    await service.process();
    assert.equal((await knex('members_newsletters').where({ member_id: memberId })).length, 0);
    await knex('members_newsletters').insert({
      id: newId(),
      member_id: memberId,
      newsletter_id: newsletterId,
    });
    provider.removeSuppression.resolves();
    await retryNow();
    await service.process();
    assert.equal((await knex('members_newsletters').where({ member_id: memberId })).length, 1);
    assert.equal((await knex('email_provider_events').first()).status, 'completed');
  });
  it('retries aggregation after effects have committed', async () => {
    const aggregate = sinon
      .stub(queries, 'aggregateEmailStats')
      .rejects(new Error('Database unavailable'));
    await service.ingest(provider.source, [event]);
    await service.process();
    assert((await knex('email_provider_events').first()).applied_at);
    aggregate.restore();
    await retryNow();
    await service.process();
    assert.equal((await knex('emails').where({ id: event.emailId }).first()).delivered_count, 1);
    assert.equal((await knex('email_provider_events').first()).status, 'completed');
  });
  it('recovers expired leases and fences stale workers', async () => {
    const inbox = new EmailInboxRepository(knex);
    await inbox.enqueue(provider.source, [event], new Date(now + 'Z'));
    const first = await inbox.claim(new Date('2026-09-01T12:00:01Z'));
    assert(first);
    const second = await inbox.claim(new Date('2026-09-01T12:06:00Z'));
    assert(second);
    assert.notEqual(first.token, second.token);
    const apply = sinon.stub().resolves({});
    assert.equal(await inbox.apply(first, apply), null);
    sinon.assert.notCalled(apply);
    await inbox.complete(first);
    assert.equal((await knex('email_provider_events').first()).status, 'processing');
  });
});
