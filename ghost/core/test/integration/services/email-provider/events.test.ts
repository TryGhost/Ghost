import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import sinon from 'sinon';
import ObjectId from 'bson-objectid';
import type { Knex } from 'knex';
import errors from '@tryghost/errors';
import { EmailProviderBase, type EmailEvent, type EventSource } from '@tryghost/adapter-base-email';
import { AdapterManager } from '../../../../core/server/services/adapter-manager/adapter-manager';
import { EmailEventService } from '../../../../core/server/services/email-provider/event-service';
import { createDatabaseAutomationsRepository } from '../../../../core/server/services/automations/database-automations-repository';
import { AutomationEmailAnalyticsBatchProcessor } from '../../../../core/server/services/email-analytics/automation-email-analytics-batch-processor';
import { GiftEmailAnalyticsBatchProcessor } from '../../../../core/server/services/email-analytics/gift-email-analytics-batch-processor';
import { EventProcessingResult } from '../../../../core/server/services/email-analytics/event-processing-result';
const EmailEventProcessor = require('../../../../core/server/services/email-service/email-event-processor');
const NewsletterEmailEventStorage = require('../../../../core/server/services/email-service/newsletter-email-event-storage');
const {
  NewsletterEmailAnalyticsBatchProcessor,
} = require('../../../../core/server/services/email-analytics/newsletter-email-analytics-batch-processor');
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
  let suppression: any;
  let membersRepository: any;
  let createEventProcessor: (family: string) => any;
  let giftDeliveryService: {
    recordOutcome: (options: any) => Promise<any>;
    getRecipientEmailForMessage: (id: string) => Promise<string | null>;
  };
  const domainEvents = { dispatch: sinon.stub() };

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
    get.withArgs('emailAnalytics:batchProcessing').returns(true);
    const automationsApi = createDatabaseAutomationsRepository({
      knex,
      fakeWaitHoursMultiplier: null,
    });
    giftDeliveryService = {
      recordOutcome: sinon.stub().resolves('recorded'),
      getRecipientEmailForMessage: sinon.stub().resolves('reader@example.com'),
    };
    const models = require('../../../../core/server/models');
    const MemberRepository = require('../../../../core/server/services/members/members-api/repositories/member-repository');
    membersRepository = new MemberRepository({
      Member: models.Member,
      MemberSubscribeEventModel: models.MemberSubscribeEvent,
      MemberEmailChangeEvent: models.MemberEmailChangeEvent,
      MemberStatusEvent: models.MemberStatusEvent,
      stripeAPIService: { configured: false },
    });
    const SuppressionService = require('../../../../core/server/services/email-suppression-list/mailgun-email-suppression-list');
    suppression = new SuppressionService({
      Suppression: models.Suppression,
      membersRepository,
      apiClient: {
        removeComplaint: (email: string) => provider.removeSuppression(email, 'complaint'),
        removeUnsubscribe: (email: string) => provider.removeSuppression(email, 'unsubscribe'),
      },
    });
    createEventProcessor = (family) => {
      if (family === 'automations') {
        return new AutomationEmailAnalyticsBatchProcessor({
          automationsApi,
          emailSuppressionList: suppression,
          membersRepository,
        });
      }
      if (family === 'gifts') {
        return new GiftEmailAnalyticsBatchProcessor({
          giftDeliveryService,
          emailSuppressionList: suppression,
        });
      }
      const emailEventProcessor = new EmailEventProcessor({
        domainEvents,
        db: { knex },
        eventStorage: new NewsletterEmailEventStorage({
          config,
          db: { knex },
          models: require('../../../../core/server/models'),
          membersRepository,
          emailSuppressionList: suppression,
        }),
      });
      return new NewsletterEmailAnalyticsBatchProcessor({ config, queries, emailEventProcessor });
    };
    service = new EmailEventService({ provider, createEventProcessor });
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
  it('retries after the send saves its ID without holding a connection', async () => {
    delete event.emailId;
    await knex('email_batches').update({ mailgun_message_id: null });
    let failedLookup!: () => void;
    const firstLookup = new Promise<void>((resolve) => {
      failedLookup = resolve;
    });
    const original = EmailEventProcessor.prototype.handleDelivered;
    const apply = sinon
      .stub(EmailEventProcessor.prototype, 'handleDelivered')
      .callsFake(async function (this: any, ...args: any[]) {
        const result = await original.apply(this, args);
        if (!result) {
          failedLookup();
        }
        return result;
      });
    const pending = service.webhook(provider.source, sign({ events: [event] }));
    await firstLookup;
    await knex('email_batches').update({ mailgun_message_id: event.providerId });
    await pending;
    sinon.assert.calledTwice(apply);
    assert((await knex('email_recipients').where({ id: recipientId }).first()).delivered_at);
  });
  it('returns 503 for a missing recipient and preserves completed events and aggregates', async () => {
    const apply = sinon.spy(EmailEventProcessor.prototype, 'handleDelivered');
    await assert.rejects(
      service.webhook(provider.source, sign({ events: [event, { ...event, emailId: newId() }] })),
      { statusCode: 503 },
    );
    assert.equal(apply.callCount, 3);
    assert((await knex('email_recipients').where({ id: recipientId }).first()).delivered_at);
    assert.equal((await knex('emails').where({ id: event.emailId }).first()).delivered_count, 1);
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
  it('keeps polling counts and skips missing recipients through the newsletter processor', async () => {
    const processor = createEventProcessor('newsletters');
    const result = new EventProcessingResult();
    await processor.processBatch([{ ...event, emailId: newId() }, event], result, {});
    assert.equal(result.delivered, 1);
    assert.equal(result.unprocessable, 1);
    await processor.aggregate({
      includeOpenedEvents: true,
      processingResult: result,
      isFinal: true,
    });
    assert.equal((await knex('emails').where({ id: event.emailId }).first()).delivered_count, 1);
  });
  it('preserves opaque IDs when resolving newsletter recipients', async () => {
    const result = new EventProcessingResult();
    await createEventProcessor('newsletters').processBatch(
      [{ ...event, emailId: undefined, providerId: 'Opaque-Message' }],
      result,
      {},
    );
    assert.equal(result.unprocessable, 1);
    assert.equal(
      (await knex('email_recipients').where({ id: recipientId }).first()).delivered_at,
      null,
    );
  });
  async function seedAutomationRecipient() {
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
    return { id, revisionId };
  }

  async function seedGiftDelivery() {
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
    giftDeliveryService = {
      recordOutcome: (options) => repository.recordOutcome(options),
      getRecipientEmailForMessage: async (id) =>
        (await repository.getByProviderMessageId(id))?.recipientEmail ?? null,
    };
    return { deliveryId, repository };
  }

  it('records automation opens through the existing repository without double counting', async () => {
    const { id, revisionId } = await seedAutomationRecipient();
    const events = [{ ...event, family: 'automations', type: 'opened' }];
    await service.webhook(provider.source, sign({ events }));
    await service.webhook(provider.source, sign({ events }));
    assert((await knex('automated_email_recipients').where({ id }).first()).opened_at);
    assert.equal(
      (await knex('automation_action_revisions').where({ id: revisionId }).first())
        .email_opened_count,
      1,
    );
  });
  it('routes gift outcomes through the existing gift processor and repository', async () => {
    const { deliveryId, repository } = await seedGiftDelivery();
    await service.webhook(provider.source, sign({ events: [{ ...event, family: 'gifts' }] }));
    assert.equal(
      (await knex('gift_deliveries').where({ id: deliveryId }).first()).outcome,
      'delivered',
    );
    assert.equal(await repository.getByProviderMessageId('Opaque-Message'), null);
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
  it('waits for suppression and member updates before acknowledging a complaint', async () => {
    let complete!: () => void;
    let started!: () => void;
    const updating = new Promise<void>((resolve) => {
      started = resolve;
    });
    const update = membersRepository.update.bind(membersRepository);
    sinon.stub(membersRepository, 'update').callsFake(async (...args: any[]) => {
      started();
      await new Promise<void>((resolve) => {
        complete = resolve;
      });
      return update(...args);
    });
    let acknowledged = false;
    const pending = service
      .webhook(provider.source, sign({ events: [{ ...event, type: 'complained' }] }))
      .then(() => {
        acknowledged = true;
      });
    await updating;
    assert.equal(acknowledged, false);
    sinon.assert.notCalled(provider.removeSuppression);
    complete();
    await pending;
    assert.equal((await knex('suppressions').where({ email: event.recipientEmail })).length, 1);
    assert.equal(
      Boolean((await knex('members').where({ id: memberId }).first()).email_disabled),
      true,
    );
    sinon.assert.calledOnce(provider.removeSuppression);
  });

  it('rolls back suppression on a member update failure and safely retries a complaint', async () => {
    const update = sinon
      .stub(membersRepository, 'update')
      .rejects(new Error('Database unavailable'));
    const request = sign({ events: [{ ...event, type: 'complained' }] });
    await assert.rejects(service.webhook(provider.source, request), { statusCode: 503 });
    assert.equal((await knex('suppressions').where({ email: event.recipientEmail })).length, 0);
    sinon.assert.notCalled(provider.removeSuppression);
    update.restore();
    await service.webhook(provider.source, request);
    // Repair drift on replay without a second suppression or complaint record.
    await knex('members').where({ id: memberId }).update({ email_disabled: false });
    await service.webhook(provider.source, request);
    assert.equal((await knex('suppressions').where({ email: event.recipientEmail })).length, 1);
    assert.equal(
      (await knex('email_spam_complaint_events').where({ member_id: memberId })).length,
      1,
    );
    assert.equal(
      Boolean((await knex('members').where({ id: memberId }).first()).email_disabled),
      true,
    );
  });

  it('keeps the replacement address enabled when an old address is suppressed', async () => {
    await knex('members').where({ id: memberId }).update({ email: 'replacement@example.com' });
    await service.webhook(
      provider.source,
      sign({ events: [{ ...event, type: 'failed', severity: 'permanent', suppress: true }] }),
    );
    assert.equal((await knex('suppressions').where({ email: event.recipientEmail })).length, 1);
    assert.equal(
      Boolean((await knex('members').where({ id: memberId }).first()).email_disabled),
      false,
    );
  });

  it('uses explicit mailbox classification instead of treating every permanent failure as suppressible', async () => {
    const failure = {
      ...event,
      type: 'failed',
      severity: 'permanent',
      error: { code: 'mailbox-missing', message: 'Mailbox unavailable' },
    };
    await service.webhook(provider.source, sign({ events: [failure] }));
    assert.equal((await knex('suppressions')).length, 0);
    await service.webhook(provider.source, sign({ events: [{ ...failure, suppress: true }] }));
    assert.equal((await knex('suppressions').where({ email: event.recipientEmail })).length, 1);
    assert.equal(
      Boolean((await knex('members').where({ id: memberId }).first()).email_disabled),
      true,
    );
  });
  it('returns 503 when saving the suppression fails before updating a member or cleaning up', async () => {
    const models = require('../../../../core/server/models');
    const save = sinon
      .stub(models.Suppression, 'add')
      .rejects(new Error('Suppression database unavailable'));
    const update = sinon.spy(membersRepository, 'update');
    const request = sign({ events: [{ ...event, type: 'complained' }] });
    await assert.rejects(service.webhook(provider.source, request), { statusCode: 503 });
    sinon.assert.notCalled(update);
    sinon.assert.notCalled(provider.removeSuppression);
    save.restore();
    await service.webhook(provider.source, request);
    assert.equal(
      Boolean((await knex('members').where({ id: memberId }).first()).email_disabled),
      true,
    );
  });

  it('keeps local suppression when provider cleanup fails and retries cleanup on replay', async () => {
    provider.removeSuppression.rejects(new Error('Provider unavailable'));
    const request = sign({ events: [{ ...event, type: 'complained' }] });
    await assert.rejects(service.webhook(provider.source, request), { statusCode: 503 });
    assert.equal((await knex('suppressions').where({ email: event.recipientEmail })).length, 1);
    assert.equal(
      Boolean((await knex('members').where({ id: memberId }).first()).email_disabled),
      true,
    );
    provider.removeSuppression.resolves();
    await service.webhook(provider.source, request);
    sinon.assert.calledTwice(provider.removeSuppression);
    assert.equal(
      (await knex('email_spam_complaint_events').where({ member_id: memberId })).length,
      1,
    );
  });

  it('applies automation unsubscribe before cleanup and preserves newsletters and replacement addresses', async () => {
    await seedAutomationRecipient();
    const request = sign({ events: [{ ...event, family: 'automations', type: 'unsubscribed' }] });
    const update = sinon
      .stub(membersRepository, 'update')
      .rejects(new Error('Preference write failed'));
    await assert.rejects(service.webhook(provider.source, request), /Preference write failed/);
    sinon.assert.notCalled(provider.removeSuppression);
    assert.equal(
      Boolean(
        (await knex('members').where({ id: memberId }).first()).enable_updates_and_announcements,
      ),
      true,
    );
    update.restore();
    provider.removeSuppression.rejects(new Error('Cleanup failed'));
    await assert.rejects(service.webhook(provider.source, request), { statusCode: 503 });
    assert.equal(
      Boolean(
        (await knex('members').where({ id: memberId }).first()).enable_updates_and_announcements,
      ),
      false,
    );
    assert.equal((await knex('members_newsletters').where({ member_id: memberId })).length, 1);
    provider.removeSuppression.resolves();
    await service.webhook(provider.source, request);
    await knex('members')
      .where({ id: memberId })
      .update({ email: 'replacement@example.com', enable_updates_and_announcements: true });
    await service.webhook(provider.source, request);
    assert.equal(
      Boolean(
        (await knex('members').where({ id: memberId }).first()).enable_updates_and_announcements,
      ),
      true,
    );
  });

  it('awaits automation suppression and repairs failed or duplicate callbacks', async () => {
    await seedAutomationRecipient();
    const complaint = sign({ events: [{ ...event, family: 'automations', type: 'complained' }] });
    const update = sinon
      .stub(membersRepository, 'update')
      .rejects(new Error('Member write failed'));
    await assert.rejects(service.webhook(provider.source, complaint), { statusCode: 503 });
    assert.equal((await knex('suppressions')).length, 0);
    sinon.assert.notCalled(provider.removeSuppression);
    update.restore();
    await service.webhook(provider.source, complaint);
    await service.webhook(provider.source, complaint);
    assert.equal((await knex('suppressions')).length, 1);
    assert.equal(
      Boolean((await knex('members').where({ id: memberId }).first()).email_disabled),
      true,
    );
    // A permanent policy rejection must not disable the address.
    await knex('members').where({ id: memberId }).update({ email_disabled: false });
    const failure = { ...event, family: 'automations', type: 'failed', severity: 'permanent' };
    await service.webhook(provider.source, sign({ events: [failure] }));
    assert.equal(
      Boolean((await knex('members').where({ id: memberId }).first()).email_disabled),
      false,
    );
    await service.webhook(provider.source, sign({ events: [{ ...failure, suppress: true }] }));
    assert.equal(
      Boolean((await knex('members').where({ id: memberId }).first()).email_disabled),
      true,
    );
  });

  it('applies gift safety events even when the delivery outcome is stale and ignores unrelated consent events', async () => {
    const { deliveryId } = await seedGiftDelivery();
    await service.webhook(provider.source, sign({ events: [{ ...event, family: 'gifts' }] }));
    const failure = {
      ...event,
      family: 'gifts',
      type: 'failed',
      severity: 'permanent',
      suppress: true,
      timestamp: new Date(event.timestamp.getTime() - 1000),
    };
    await service.webhook(provider.source, sign({ events: [failure] }));
    assert.equal(
      (await knex('gift_deliveries').where({ id: deliveryId }).first()).outcome,
      'delivered',
    );
    assert.equal((await knex('suppressions')).length, 1);
    assert.equal(
      Boolean((await knex('members').where({ id: memberId }).first()).email_disabled),
      true,
    );
    provider.removeSuppression.rejects(new Error('Cleanup failed'));
    const complaint = sign({ events: [{ ...event, family: 'gifts', type: 'complained' }] });
    await assert.rejects(service.webhook(provider.source, complaint), { statusCode: 503 });
    provider.removeSuppression.resolves();
    await service.webhook(provider.source, complaint);
    provider.removeSuppression.resetHistory();
    await service.webhook(
      provider.source,
      sign({
        events: [
          { ...event, family: 'gifts', type: 'opened' },
          { ...event, family: 'gifts', type: 'unsubscribed' },
        ],
      }),
    );
    sinon.assert.notCalled(provider.removeSuppression);
    assert.equal((await knex('members_newsletters').where({ member_id: memberId })).length, 1);
    assert.equal(
      Boolean(
        (await knex('members').where({ id: memberId }).first()).enable_updates_and_announcements,
      ),
      true,
    );
  });
});
