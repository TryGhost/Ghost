const assert = require('node:assert/strict');
const { agentProvider, fixtureManager } = require('../../../utils/e2e-framework');
const db = require('../../../../core/server/data/db');
const models = require('../../../../core/server/models');
const NewsletterEmailEventStorage = require('../../../../core/server/services/email-service/newsletter-email-event-storage');
const BatchSendingService = require('../../../../core/server/services/email-service/batch-sending-service');
const EmailEventProcessor = require('../../../../core/server/services/email-service/email-event-processor');
const {
  NewsletterEmailAnalyticsBatchProcessor,
} = require('../../../../core/server/services/email-analytics/newsletter-email-analytics-batch-processor');
const {
  EventProcessingResult,
} = require('../../../../core/server/services/email-analytics/event-processing-result');
const {
  EmailDeliveredEvent,
} = require('../../../../core/server/services/email-service/events/email-delivered-event');
const {
  EmailBouncedEvent,
} = require('../../../../core/server/services/email-service/events/email-bounced-event');
const {
  EmailOpenedEvent,
} = require('../../../../core/server/services/email-service/events/email-opened-event');

describe('Newsletter event flush', function () {
  let recipient;
  let storage;

  beforeAll(async function () {
    await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('newsletters', 'members:newsletters', 'members:emails');
    recipient = fixtureManager.get('email_recipients', 0);
  });

  beforeEach(async function () {
    await models.EmailRecipient.edit(
      { opened_at: null, delivered_at: null, failed_at: null },
      { id: recipient.id },
    );
    storage = new NewsletterEmailEventStorage({
      config: { get: () => true },
      db,
      models,
    });
  });

  it('keeps replayed members available for recount until counter updates are atomic', async function () {
    const processor = new NewsletterEmailAnalyticsBatchProcessor({
      config: { get: () => true },
      emailEventProcessor: new EmailEventProcessor({
        db,
        eventStorage: storage,
        domainEvents: { dispatch() {} },
      }),
    });
    const event = {
      type: 'opened',
      emailId: recipient.email_id,
      recipientEmail: recipient.member_email,
      timestamp: new Date('2026-09-01T12:00:00.000Z'),
    };
    const first = new EventProcessingResult();
    await processor.processBatch([event, event], first, {});
    assert.equal(first.opened, 2);
    assert.deepEqual(first.memberIds, [recipient.member_id]);
    const replay = new EventProcessingResult();
    const cursor = {};
    await processor.processBatch([event], replay, cursor);
    assert.equal(replay.opened, 1);
    assert.deepEqual(replay.memberIds, [recipient.member_id]);
    assert.deepEqual(cursor, { lastEventTimestamp: event.timestamp });
  });

  it('retains committed members and the old cursor when a later email fails, then replays safely', async function () {
    const secondEmail = fixtureManager.get('emails', 1);
    const batch = await models.EmailBatch.add({ email_id: secondEmail.id, status: 'pending' });
    const second = await models.EmailRecipient.add({
      ...fixtureManager.get('email_recipients', 1),
      id: undefined,
      email_id: secondEmail.id,
      batch_id: batch.id,
      opened_at: null,
    });
    const rows = [recipient, second.toJSON()].sort((a, b) => a.email_id.localeCompare(b.email_id));
    const processor = new NewsletterEmailAnalyticsBatchProcessor({
      config: { get: () => true },
      emailEventProcessor: new EmailEventProcessor({
        db,
        eventStorage: storage,
        domainEvents: { dispatch() {} },
      }),
    });
    const events = rows.toReversed().map((row) => ({
      type: 'opened',
      emailId: row.email_id,
      recipientEmail: row.member_email,
      timestamp: new Date('2026-09-01T12:00:00.000Z'),
    }));
    const result = new EventProcessingResult();
    const previous = new Date('2026-09-01T11:00:00.000Z');
    const cursor = { lastEventTimestamp: previous };
    try {
      await db.knex.raw(
        `CREATE TRIGGER reject_later_email BEFORE UPDATE ON email_recipients
        FOR EACH ROW BEGIN
          IF NEW.email_id = ? AND NEW.opened_at IS NOT NULL THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'later email failed';
          END IF;
        END`,
        [rows[1].email_id],
      );
      try {
        await assert.rejects(processor.processBatch(events, result, cursor), /later email failed/);
        assert.deepEqual(
          result.memberIds,
          rows.toReversed().map((row) => row.member_id),
        );
        assert.equal(cursor.lastEventTimestamp, previous);
        const committed = await models.EmailRecipient.findOne(
          { id: rows[0].id },
          { require: true },
        );
        assert.equal(committed.get('opened_at').toISOString(), events[0].timestamp.toISOString());
      } finally {
        await db.knex.raw('DROP TRIGGER reject_later_email');
      }
      const replay = new EventProcessingResult();
      await processor.processBatch(events, replay, cursor);
      assert.equal(replay.opened, 2);
      assert.deepEqual(
        replay.memberIds,
        rows.toReversed().map((row) => row.member_id),
      );
      assert.equal(cursor.lastEventTimestamp, events[0].timestamp);
    } finally {
      await models.EmailRecipient.destroy({ id: second.id });
      await models.EmailBatch.destroy({ id: batch.id });
    }
  });

  it('keeps recount candidates when a commit succeeds but its acknowledgement is lost', async function () {
    const lostAckStorage = new NewsletterEmailEventStorage({
      config: { get: () => true },
      models,
      db: {
        knex: {
          transaction: async (callback) => {
            await db.knex.transaction(callback);
            throw Object.assign(new Error('commit acknowledgement lost'), { code: 'ECONNRESET' });
          },
        },
      },
    });
    const processor = new NewsletterEmailAnalyticsBatchProcessor({
      config: { get: () => true },
      emailEventProcessor: new EmailEventProcessor({
        db,
        eventStorage: lostAckStorage,
        domainEvents: { dispatch() {} },
      }),
    });
    const event = {
      type: 'opened',
      emailId: recipient.email_id,
      recipientEmail: recipient.member_email,
      timestamp: new Date('2026-09-01T12:00:00.000Z'),
    };
    const result = new EventProcessingResult();
    const cursor = {};
    await assert.rejects(processor.processBatch([event], result, cursor), /acknowledgement lost/);
    assert.deepEqual(result.memberIds, [recipient.member_id]);
    assert.deepEqual(cursor, {});
    const committed = await models.EmailRecipient.findOne({ id: recipient.id }, { require: true });
    assert.equal(committed.get('opened_at').toISOString(), event.timestamp.toISOString());

    const restarted = new NewsletterEmailAnalyticsBatchProcessor({
      config: { get: () => true },
      emailEventProcessor: new EmailEventProcessor({
        db,
        eventStorage: storage,
        domainEvents: { dispatch() {} },
      }),
    });
    const replay = new EventProcessingResult();
    await restarted.processBatch([event], replay, {});
    assert.deepEqual(replay.memberIds, [recipient.member_id]);
  });

  it('returns only the first open transition when events are duplicated and replayed', async function () {
    const firstOpen = new Date('2026-09-01T12:00:00.000Z');
    const event = (timestamp) =>
      EmailOpenedEvent.create({
        email: recipient.member_email,
        emailRecipientId: recipient.id,
        emailId: recipient.email_id,
        memberId: recipient.member_id,
        timestamp,
      });

    await storage.handleOpened(event(new Date('2026-09-01T12:01:00.000Z')));
    await storage.handleOpened(event(firstOpen));

    assert.deepEqual(await storage.flushBatchedUpdates(), [
      {
        emailId: recipient.email_id,
        delivered: [],
        opened: [{ recipientId: recipient.id, memberId: recipient.member_id }],
        failed: [],
      },
    ]);
    const saved = await models.EmailRecipient.findOne({ id: recipient.id }, { require: true });
    assert.equal(saved.get('opened_at').toISOString(), firstOpen.toISOString());

    await storage.handleOpened(event(firstOpen));
    assert.deepEqual(await storage.flushBatchedUpdates(), []);
    assert.deepEqual(await storage.flushBatchedUpdates(), []);
  });

  it('rolls back every transition for an email and can retry the failed flush', async function () {
    const data = {
      email: recipient.member_email,
      emailRecipientId: recipient.id,
      emailId: recipient.email_id,
      memberId: recipient.member_id,
      timestamp: new Date('2026-09-01T12:00:00.000Z'),
    };
    await storage.handleDelivered(EmailDeliveredEvent.create(data));
    await storage.handleOpened(EmailOpenedEvent.create(data));
    await storage.handlePermanentFailed(EmailBouncedEvent.create({ ...data, error: null }));

    // A real database error on the final write must roll back earlier writes.
    await db.knex.raw(`CREATE TRIGGER reject_recipient_failure BEFORE UPDATE ON email_recipients
      FOR EACH ROW BEGIN
        IF NEW.failed_at IS NOT NULL THEN
          SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'simulated flush failure';
        END IF;
      END`);
    try {
      await assert.rejects(storage.flushBatchedUpdates(), /simulated flush failure/);
      const saved = await models.EmailRecipient.findOne({ id: recipient.id }, { require: true });
      assert.equal(saved.get('delivered_at'), null);
      assert.equal(saved.get('opened_at'), null);
      assert.equal(saved.get('failed_at'), null);
    } finally {
      await db.knex.raw('DROP TRIGGER reject_recipient_failure');
    }

    const transitioned = [{ recipientId: recipient.id, memberId: recipient.member_id }];
    assert.deepEqual(await storage.flushBatchedUpdates(), [
      {
        emailId: recipient.email_id,
        delivered: transitioned,
        opened: transitioned,
        failed: transitioned,
      },
    ]);
  });

  it('retries a rolled-back deadlock without losing or duplicating transitions', async function () {
    let attempts = 0;
    storage = new NewsletterEmailEventStorage({
      config: { get: () => true },
      models,
      db: {
        knex: {
          transaction: (callback) =>
            db.knex.transaction(async (trx) => {
              const result = await callback(trx);
              attempts += 1;
              if (attempts === 1) {
                // Inject the database failure after real writes; Knex rolls them back.
                throw Object.assign(new Error('simulated deadlock'), { code: 'ER_LOCK_DEADLOCK' });
              }
              return result;
            }),
        },
      },
    });
    await storage.handleOpened(
      EmailOpenedEvent.create({
        email: recipient.member_email,
        emailRecipientId: recipient.id,
        emailId: recipient.email_id,
        memberId: recipient.member_id,
        timestamp: new Date('2026-09-01T12:00:00.000Z'),
      }),
    );
    assert.deepEqual(await storage.flushBatchedUpdates(), [
      {
        emailId: recipient.email_id,
        delivered: [],
        opened: [{ recipientId: recipient.id, memberId: recipient.member_id }],
        failed: [],
      },
    ]);
    assert.equal(attempts, 2);
    assert.deepEqual(await storage.flushBatchedUpdates(), []);
  });

  it('counts contended opens once while batch creation inserts recipients', async function () {
    const otherRecipient = fixtureManager.get('email_recipients', 1);
    await models.EmailRecipient.edit({ opened_at: null }, { id: otherRecipient.id });
    const otherStorage = new NewsletterEmailEventStorage({
      config: { get: () => true },
      db,
      models,
    });
    const email = await models.Email.findOne({ id: recipient.email_id }, { require: true });
    const member = await models.Member.findOne({ id: recipient.member_id }, { require: true });
    const batchService = new BatchSendingService({ db, models });
    for (const target of [storage, otherStorage]) {
      // Feed opposite input orders to exercise the shared database lock order.
      const rows = target === storage ? [recipient, otherRecipient] : [otherRecipient, recipient];
      for (const row of rows) {
        await target.handleOpened(
          EmailOpenedEvent.create({
            email: row.member_email,
            emailRecipientId: row.id,
            emailId: row.email_id,
            memberId: row.member_id,
            timestamp: new Date('2026-09-01T12:00:00.000Z'),
          }),
        );
      }
    }

    const blocker = await db.knex.transaction();
    await blocker('email_recipients').where({ id: recipient.id }).forUpdate();
    const waiting = Promise.withResolvers();
    const lockingQueries = [];
    const observe = (query) => {
      if (/select.*email_recipients.*for update/i.test(query.sql)) {
        lockingQueries.push(query);
        if (lockingQueries.length === 2) {
          waiting.resolve();
        }
      }
    };
    db.knex.on('query', observe);
    const completed = Promise.all([
      storage.flushBatchedUpdates(),
      otherStorage.flushBatchedUpdates(),
      batchService.createBatch(email, null, [member.toJSON()], {}),
    ]);
    try {
      await Promise.race([waiting.promise, completed]);
    } finally {
      db.knex.off('query', observe);
      await blocker.commit();
    }
    const [first, second, batch] = await completed;
    try {
      assert.deepEqual(
        [...first, ...second]
          .flatMap((group) => group.opened)
          .sort((a, b) => a.recipientId.localeCompare(b.recipientId)),
        [recipient, otherRecipient]
          .map((row) => ({ recipientId: row.id, memberId: row.member_id }))
          .sort((a, b) => a.recipientId.localeCompare(b.recipientId)),
      );
      const inserted = await models.EmailRecipient.findAll({ filter: `batch_id:${batch.id}` });
      assert.equal(inserted.length, 1);

      // Check the actual MySQL access path: sorting an IN list is not proof of
      // lock order, and a filesort would happen after locks were acquired.
      const [plan] = await db.knex.raw(
        `EXPLAIN ${lockingQueries[0].sql}`,
        lockingQueries[0].bindings,
      );
      assert.equal(plan[0].key, 'PRIMARY');
      assert(!plan[0].Extra?.includes('filesort'));
    } finally {
      await models.EmailRecipient.destroy({ destroyBy: { batch_id: batch.id } });
      await models.EmailBatch.destroy({ id: batch.id });
    }
  });

  it('returns independent delivery, open and failure transitions for the same recipient', async function () {
    const data = {
      email: recipient.member_email,
      emailRecipientId: recipient.id,
      emailId: recipient.email_id,
      memberId: recipient.member_id,
      timestamp: new Date('2026-09-01T12:00:00.000Z'),
    };
    await storage.handleOpened(EmailOpenedEvent.create(data));
    await storage.handleDelivered(EmailDeliveredEvent.create(data));
    await storage.handlePermanentFailed(EmailBouncedEvent.create({ ...data, error: null }));
    const transitioned = [{ recipientId: recipient.id, memberId: recipient.member_id }];
    assert.deepEqual(await storage.flushBatchedUpdates(), [
      {
        emailId: recipient.email_id,
        delivered: transitioned,
        opened: transitioned,
        failed: transitioned,
      },
    ]);

    await storage.handleOpened(EmailOpenedEvent.create(data));
    await storage.handleDelivered(EmailDeliveredEvent.create(data));
    await storage.handlePermanentFailed(EmailBouncedEvent.create({ ...data, error: null }));
    assert.deepEqual(await storage.flushBatchedUpdates(), []);
  });
});
