const assert = require('node:assert/strict');
const { agentProvider, fixtureManager } = require('../../../utils/e2e-framework');
const db = require('../../../../core/server/data/db');
const NewsletterEmailEventStorage = require('../../../../core/server/services/email-service/newsletter-email-event-storage');
const BatchSendingService = require('../../../../core/server/services/email-service/batch-sending-service');
const {
  EmailDeliveredEvent,
} = require('../../../../core/server/services/email-service/events/email-delivered-event');
const {
  EmailOpenedEvent,
} = require('../../../../core/server/services/email-service/events/email-opened-event');
const {
  EmailBouncedEvent,
} = require('../../../../core/server/services/email-service/events/email-bounced-event');

describe('NewsletterEmailEventStorage transaction crash recovery', function () {
  let models;
  let recipient;
  let emailId;
  let memberId;

  beforeAll(async function () {
    await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('newsletters', 'members:newsletters', 'members:emails');
    models = require('../../../../core/server/models');
    recipient = fixtureManager.get('email_recipients', 0);
    emailId = recipient.email_id;
    memberId = recipient.member_id;
  });

  beforeEach(async function () {
    await db.knex('email_recipient_failures').where({ email_recipient_id: recipient.id }).delete();
    await db.knex('email_recipients').where({ id: recipient.id }).update({
      delivered_at: null,
      opened_at: null,
      failed_at: null,
    });
    await db.knex('emails').where({ id: emailId }).update({
      delivered_count: 0,
      opened_count: 0,
      failed_count: 0,
    });
    await db.knex('members').where({ id: memberId }).update({
      email_tracked_count: 5,
      email_opened_count: 0,
      email_open_rate: 0,
      last_seen_at: null,
    });
  });

  function createStorage(flushStageHook) {
    return new NewsletterEmailEventStorage({
      config: { get: () => true },
      db,
      models: {
        EmailRecipientFailure: models.EmailRecipientFailure,
      },
      flushStageHook,
    });
  }

  async function queueAllTransitions(storage) {
    const eventData = {
      email: recipient.member_email,
      memberId,
      emailId,
      emailRecipientId: recipient.id,
      timestamp: new Date('2026-08-31T08:00:00.000Z'),
    };
    await storage.handleDelivered(EmailDeliveredEvent.create(eventData));
    await storage.handleOpened(EmailOpenedEvent.create(eventData));
    await storage.handlePermanentFailed(
      EmailBouncedEvent.create({
        ...eventData,
        id: 'forced-crash-event',
        error: { code: 550, enhancedCode: '5.1.1', message: 'Synthetic failure' },
      }),
    );
  }

  async function readState() {
    const storedRecipient = await db.knex('email_recipients').where({ id: recipient.id }).first();
    const email = await db.knex('emails').where({ id: emailId }).first();
    const member = await db.knex('members').where({ id: memberId }).first();
    return {
      recipient: storedRecipient,
      email,
      member,
    };
  }

  function assertUnchanged(state) {
    assert.equal(state.recipient.delivered_at, null);
    assert.equal(state.recipient.opened_at, null);
    assert.equal(state.recipient.failed_at, null);
    assert.equal(state.email.delivered_count, 0);
    assert.equal(state.email.opened_count, 0);
    assert.equal(state.email.failed_count, 0);
    assert.equal(state.member.email_opened_count, 0);
    assert.equal(state.member.email_open_rate, 0);
    assert.equal(state.member.last_seen_at, null);
  }

  function assertCommittedOnce(state) {
    assert.notEqual(state.recipient.delivered_at, null);
    assert.notEqual(state.recipient.opened_at, null);
    assert.notEqual(state.recipient.failed_at, null);
    assert.equal(state.email.delivered_count, 1);
    assert.equal(state.email.opened_count, 1);
    assert.equal(state.email.failed_count, 1);
    assert.equal(state.member.email_opened_count, 1);
    assert.equal(state.member.email_open_rate, 20);
    assert.notEqual(state.member.last_seen_at, null);
  }

  for (const crashStage of [
    'after-lock',
    'after-recipient-update',
    'after-email-update',
    'after-member-update',
    'before-commit',
    'after-commit',
  ]) {
    it(`replays safely after a crash ${crashStage}`, async function () {
      let crashed = false;
      const storage = createStorage((stage) => {
        if (!crashed && stage === crashStage) {
          crashed = true;
          throw new Error(`Forced crash ${stage}`);
        }
      });
      await queueAllTransitions(storage);

      await assert.rejects(storage.flushBatchedUpdates(), /Forced crash/);
      const stateAfterCrash = await readState();
      if (crashStage === 'after-commit') {
        assertCommittedOnce(stateAfterCrash);
      } else {
        assertUnchanged(stateAfterCrash);
      }

      await storage.flushBatchedUpdates();
      assertCommittedOnce(await readState());
    });
  }

  it('counts duplicate opens once and keeps the earliest timestamp', async function () {
    const storage = createStorage();
    const baseEvent = {
      email: recipient.member_email,
      memberId,
      emailId,
      emailRecipientId: recipient.id,
    };
    await storage.handleOpened(
      EmailOpenedEvent.create({ ...baseEvent, timestamp: new Date('2026-08-31T09:00:00.000Z') }),
    );
    await storage.handleOpened(
      EmailOpenedEvent.create({ ...baseEvent, timestamp: new Date('2026-08-31T08:00:00.000Z') }),
    );
    await storage.flushBatchedUpdates();

    await storage.handleOpened(
      EmailOpenedEvent.create({ ...baseEvent, timestamp: new Date('2026-09-01T10:00:00.000Z') }),
    );
    await storage.flushBatchedUpdates();

    const state = await readState();
    if (state.recipient.opened_at instanceof Date) {
      assert.equal(state.recipient.opened_at.toISOString(), '2026-08-31T08:00:00.000Z');
    } else {
      assert.match(String(state.recipient.opened_at), /2026-08-31 08:00:00/);
    }
    assert.equal(state.email.opened_count, 1);
    assert.equal(state.member.email_opened_count, 1);
    assert.equal(state.member.email_open_rate, 20);
    if (state.member.last_seen_at instanceof Date) {
      assert.equal(state.member.last_seen_at.toISOString(), '2026-09-01T10:00:00.000Z');
    } else {
      assert.match(String(state.member.last_seen_at), /2026-09-01 10:00:00/);
    }
  });
});

describe('BatchSendingService recipient counter crash recovery', function () {
  let models;
  let email;
  let member;

  beforeAll(async function () {
    await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('newsletters', 'members:newsletters', 'members:emails');
    models = require('../../../../core/server/models');
    const fixtureEmail = fixtureManager.get('emails', 0);
    email = await models.Email.findOne({ id: fixtureEmail.id }, { require: true });
    await email.save({ track_opens: true }, { patch: true });
    const fixtureMember = fixtureManager.get('members', 0);
    member = await models.Member.findOne({ id: fixtureMember.id }, { require: true });
  });

  beforeEach(async function () {
    await db.knex('members').where({ id: member.id }).update({
      email_count: 10,
      email_tracked_count: 5,
      email_opened_count: 2,
      email_open_rate: 40,
    });
  });

  for (const crashStage of ['after-recipient-insert', 'after-member-counter-update']) {
    it(`rolls back recipient creation after a crash ${crashStage}`, async function () {
      let crashed = false;
      const service = new BatchSendingService({
        models: { EmailBatch: models.EmailBatch },
        db,
        createBatchStageHook(stage) {
          if (!crashed && stage === crashStage) {
            crashed = true;
            throw new Error(`Forced crash ${stage}`);
          }
        },
      });
      const batchesBefore = await db
        .knex('email_batches')
        .where({ email_id: email.id })
        .count('* as count')
        .first();
      const recipientsBefore = await db
        .knex('email_recipients')
        .where({ email_id: email.id })
        .count('* as count')
        .first();

      await assert.rejects(service.createBatch(email, null, [member.toJSON()], {}), /Forced crash/);

      const memberAfterCrash = await db.knex('members').where({ id: member.id }).first();
      assert.equal(memberAfterCrash.email_count, 10);
      assert.equal(memberAfterCrash.email_tracked_count, 5);
      assert.equal(memberAfterCrash.email_open_rate, 40);
      assert.equal(
        Number(
          (await db.knex('email_batches').where({ email_id: email.id }).count('* as count').first())
            .count,
        ),
        Number(batchesBefore.count),
      );
      assert.equal(
        Number(
          (
            await db
              .knex('email_recipients')
              .where({ email_id: email.id })
              .count('* as count')
              .first()
          ).count,
        ),
        Number(recipientsBefore.count),
      );

      const batch = await service.createBatch(email, null, [member.toJSON()], {});
      const memberAfterRetry = await db.knex('members').where({ id: member.id }).first();
      assert.equal(memberAfterRetry.email_count, 11);
      assert.equal(memberAfterRetry.email_tracked_count, 6);
      assert.equal(memberAfterRetry.email_open_rate, 33);

      await db.knex('email_recipients').where({ batch_id: batch.id }).delete();
      await models.EmailBatch.destroy({ id: batch.id });
    });
  }

  it('preserves the visible rate until the tracked denominator is reconciled', async function () {
    await db.knex('members').where({ id: member.id }).update({
      email_count: 10,
      email_tracked_count: null,
      email_opened_count: 2,
      email_open_rate: 40,
    });
    const service = new BatchSendingService({
      models: { EmailBatch: models.EmailBatch },
      db,
    });

    const batch = await service.createBatch(email, null, [member.toJSON()], {});
    const updatedMember = await db.knex('members').where({ id: member.id }).first();
    assert.equal(updatedMember.email_count, 11);
    assert.equal(updatedMember.email_tracked_count, null);
    assert.equal(updatedMember.email_open_rate, 40);

    await db.knex('email_recipients').where({ batch_id: batch.id }).delete();
    await models.EmailBatch.destroy({ id: batch.id });
  });
});
