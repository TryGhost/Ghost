const assert = require('node:assert/strict');
const { agentProvider, fixtureManager } = require('../../../utils/e2e-framework');
const db = require('../../../../core/server/data/db');
const models = require('../../../../core/server/models');
const sinon = require('sinon');
const NewsletterEmailEventStorage = require('../../../../core/server/services/email-service/newsletter-email-event-storage');
const {
  NewsletterEmailCounters,
} = require('../../../../core/server/services/email-analytics/newsletter-email-counters');
const EmailEventProcessor = require('../../../../core/server/services/email-service/email-event-processor');
const {
  NewsletterEmailAnalyticsBatchProcessor,
} = require('../../../../core/server/services/email-analytics/newsletter-email-analytics-batch-processor');
const {
  EventProcessingResult,
} = require('../../../../core/server/services/email-analytics/event-processing-result');

describe('Newsletter email counters', function () {
  let recipient;

  beforeAll(async function () {
    await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('newsletters', 'members:newsletters', 'members:emails');
    recipient = fixtureManager.get('email_recipients', 0);
  });

  it('baselines existing facts including opens and counts each new transition once', async function () {
    await db.knex('email_recipients').where('email_id', recipient.email_id).update({
      opened_at: null,
      delivered_at: null,
      failed_at: null,
    });
    await db.knex('emails').where('id', recipient.email_id).update({
      delivered_count: 99,
      opened_count: 99,
      failed_count: 99,
    });
    await db.knex('email_recipients').where('id', recipient.id).update({
      opened_at: '2026-09-01 11:00:00',
    });
    const emailCounters = new NewsletterEmailCounters({ knex: db.knex });
    const storage = new NewsletterEmailEventStorage({
      config: { get: () => true },
      db,
      models,
      emailCounters,
    });
    const event = {
      emailId: recipient.email_id,
      emailRecipientId: recipient.id,
      memberId: recipient.member_id,
      timestamp: new Date('2026-09-01T12:00:00Z'),
    };
    await storage.handleOpened(event);
    await storage.handleDelivered(event);
    await storage.flushBatchedUpdates();
    await storage.handleDelivered(event);
    await storage.flushBatchedUpdates();
    const row = await db.knex('emails').where('id', recipient.email_id).first();
    assert.equal(row.delivered_count, 1);
    assert.equal(row.opened_count, 1);
    assert.equal(row.failed_count, 0);
  });

  it('compares a missing-lane-only open with opens-inclusive truth while retaining member recounts', async function () {
    await db.knex('email_recipients').where('email_id', recipient.email_id).update({
      opened_at: null,
      delivered_at: null,
      failed_at: null,
    });
    const emailCounters = new NewsletterEmailCounters({ knex: db.knex });
    const config = { get: () => true };
    const storage = new NewsletterEmailEventStorage({ config, db, models, emailCounters });
    const queries = { aggregateEmailStats: sinon.stub(), aggregateMemberStatsBatch: sinon.stub() };
    const processor = new NewsletterEmailAnalyticsBatchProcessor({
      config,
      emailCounters,
      queries,
      emailEventProcessor: new EmailEventProcessor({
        db,
        eventStorage: storage,
        domainEvents: { dispatch() {} },
      }),
    });
    const result = new EventProcessingResult();
    await processor.processBatch(
      [
        {
          type: 'opened',
          emailId: recipient.email_id,
          recipientEmail: recipient.member_email,
          timestamp: new Date('2026-09-01T12:00:00Z'),
        },
      ],
      result,
      {},
    );
    await processor.aggregate({
      processingResult: result,
      includeOpenedEvents: false,
      isFinal: true,
    });
    sinon.assert.notCalled(queries.aggregateEmailStats);
    sinon.assert.calledOnceWithExactly(queries.aggregateMemberStatsBatch, [recipient.member_id]);
    const comparison = await emailCounters.compare(recipient.email_id);
    assert.deepEqual(comparison, { delivered: 0, opened: 0, failed: 0 });
    const email = await db.knex('emails').where('id', recipient.email_id).first();
    assert.equal(email.opened_count, 1);
  });

  function createStorage(emailCounters, database = db) {
    return new NewsletterEmailEventStorage({
      config: { get: () => true },
      db: database,
      models,
      emailCounters,
    });
  }

  function makeEvent() {
    return {
      emailId: recipient.email_id,
      emailRecipientId: recipient.id,
      memberId: recipient.member_id,
      timestamp: new Date('2026-09-01T12:00:00Z'),
    };
  }

  async function resetFacts() {
    await db.knex('email_recipients').where('email_id', recipient.email_id).update({
      delivered_at: null,
      opened_at: null,
      failed_at: null,
    });
    await db.knex('emails').where('id', recipient.email_id).update({
      delivered_count: 99,
      opened_count: 99,
      failed_count: 99,
    });
  }

  it('detects deliberately incorrect counters without overwriting them', async function () {
    await resetFacts();
    const counters = new NewsletterEmailCounters({ knex: db.knex });
    const storage = createStorage(counters);
    await storage.handleOpened(makeEvent());
    await storage.flushBatchedUpdates();
    await db
      .knex('emails')
      .where('id', recipient.email_id)
      .update({ delivered_count: 7, opened_count: 0, failed_count: 9 });
    assert.deepEqual(await counters.compare(recipient.email_id), {
      delivered: 7,
      opened: -1,
      failed: 9,
    });
    await storage.handleOpened(makeEvent());
    await storage.flushBatchedUpdates();
    assert.deepEqual(await counters.compare(recipient.email_id), {
      delivered: 7,
      opened: -1,
      failed: 9,
    });
  });

  it('rolls back recipient transitions and the baseline when the counter write fails', async function () {
    await resetFacts();
    const counters = new NewsletterEmailCounters({ knex: db.knex });
    const storage = createStorage(counters);
    await storage.handleDelivered(makeEvent());
    await storage.handleOpened(makeEvent());
    await db.knex.raw(
      `CREATE TRIGGER reject_email_counter BEFORE UPDATE ON emails
      FOR EACH ROW BEGIN
        IF NEW.id = ? AND NEW.delivered_count = 1 THEN
          SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'counter write failed';
        END IF;
      END`,
      [recipient.email_id],
    );
    try {
      await assert.rejects(storage.flushBatchedUpdates(), /counter write failed/);
      const row = await db.knex('email_recipients').where('id', recipient.id).first();
      assert.equal(row.opened_at, null);
      assert.equal(row.delivered_at, null);
      const email = await db.knex('emails').where('id', recipient.email_id).first();
      assert.equal(email.delivered_count, 99);
    } finally {
      await db.knex.raw('DROP TRIGGER reject_email_counter');
    }
    await storage.flushBatchedUpdates();
    assert.deepEqual(await counters.compare(recipient.email_id), {
      delivered: 0,
      opened: 0,
      failed: 0,
    });
  });

  it('recovers a lost commit acknowledgement and restart without double counting', async function () {
    await resetFacts();
    const storage = createStorage(new NewsletterEmailCounters({ knex: db.knex }), {
      knex: {
        transaction: async (callback) => {
          await db.knex.transaction(callback);
          throw Object.assign(new Error('Lost commit acknowledgement'), { code: 'ECONNRESET' });
        },
      },
    });
    await storage.handleDelivered(makeEvent());
    await storage.handleOpened(makeEvent());
    await assert.rejects(storage.flushBatchedUpdates(), /Lost commit acknowledgement/);
    const counters = new NewsletterEmailCounters({ knex: db.knex });
    const restarted = createStorage(counters);
    await restarted.handleDelivered(makeEvent());
    await restarted.handleOpened(makeEvent());
    assert.deepEqual(await restarted.flushBatchedUpdates(), []);
    const row = await db.knex('emails').where('id', recipient.email_id).first();
    assert.equal(row.delivered_count, 1);
    assert.equal(row.opened_count, 1);
    assert.deepEqual(await counters.compare(recipient.email_id), {
      delivered: 0,
      opened: 0,
      failed: 0,
    });
  });

  it('serializes concurrent worker baselines, increments and comparisons', async function () {
    await resetFacts();
    const counters = [
      new NewsletterEmailCounters({ knex: db.knex }),
      new NewsletterEmailCounters({ knex: db.knex }),
    ];
    const workers = counters.map((counter) => createStorage(counter));
    for (const storage of workers) {
      await storage.handleOpened(makeEvent());
      await storage.handleDelivered(makeEvent());
      await storage.handlePermanentFailed(makeEvent());
    }
    const results = await Promise.all(workers.map((storage) => storage.flushBatchedUpdates()));
    assert.equal(results.flat().length, 1);
    assert.deepEqual(
      await Promise.all(counters.map((counter) => counter.compare(recipient.email_id))),
      [
        { delivered: 0, opened: 0, failed: 0 },
        { delivered: 0, opened: 0, failed: 0 },
      ],
    );
    const row = await db.knex('emails').where('id', recipient.email_id).first();
    assert.equal(row.delivered_count, 1);
    assert.equal(row.opened_count, 1);
    assert.equal(row.failed_count, 1);
  });

  it('compares against the committed view when an event transaction is still in flight', async function () {
    await resetFacts();
    const counters = new NewsletterEmailCounters({ knex: db.knex });
    const initial = createStorage(counters);
    await initial.handleDelivered(makeEvent());
    await initial.flushBatchedUpdates();

    let allowCommit;
    let writesCompleted;
    const hold = new Promise((resolve) => {
      allowCommit = resolve;
    });
    const ready = new Promise((resolve) => {
      writesCompleted = resolve;
    });
    const writer = createStorage(counters, {
      knex: {
        transaction: (callback) =>
          db.knex.transaction(async (trx) => {
            const result = await callback(trx);
            writesCompleted();
            await hold;
            return result;
          }),
      },
    });
    await writer.handleOpened(makeEvent());
    const flush = writer.flushBatchedUpdates();
    await ready;
    let comparisonIssued;
    const issued = new Promise((resolve) => {
      comparisonIssued = resolve;
    });
    const onQuery = (query) => {
      if (query.sql.includes('emails') && query.sql.includes('for update')) {
        comparisonIssued();
      }
    };
    db.knex.on('query', onQuery);
    const comparison = counters.compare(recipient.email_id);
    try {
      await issued;
    } finally {
      db.knex.removeListener('query', onQuery);
      allowCommit();
    }
    await flush;
    assert.deepEqual(await comparison, { delivered: 0, opened: 0, failed: 0 });
  });
});
