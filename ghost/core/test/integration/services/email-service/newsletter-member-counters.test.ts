import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import ObjectID from 'bson-objectid';
import type { Knex } from 'knex';
import sinon from 'sinon';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { NewsletterMemberCounters } from '../../../../core/server/services/email-analytics/newsletter-member-counters';
import { NewsletterEmailCounters } from '../../../../core/server/services/email-analytics/newsletter-email-counters';

const NewsletterEmailEventStorage = require('../../../../core/server/services/email-service/newsletter-email-event-storage');

const models = require('../../../../core/server/models');
const db: { knex: Knex } = require('../../../../core/server/data/db');
const dbUtils = require('../../../utils/db-utils');
const id = (n: number) => n.toString(16).padStart(24, '0');
const nonRetryable = (pattern: RegExp) => (error: unknown) => {
  const failure = error as { message?: string; retryable?: boolean };
  // A deterministic failure: a caller with a retry budget must not spend it here.
  assert.equal(failure.retryable, false);
  assert.match(String(failure.message), pattern);
  return true;
};
function sqlOf(query: unknown): string {
  if (typeof query === 'string') {
    return query;
  }
  assert.ok(query && typeof query === 'object' && 'sql' in query && typeof query.sql === 'string');
  return query.sql;
}

describe('Newsletter member counter baselines through MySQL', () => {
  let emailIds: string[];
  let counters: NewsletterMemberCounters;

  beforeAll(async () => dbUtils.reset());
  beforeEach(async () => {
    await db.knex('jobs').where('name', 'email-analytics-member-reconciliation').del();
    emailIds = [];
    counters = new NewsletterMemberCounters(db.knex);
    await db.knex('members').insert(
      [1, 2, 3].map((n) => ({
        id: id(n),
        uuid: crypto.randomUUID(),
        transient_id: crypto.randomUUID(),
        email: `member-counter-${n}@example.com`,
        status: 'free',
        email_count: 99,
        email_opened_count: 99,
        email_open_rate: 99,
        created_at: new Date(),
        updated_at: new Date(),
      })),
    );
  });
  afterEach(async () => {
    sinon.restore();
    await db.knex('jobs').where('name', 'email-analytics-member-reconciliation').del();
    await db.knex('email_recipients').whereIn('email_id', emailIds).del();
    await db.knex('email_batches').whereIn('email_id', emailIds).del();
    await db.knex('emails').whereIn('id', emailIds).del();
    await db
      .knex('members')
      .whereIn('id', [id(1), id(2), id(3)])
      .del();
  });

  async function recipient({
    member = 1,
    tracked = true,
    opened = false,
    enrolled = false,
    applied = false,
    prepared = true,
    accounted = true,
  } = {}) {
    const email = await models.Email.add({
      post_id: ObjectID().toHexString(),
      submitted_at: new Date(),
      email_count: 1,
      recipient_filter: 'all',
      track_opens: tracked,
      preflight_email_count: accounted ? 1 : null,
      prepared_at: prepared ? new Date() : null,
    });
    emailIds.push(email.id);
    const batchId = ObjectID().toHexString();
    await db.knex('email_batches').insert({
      id: batchId,
      email_id: email.id,
      status: 'pending',
      recipient_count: 1,
      member_counters_enabled: enrolled,
      member_counters_applied_at: applied ? new Date() : null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    const recipientId = ObjectID().toHexString();
    await db.knex('email_recipients').insert({
      id: recipientId,
      email_id: email.id,
      batch_id: batchId,
      member_id: id(member),
      member_uuid: crypto.randomUUID(),
      member_email: `member-counter-${member}@example.com`,
      opened_at: opened ? new Date() : null,
    });
    return { emailId: email.id as string, batchId, recipientId };
  }
  const stats = (member = 1) =>
    db
      .knex('members')
      .where('id', id(member))
      .first('email_count', 'email_tracked_count', 'email_opened_count', 'email_open_rate');

  it('initializes member history and commits a new open exactly once with its recipient', async () => {
    for (let n = 0; n < 5; n++) {
      await recipient();
    }
    const target = await recipient();
    const storage = new NewsletterEmailEventStorage({
      config: { get: () => true },
      db,
      models,
      emailCounters: new NewsletterEmailCounters({ knex: db.knex }),
      memberCounters: counters,
    });
    const event = {
      emailId: target.emailId,
      emailRecipientId: target.recipientId,
      memberId: id(1),
      timestamp: new Date('2026-09-10T12:00:00Z'),
    };
    await storage.handleOpened(event);
    await storage.flushBatchedUpdates();
    assert.deepEqual(await stats(), {
      email_count: 6,
      email_tracked_count: 6,
      email_opened_count: 1,
      email_open_rate: 17,
    });
    await storage.handleOpened(event);
    assert.deepEqual(await storage.flushBatchedUpdates(), []);
    assert.equal((await stats()).email_opened_count, 1);
    assert.equal((await db.knex('emails').where('id', target.emailId).first()).opened_count, 1);
  });

  it('rejects an event before enrolled preparation has applied its member denominator', async () => {
    const target = await recipient({ enrolled: true });
    await counters.sweepPage({ throughId: id(3) });
    const storage = new NewsletterEmailEventStorage({
      config: { get: () => true },
      db,
      models,
      emailCounters: new NewsletterEmailCounters({ knex: db.knex }),
      memberCounters: counters,
    });
    await storage.handleOpened({
      emailId: target.emailId,
      emailRecipientId: target.recipientId,
      memberId: id(1),
      timestamp: new Date(),
    });
    await assert.rejects(storage.flushBatchedUpdates(), /preparation/i);
    assert.equal(
      (await db.knex('email_recipients').where('id', target.recipientId).first()).opened_at,
      null,
    );
    assert.equal((await stats()).email_opened_count, 0);
    await counters.applyPreparedBatch(target.batchId);
    await storage.flushBatchedUpdates();
    assert.equal((await stats()).email_tracked_count, 1);
    assert.equal((await stats()).email_opened_count, 1);
  });

  function eventStorage(database = db) {
    return new NewsletterEmailEventStorage({
      config: { get: () => true },
      db: database,
      models,
      emailCounters: new NewsletterEmailCounters({ knex: database.knex }),
      memberCounters: counters,
    });
  }
  const openEvent = (target: { emailId: string; recipientId: string }) => ({
    emailId: target.emailId,
    emailRecipientId: target.recipientId,
    memberId: id(1),
    timestamp: new Date('2026-09-10T12:00:00Z'),
  });

  it('counts multiple opened recipient rows for one member, including untracked emails', async () => {
    for (let n = 0; n < 5; n++) {
      await recipient({ opened: n === 0 });
    }
    const target = await recipient({ tracked: false });
    const copyId = ObjectID().toHexString();
    const copy = await db.knex('email_recipients').where('id', target.recipientId).first();
    await db.knex('email_recipients').insert({ ...copy, id: copyId });
    const storage = eventStorage();
    await storage.handleOpened({ ...openEvent(target), memberId: id(2) });
    await storage.handleOpened(openEvent({ ...target, recipientId: copyId }));
    await storage.flushBatchedUpdates();
    assert.deepEqual(await stats(), {
      email_count: 7,
      email_tracked_count: 5,
      email_opened_count: 3,
      email_open_rate: 60,
    });
    assert.equal((await stats(2)).email_tracked_count, null);
  });

  it('rolls back recipient, email and member updates together and retries the retained events', async () => {
    const target = await recipient();
    const storage = eventStorage();
    await storage.handleOpened(openEvent(target));
    await db.knex.raw(
      "CREATE TRIGGER member_event_failure BEFORE UPDATE ON members FOR EACH ROW BEGIN IF NEW.email_opened_count = 1 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'injected member event failure'; END IF; END",
    );
    try {
      await assert.rejects(storage.flushBatchedUpdates(), /injected member event failure/);
      assert.equal((await stats()).email_tracked_count, null);
      assert.equal(
        (await db.knex('email_recipients').where('id', target.recipientId).first()).opened_at,
        null,
      );
      assert.equal((await db.knex('emails').where('id', target.emailId).first()).opened_count, 0);
    } finally {
      await db.knex.raw('DROP TRIGGER member_event_failure');
    }
    await storage.flushBatchedUpdates();
    assert.equal((await stats()).email_opened_count, 1);
  });

  it('replays safely after an actual member event commit loses its acknowledgement', async () => {
    const target = await recipient();
    let loseAcknowledgement = true;
    const uncertainKnex = new Proxy(db.knex, {
      get(targetKnex, property) {
        if (property === 'transaction') {
          return async (
            callback: (trx: Knex.Transaction) => Promise<unknown>,
            config?: Knex.TransactionConfig,
          ) => {
            const result = await db.knex.transaction(callback, config);
            if (loseAcknowledgement) {
              loseAcknowledgement = false;
              throw Object.assign(new Error('lost member event acknowledgement'), {
                code: 'ECONNRESET',
              });
            }
            return result;
          };
        }
        return Reflect.get(targetKnex, property);
      },
    });
    const storage = eventStorage({ knex: uncertainKnex });
    await storage.handleOpened(openEvent(target));
    await assert.rejects(storage.flushBatchedUpdates(), /lost member event acknowledgement/);
    assert.equal((await stats()).email_opened_count, 1);
    assert.deepEqual(await storage.flushBatchedUpdates(), []);
    const restarted = eventStorage();
    await restarted.handleOpened(openEvent(target));
    await restarted.flushBatchedUpdates();
    assert.equal((await stats()).email_opened_count, 1);
    assert.equal((await db.knex('emails').where('id', target.emailId).first()).opened_count, 1);
  });

  it('establishes both baselines after waiting for the member lock', async () => {
    const history = await recipient();
    const target = await recipient();
    const blocker = await db.knex.transaction();
    await blocker('members').where('id', id(1)).forUpdate().first();
    let reached!: () => void;
    const waiting = new Promise<void>((resolve) => {
      reached = resolve;
    });
    const listener = (query: Knex.Sql) => {
      if (query.sql.includes('members') && query.sql.includes('for update')) {
        reached();
      }
    };
    db.knex.on('query', listener);
    const storage = eventStorage();
    await storage.handleOpened(openEvent(target));
    const flushing = storage.flushBatchedUpdates();
    try {
      await waiting;
      await blocker('email_recipients')
        .where('id', history.recipientId)
        .update({ opened_at: new Date() });
      await blocker.commit();
      await flushing;
      assert.equal((await stats()).email_opened_count, 2);
    } finally {
      db.knex.removeListener('query', listener);
      if (!blocker.isCompleted()) {
        await blocker.rollback();
      }
      await flushing;
    }
  });

  it('derives legacy and applied facts, excluding pending enrollment and discardable preparation', async () => {
    for (let n = 0; n < 4; n++) {
      await recipient({ opened: n === 0 });
    }
    await recipient({ enrolled: true, applied: true });
    await recipient({ tracked: false });
    await recipient({ enrolled: true });
    await recipient({ prepared: false });
    // A pre-accounting send has no preparation boundary, but remains historical truth.
    const legacy = await recipient({ accounted: false, prepared: false, tracked: false });
    await db.knex('email_batches').where('id', legacy.batchId).update({ status: 'submitted' });
    const page = await counters.sweepPage({ throughId: id(3), limit: 2 });
    assert.deepEqual(page, { afterId: id(2), processed: 2 });
    assert.deepEqual(await stats(), {
      email_count: 7,
      email_tracked_count: 5,
      email_opened_count: 1,
      email_open_rate: 20,
    });
    assert.deepEqual(await stats(2), {
      email_count: 0,
      email_tracked_count: 0,
      email_opened_count: 0,
      email_open_rate: null,
    });
    assert.equal((await stats(3)).email_count, 99);
  });

  it('resumes bounded pages after recreation and safely repeats an acknowledged page', async () => {
    await recipient({ member: 3 });
    const first = await counters.sweepPage({ throughId: id(3), limit: 2 });
    assert.deepEqual(await counters.sweepPage({ throughId: id(3), limit: 2 }), first);
    const restarted = new NewsletterMemberCounters(db.knex);
    assert.deepEqual(
      await restarted.sweepPage({ afterId: first.afterId, throughId: id(3), limit: 2 }),
      { afterId: id(3), processed: 1 },
    );
    assert.deepEqual(await restarted.sweepPage({ afterId: id(3), throughId: id(3), limit: 2 }), {
      afterId: id(3),
      processed: 0,
    });
    assert.deepEqual(await stats(3), {
      email_count: 1,
      email_tracked_count: 1,
      email_opened_count: 0,
      email_open_rate: null,
    });
  });

  it('rolls back a failed page without publishing partial member baselines', async () => {
    await recipient();
    await db.knex.raw(
      `CREATE TRIGGER member_counter_sweep_failure BEFORE UPDATE ON members FOR EACH ROW BEGIN IF NEW.id = '${id(2)}' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'injected sweep failure'; END IF; END`,
    );
    try {
      await assert.rejects(
        counters.sweepPage({ throughId: id(3), limit: 2 }),
        /injected sweep failure/,
      );
      assert.deepEqual(await stats(), {
        email_count: 99,
        email_tracked_count: null,
        email_opened_count: 99,
        email_open_rate: 99,
      });
    } finally {
      await db.knex.raw('DROP TRIGGER member_counter_sweep_failure');
    }
    await counters.sweepPage({ throughId: id(3), limit: 2 });
    assert.equal((await stats()).email_count, 1);
  });

  it('reads truth after waiting for a concurrent member-locked event commit', async () => {
    const { recipientId } = await recipient();
    await counters.sweepPage({ throughId: id(3), limit: 3 });
    const writer = await db.knex.transaction();
    try {
      await writer('members').where('id', id(1)).forUpdate().first();
      await writer('email_recipients').where('id', recipientId).update({ opened_at: new Date() });
      await writer('members').where('id', id(1)).update({ email_opened_count: 1 });
      let reachedLock!: () => void;
      const lockDispatched = new Promise<void>((resolve) => {
        reachedLock = resolve;
      });
      const listener = (query: Knex.Sql) => {
        if (query.sql.includes('members') && query.sql.includes('for update')) {
          reachedLock();
        }
      };
      db.knex.on('query', listener);
      const sweep = counters.sweepPage({ throughId: id(3), limit: 3 });
      try {
        await lockDispatched;
        await writer.commit();
        await sweep;
      } finally {
        db.knex.removeListener('query', listener);
      }
      assert.equal((await stats()).email_opened_count, 1);
    } finally {
      if (!writer.isCompleted()) {
        await writer.rollback();
      }
    }
  });

  it('rejects an unbounded or invalid page before querying', async () => {
    for (const limit of [0, -1, 5001, 1.5, NaN]) {
      await assert.rejects(counters.sweepPage({ throughId: id(3), limit }), /limit/);
    }
  });

  it('keeps frozen legacy preparation and counter-applied unfrozen legacy state as truth', async () => {
    await recipient({ accounted: false, prepared: true });
    await recipient({ accounted: false, prepared: false });
    await counters.sweepPage({ throughId: id(3) });
    assert.equal((await stats()).email_count, 1);
    // An applied batch can only exist through a rollback that never saved
    // prepared_at; its recipients are frozen facts, not discardable preparation
    await recipient({ accounted: false, prepared: false, enrolled: true, applied: true });
    await counters.sweepPage({ throughId: id(3) });
    assert.equal((await stats()).email_count, 2);
  });

  it('commits its checkpoint with the page and resumes it after recreation', async () => {
    await recipient();
    const first = await counters.runSweepPage({ limit: 2 });
    assert.equal(first.afterId, id(2));
    assert.equal(first.processed, 2);
    assert.equal(first.complete, false);
    const job = await db
      .knex('jobs')
      .where('name', 'email-analytics-member-reconciliation')
      .first();
    assert.deepEqual(JSON.parse(job.metadata), first);
    const restarted = new NewsletterMemberCounters(db.knex);
    const next = await restarted.runSweepPage({ limit: 2 });
    assert.notEqual(next.afterId, first.afterId);
    assert.equal(next.processed, 3);
    let final = next;
    while (!final.complete) {
      final = await restarted.runSweepPage({ limit: 2 });
    }
    assert.deepEqual(await restarted.runSweepPage({ limit: 2 }), final);
    assert.equal((await db.knex('jobs').where('id', job.id).first()).status, 'finished');
  });

  it('rolls member updates back when persisting the checkpoint fails', async () => {
    await recipient();
    await db.knex.raw(
      "CREATE TRIGGER member_counter_checkpoint_failure BEFORE UPDATE ON jobs FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'injected checkpoint failure'",
    );
    try {
      await assert.rejects(counters.runSweepPage({ limit: 2 }), /injected checkpoint failure/);
      assert.equal((await stats()).email_count, 99);
      const job = await db
        .knex('jobs')
        .where('name', 'email-analytics-member-reconciliation')
        .first();
      assert.equal(JSON.parse(job.metadata).afterId, null);
    } finally {
      await db.knex.raw('DROP TRIGGER member_counter_checkpoint_failure');
    }
    assert.equal((await counters.runSweepPage({ limit: 2 })).afterId, id(2));
    assert.equal((await stats()).email_count, 1);
  });

  it('finishes an empty range and starts another sweep only when explicitly requested', async () => {
    await db
      .knex('members')
      .whereIn('id', [id(1), id(2), id(3)])
      .del();
    const empty = await counters.runSweepPage({ limit: 2 });
    assert.deepEqual(empty, {
      version: 1,
      afterId: null,
      throughId: null,
      processed: 0,
      complete: true,
    });
    const job = await db
      .knex('jobs')
      .where('name', 'email-analytics-member-reconciliation')
      .first();
    assert.equal(job.status, 'finished');
    await db.knex('members').insert({
      id: id(1),
      uuid: crypto.randomUUID(),
      transient_id: crypto.randomUUID(),
      email: 'member-counter-1@example.com',
      status: 'free',
      created_at: new Date(),
      updated_at: new Date(),
    });
    assert.deepEqual(await counters.runSweepPage(), empty);
    const restarted = await counters.runSweepPage({ restart: true });
    assert.equal(restarted.processed, 1);
    assert.equal(restarted.complete, true);
    assert.equal((await stats()).email_tracked_count, 0);
  });

  it('restart abandons an incomplete sweep and starts over from the current member range', async () => {
    const first = await counters.runSweepPage({ limit: 2 });
    assert.equal(first.afterId, id(2));
    assert.equal(first.complete, false);
    const job = () =>
      db.knex('jobs').where('name', 'email-analytics-member-reconciliation').first();
    const stale = new Date('2020-01-01T00:00:00Z');
    await db
      .knex('jobs')
      .where('name', 'email-analytics-member-reconciliation')
      .update({ started_at: stale });
    // A restart is a new sweep, not a resume: it re-reads the member range from
    // the beginning, so its first page covers members the abandoned one already had.
    const restarted = await counters.runSweepPage({ limit: 2, restart: true });
    assert.deepEqual(restarted, {
      version: 1,
      afterId: id(2),
      throughId: id(3),
      processed: 2,
      complete: false,
    });
    const started = await job();
    assert.equal(started.status, 'started');
    assert.ok(started.started_at > stale);
    await db
      .knex('jobs')
      .where('name', 'email-analytics-member-reconciliation')
      .update({ started_at: stale });
    const resumed = await counters.runSweepPage({ limit: 2 });
    assert.equal(resumed.afterId, id(3));
    assert.equal(resumed.processed, 3);
    assert.deepEqual((await job()).started_at, stale);
  });

  it('stops with a non-retryable error when the checkpoint row is unreadable', async () => {
    await recipient();
    await counters.runSweepPage({ limit: 2 });
    // Another writer, a restored database or a newer checkpoint format owns the
    // row: never overwrite it silently, and never burn a retry budget on it.
    for (const metadata of [
      null,
      JSON.stringify({ version: 2, afterId: null, throughId: null, processed: 0, complete: false }),
    ]) {
      await db
        .knex('jobs')
        .where('name', 'email-analytics-member-reconciliation')
        .update({ metadata });
      await assert.rejects(counters.runSweepPage({ limit: 2 }), nonRetryable(/--restart/));
    }
    const restarted = await counters.runSweepPage({ limit: 2, restart: true });
    assert.equal(restarted.afterId, id(2));
    assert.equal(restarted.processed, 2);
    assert.equal((await stats()).email_count, 1);
  });

  it('uses a primary-key ordered locking access path on MySQL', async () => {
    const queries: Knex.Sql[] = [];
    const listener = (query: Knex.Sql) => queries.push(query);
    db.knex.on('query', listener);
    try {
      await counters.sweepPage({ throughId: id(3), limit: 2 });
    } finally {
      db.knex.removeListener('query', listener);
    }
    const locking = queries.find((query) => query.sql.includes('for update'))!;
    assert.match(locking.sql, /FORCE INDEX \(PRIMARY\)/);
    const [plan] = await db.knex.raw(`EXPLAIN ${locking.sql}`, locking.bindings);
    assert.equal(plan[0].key, 'PRIMARY');
    assert.doesNotMatch(plan[0].Extra, /filesort/i);
  });

  it('preserves an event increment that waits behind the sweep', async () => {
    const { recipientId } = await recipient();
    let release!: () => void;
    const paused = new Promise<void>((resolve) => {
      release = resolve;
    });
    let reached!: () => void;
    const atFacts = new Promise<void>((resolve) => {
      reached = resolve;
    });
    const pausedCounters = new NewsletterMemberCounters(
      new Proxy(db.knex, {
        get(target, property) {
          if (property === 'transaction') {
            return (
              callback: (trx: Knex.Transaction) => Promise<unknown>,
              config?: Knex.TransactionConfig,
            ) =>
              db.knex.transaction(async (trx) => {
                const original = trx.client.query.bind(trx.client);
                const stub = sinon
                  .stub(trx.client, 'query')
                  .callsFake(async (connection, query) => {
                    const sql = sqlOf(query);
                    if (sql.startsWith('select') && sql.includes('from `email_recipients`')) {
                      reached();
                      await paused;
                    }
                    return original(connection, query);
                  });
                try {
                  return await callback(trx);
                } finally {
                  stub.restore();
                }
              }, config);
          }
          return Reflect.get(target, property);
        },
      }),
    );
    const sweep = pausedCounters.sweepPage({ throughId: id(3), limit: 3 });
    await atFacts;
    const writer = await db.knex.transaction();
    let waiting!: () => void;
    const atLock = new Promise<void>((resolve) => {
      waiting = resolve;
    });
    const listener = (query: Knex.Sql) => {
      if (query.sql.includes('members') && query.sql.includes('for update')) {
        waiting();
      }
    };
    db.knex.on('query', listener);
    const increment = (async () => {
      await writer('members').where('id', id(1)).forUpdate().first();
      await writer('email_recipients').where('id', recipientId).update({ opened_at: new Date() });
      await writer('members').where('id', id(1)).increment('email_opened_count', 1);
      await writer.commit();
    })();
    try {
      await atLock;
      release();
      await sweep;
      await increment;
      assert.equal((await stats()).email_opened_count, 1);
    } finally {
      release();
      db.knex.removeListener('query', listener);
      if (!writer.isCompleted()) {
        await writer.rollback();
      }
    }
  });

  it('resumes beyond a page whose COMMIT succeeded but acknowledgement was lost', async () => {
    await recipient();
    const lostAckCounters = new NewsletterMemberCounters(
      new Proxy(db.knex, {
        get(target, property) {
          if (property === 'transaction') {
            return async (
              callback: (trx: Knex.Transaction) => Promise<unknown>,
              config?: Knex.TransactionConfig,
            ) => {
              await db.knex.transaction(callback, config);
              throw Object.assign(new Error('Lost sweep commit acknowledgement'), {
                code: 'ECONNRESET',
              });
            };
          }
          return Reflect.get(target, property);
        },
      }),
    );
    await assert.rejects(
      lostAckCounters.runSweepPage({ limit: 2 }),
      /Lost sweep commit acknowledgement/,
    );
    assert.equal((await stats()).email_count, 1);
    const resumed = await new NewsletterMemberCounters(db.knex).runSweepPage({ limit: 2 });
    assert.equal(resumed.processed, 3);
    assert.equal(resumed.complete, true);
  });

  it('keeps rollback states that submitted without freezing preparation as truth', async () => {
    const { batchId } = await recipient({ prepared: false, opened: true });
    await db.knex('email_batches').where('id', batchId).update({ status: 'submitted' });
    const state = await counters.runSweepPage({ limit: 3 });
    assert.equal(state.complete, true);
    assert.equal((await stats()).email_tracked_count, 1);
    assert.equal((await stats()).email_opened_count, 1);
  });

  it('resumes the source-checkout command across separate processes', async () => {
    await recipient();
    const execute = promisify(execFile);
    const run = () =>
      execute(
        process.execPath,
        [
          '--import',
          'tsx',
          'scripts/reconcile-member-email-counters.ts',
          '--limit',
          '2',
          '--pages',
          '1',
        ],
        {
          cwd: path.resolve(__dirname, '../../../..'),
          env: { ...process.env, NODE_OPTIONS: '--conditions=source' },
        },
      );
    const first = JSON.parse((await run()).stdout.trim());
    assert.equal(first.afterId, id(2));
    assert.equal(first.complete, false);
    const second = JSON.parse((await run()).stdout.trim());
    assert.equal(second.afterId, id(3));
    assert.equal(second.complete, true);
  });

  it('hands a baseline over to preparation without adding its recipients twice', async () => {
    await recipient({ opened: true });
    const { batchId } = await recipient({ enrolled: true });
    await counters.sweepPage({ throughId: id(3), limit: 3 });
    assert.equal((await stats()).email_count, 1);
    assert.equal(await counters.applyPreparedBatch(batchId), true);
    assert.deepEqual(await stats(), {
      email_count: 2,
      email_tracked_count: 2,
      email_opened_count: 1,
      email_open_rate: null,
    });
    assert.ok(
      (await db.knex('email_batches').where('id', batchId).first()).member_counters_applied_at,
    );
    assert.equal(await new NewsletterMemberCounters(db.knex).applyPreparedBatch(batchId), false);
    await counters.sweepPage({ throughId: id(3), limit: 3 });
    assert.equal((await stats()).email_count, 2);
  });

  it('initializes an unseen member from the same historical truth before applying preparation', async () => {
    await recipient({ opened: true });
    const { batchId } = await recipient({ enrolled: true, tracked: false });
    const pending = await recipient({ enrolled: true });
    assert.equal(await counters.applyPreparedBatch(batchId), true);
    assert.deepEqual(await stats(), {
      email_count: 2,
      email_tracked_count: 1,
      email_opened_count: 1,
      email_open_rate: null,
    });
    assert.equal(await counters.applyPreparedBatch(pending.batchId), true);
    assert.equal((await stats()).email_tracked_count, 2);
  });

  it('does not enroll historical batches or apply unfrozen preparation', async () => {
    const legacy = await recipient();
    assert.equal(await counters.applyPreparedBatch(legacy.batchId), false);
    const pending = await recipient({ enrolled: true, prepared: false });
    await assert.rejects(
      counters.applyPreparedBatch(pending.batchId),
      nonRetryable(/frozen preparation/),
    );
    assert.equal((await stats()).email_tracked_count, null);
  });

  it('reports a recipient count beyond the cap as a membership mismatch', async () => {
    const { batchId } = await recipient({ enrolled: true });
    await db.knex('email_batches').where('id', batchId).update({ recipient_count: 5001 });
    // The cap guards the rows actually read, not the batch's own claim about
    // them, so a claimed count beyond it is still only a membership mismatch.
    await assert.rejects(
      counters.applyPreparedBatch(batchId),
      nonRetryable(/Prepared recipient membership does not match the batch/),
    );
    assert.equal(
      (await db.knex('email_batches').where('id', batchId).first()).member_counters_applied_at,
      null,
    );
    assert.equal((await stats()).email_count, 99);
  });

  it('rolls member initialization and increments back when the batch marker fails', async () => {
    const { batchId } = await recipient({ enrolled: true });
    await db.knex.raw(
      "CREATE TRIGGER member_counter_application_failure BEFORE UPDATE ON email_batches FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'injected application failure'",
    );
    try {
      await assert.rejects(counters.applyPreparedBatch(batchId), /injected application failure/);
      assert.equal((await stats()).email_tracked_count, null);
      assert.equal((await stats()).email_count, 99);
      assert.equal(
        (await db.knex('email_batches').where('id', batchId).first()).member_counters_applied_at,
        null,
      );
    } finally {
      await db.knex.raw('DROP TRIGGER member_counter_application_failure');
    }
    assert.equal(await counters.applyPreparedBatch(batchId), true);
    assert.equal((await stats()).email_count, 1);
  });

  it('applies a batch once across a lost commit acknowledgement and concurrent retries', async () => {
    const { batchId } = await recipient({ enrolled: true });
    const lostAckCounters = new NewsletterMemberCounters(
      new Proxy(db.knex, {
        get(target, property) {
          if (property === 'transaction') {
            return async (
              callback: (trx: Knex.Transaction) => Promise<unknown>,
              config?: Knex.TransactionConfig,
            ) => {
              await db.knex.transaction(callback, config);
              throw Object.assign(new Error('Lost application acknowledgement'), {
                code: 'ECONNRESET',
              });
            };
          }
          return Reflect.get(target, property);
        },
      }),
    );
    await assert.rejects(
      lostAckCounters.applyPreparedBatch(batchId),
      /Lost application acknowledgement/,
    );
    const restarted = new NewsletterMemberCounters(db.knex);
    assert.deepEqual(
      await Promise.all([
        counters.applyPreparedBatch(batchId),
        restarted.applyPreparedBatch(batchId),
      ]),
      [false, false],
    );
    assert.equal((await stats()).email_count, 1);
    assert.equal((await stats()).email_tracked_count, 1);
  });

  it('keeps prepared totals consistent while application races the shared sweep', async () => {
    await recipient({ opened: true });
    const { batchId } = await recipient({ enrolled: true });
    await Promise.all([
      counters.applyPreparedBatch(batchId),
      new NewsletterMemberCounters(db.knex).runSweepPage({ limit: 3 }),
    ]);
    assert.deepEqual(await stats(), {
      email_count: 2,
      email_tracked_count: 2,
      email_opened_count: 1,
      email_open_rate: null,
    });
  });

  it('counts persisted recipient rows per member and updates the rate as the denominator grows', async () => {
    for (let n = 0; n < 4; n++) {
      await recipient({ opened: n < 2 });
    }
    const { batchId, recipientId } = await recipient({ enrolled: true });
    const row = await db.knex('email_recipients').where('id', recipientId).first();
    await db.knex('email_recipients').insert({ ...row, id: ObjectID().toHexString() });
    await db.knex('email_batches').where('id', batchId).update({ recipient_count: 2 });
    await counters.applyPreparedBatch(batchId);
    assert.deepEqual(await stats(), {
      email_count: 6,
      email_tracked_count: 6,
      email_opened_count: 2,
      email_open_rate: 33,
    });
  });
});
