import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import ObjectID from 'bson-objectid';
import sinon from 'sinon';
import type { Knex } from 'knex';
import { resolvePreparationMembers } from '../../../../core/server/services/email-service/recipient-preparation';

const models = require('../../../../core/server/models');
const db: { knex: Knex } = require('../../../../core/server/data/db');
const dbUtils = require('../../../utils/db-utils');
const logging = require('@tryghost/logging');
const BatchSendingService = require('../../../../core/server/services/email-service/batch-sending-service');
const EmailSegmenter = require('../../../../core/server/services/email-service/email-segmenter');

type TransactionHandler = (trx: Knex.Transaction) => Promise<unknown>;
const batchTransactions: { transaction: (handler: TransactionHandler) => Promise<unknown> } =
  models.EmailBatch;

const id = (n: number) => n.toString(16).padStart(24, '0');
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('Upfront recipient preparation through MySQL', () => {
  let email: InstanceType<typeof models.Email>;
  let service: InstanceType<typeof BatchSendingService>;
  let filter: string;
  let segments: (string | null)[];
  let queries: Knex.Sql[];
  let sentry: { captureException: sinon.SinonStub; captureMessage: sinon.SinonStub };
  const queryListener = (query: Knex.Sql) => queries.push(query);
  const members = Array.from({ length: 80 }, (_, index) => ({
    id: id(index + 1),
    uuid: crypto.randomUUID(),
    transient_id: crypto.randomUUID(),
    email: `sweep-${index + 1}@example.com`,
    status: 'free',
    created_at: new Date(),
    updated_at: new Date(),
  }));

  beforeAll(async () => {
    await dbUtils.reset();
    await db.knex('members').insert(members);
  });
  beforeEach(async () => {
    sinon.stub(logging, 'info');
    sinon.stub(logging, 'error');
    sinon.stub(logging, 'warn');
    sentry = { captureException: sinon.stub(), captureMessage: sinon.stub() };
    queries = [];
    filter = `id:<='${id(4)}'`;
    segments = [null];
    email = await models.Email.add({
      submitted_at: new Date(),
      post_id: ObjectID().toHexString(),
      email_count: 4,
      preflight_email_count: 4,
      csd_email_count: 3,
      recipient_filter: 'all',
    });
    service = new BatchSendingService({
      models,
      db,
      sentry,
      emailRenderer: { getSegments: async () => segments },
      emailSegmenter: {
        getMemberFilterForSegment: (
          _newsletter: unknown,
          _filter: unknown,
          segment: string | null,
        ) => (segment ? `${filter}+(${segment})` : filter),
      },
      domainWarmingService: { isEnabled: () => true },
      sendingService: { getMaximumRecipients: () => 2 },
      BEFORE_RETRY_CONFIG: { maxRetries: 2, sleep: 0 },
    });
    db.knex.on('query', queryListener);
  });
  afterEach(async () => {
    db.knex.removeListener('query', queryListener);
    sinon.restore();
    await db.knex('email_recipients').where({ email_id: email.id }).del();
    await db.knex('email_batches').where({ email_id: email.id }).del();
    await db.knex('emails').where({ id: email.id }).del();
    // Restore members changed or removed by a test, including their original UUIDs.
    await db
      .knex('members')
      .whereIn(
        'id',
        members.map((member) => member.id),
      )
      .del();
    await db.knex('members').insert(members);
  });
  const prepare = () => service.createBatches({ email, post: {}, newsletter: {} });
  const recipients = () =>
    db.knex('email_recipients').where({ 'email_recipients.email_id': email.id });

  function interceptSweep(after: (rows: { id: string }[]) => Promise<void>) {
    const original = db.knex.unionAll.bind(db.knex);
    return sinon.stub(db.knex, 'unionAll').callsFake((...args) => {
      const query = original(...args);
      const execute = query.then.bind(query);
      query.then = (resolve, reject) =>
        execute()
          .then(async (rows) => {
            await after(rows);
            return rows;
          })
          .then(resolve, reject);
      return query;
    });
  }

  it('sweeps once and resolves pages without the audience filter or lookahead', async () => {
    const audience = sinon.spy(models.Member, 'getFilteredCollectionQuery');
    await prepare();
    sinon.assert.calledOnce(audience);
    const sweep = queries.find((query) => query.sql.startsWith('select `members`.`id`'))!;
    assert.ok(!/distinct|limit/i.test(sweep.sql));
    assert.ok(sweep.bindings?.includes(email.id));
    assert.equal(email.get('candidate_count'), 4);
    assert.equal((await recipients()).length, 4);
    assert.equal(email.get('email_count'), 4);
    sinon.assert.calledWithMatch(logging.info, {
      event: { name: 'email.preparation.started' },
      concurrency: 2,
    });
    sinon.assert.calledWithMatch(logging.info, {
      event: { name: 'email.batches.created' },
      concurrency: 2,
      batches_total: 3,
    });
  });

  it('resolves complete dense ranges and falls back for sparse or truncated ranges', async () => {
    const dense = await resolvePreparationMembers(db.knex, [id(4), id(2)]);
    assert.deepEqual(
      dense.map((member) => member.id),
      [id(4), id(2)],
    );
    assert.equal(queries.length, 1);
    queries.length = 0;
    const sparse = await resolvePreparationMembers(db.knex, [id(80), id(1)]);
    assert.deepEqual(
      sparse.map((member) => member.id),
      [id(80), id(1)],
    );
    assert.equal(queries.length, 2);
    assert.match(queries[1]!.sql, /where `id` in/);
    queries.length = 0;
    assert.deepEqual(await resolvePreparationMembers(db.knex, []), []);
    assert.equal(queries.length, 0);
  });

  it('uses a complete range at the threshold and falls back when the extra row exists', async () => {
    await resolvePreparationMembers(db.knex, [id(16), id(1)]);
    assert.equal(queries.length, 1);
    queries.length = 0;
    await resolvePreparationMembers(db.knex, [id(17), id(1)]);
    assert.equal(queries.length, 2);
  });

  it('accounts for disappearance without shifting domain-warming positions', async () => {
    interceptSweep(async () => {
      await db
        .knex('members')
        .where({ id: id(4) })
        .del();
    });
    await prepare();
    assert.equal(email.get('candidate_count'), 4);
    assert.equal(email.get('preparation_excluded_count'), 1);
    const rows = await recipients()
      .join('email_batches as b', 'b.id', 'email_recipients.batch_id')
      .select('member_id', 'b.fallback_sending_domain');
    assert.equal(rows.length, 3);
    for (const row of rows) {
      assert.equal(Boolean(row.fallback_sending_domain), row.member_id === id(1));
    }
    sinon.assert.calledWithMatch(logging.info, {
      event: { name: 'email.preparation.excluded' },
      reason: 'member_not_found',
      member_id: id(4),
    });
    sinon.assert.notCalled(sentry.captureException);
    sinon.assert.neverCalledWithMatch(logging.error, {
      event: { name: 'email.recipient_count.mismatch' },
    });
  });

  it('creates no batches when every selected member disappears', async () => {
    interceptSweep(async (rows) => {
      await db
        .knex('members')
        .whereIn(
          'id',
          rows.map((row) => row.id),
        )
        .del();
    });
    assert.deepEqual(await prepare(), []);
    assert.equal(email.get('candidate_count'), 4);
    assert.equal(email.get('preparation_excluded_count'), 4);
    assert.equal(email.get('email_count'), 0);
    assert.ok(email.get('prepared_at'));
  });

  it('retains selected members who become email-disabled and excludes newly eligible ones', async () => {
    filter += '+email_disabled:0';
    await db
      .knex('members')
      .where({ id: id(4) })
      .update({ email_disabled: true });
    interceptSweep(async () => {
      await db
        .knex('members')
        .where({ id: id(4) })
        .update({ email_disabled: false });
      await db
        .knex('members')
        .where({ id: id(3) })
        .update({ email_disabled: true });
    });
    await prepare();
    assert.deepEqual((await recipients()).map((row) => row.member_id).sort(), [
      id(1),
      id(2),
      id(3),
    ]);
    assert.equal(email.get('candidate_count'), 3);
  });

  it('selects every segment before preparation so status changes cannot duplicate or omit members', async () => {
    segments = ['status:free', 'status:-free'];
    await db
      .knex('members')
      .where({ id: id(3) })
      .update({ status: 'paid' });
    const original = models.EmailBatch.transaction.bind(models.EmailBatch);
    let changed = false;
    sinon.stub(batchTransactions, 'transaction').callsFake(async (handler) => {
      if (!changed) {
        changed = true;
        await db
          .knex('members')
          .where({ id: id(4) })
          .update({ status: 'paid' });
        await db
          .knex('members')
          .where({ id: id(3) })
          .update({ status: 'free' });
      }
      return original(handler);
    });
    await prepare();
    const rows = await recipients()
      .join('email_batches as b', 'b.id', 'email_recipients.batch_id')
      .select('member_id', 'b.member_segment', 'b.fallback_sending_domain')
      .orderBy('member_id');
    assert.deepEqual(
      rows.map((row) => row.member_id),
      [id(1), id(2), id(3), id(4)],
    );
    for (const row of rows) {
      assert.equal(row.member_segment, row.member_id === id(3) ? 'status:-free' : 'status:free');
      assert.equal(Boolean(row.fallback_sending_domain), row.member_id === id(3));
    }
    assert.equal(email.get('candidate_count'), 4);
    const sweeps = queries.filter((query) => query.sql.startsWith('select `members`.`id`'));
    assert.equal(sweeps.length, 1);
    assert.match(sweeps[0]!.sql, /union all/);
  });

  for (const separateFreeContent of [false, true]) {
    it(`prepares tier access and its complement in ${separateFreeContent ? 'three' : 'two'} segments`, async () => {
      const product = await models.Product.add({
        name: 'Sweep tier',
        slug: 'sweep-tier',
        type: 'paid',
        active: true,
      });
      try {
        await db
          .knex('members')
          .whereIn('id', [id(3), id(4)])
          .update({ status: 'paid' });
        await db
          .knex('members_products')
          .insert({ id: ObjectID().toHexString(), member_id: id(4), product_id: product.id });
        const access = `product:'${product.get('slug')}'`;
        const noAccess = `product:-'${product.get('slug')}'`;
        segments = separateFreeContent
          ? ['status:free', `status:-free+(${access})`, `status:-free+(${noAccess})`]
          : [access, noAccess];
        await prepare();
        const rows = await recipients()
          .join('email_batches as b', 'b.id', 'email_recipients.batch_id')
          .select('member_id', 'b.member_segment')
          .orderBy('member_id');
        const assignments = separateFreeContent
          ? [segments[0], segments[0], segments[2], segments[1]]
          : [segments[1], segments[1], segments[1], segments[0]];
        assert.deepEqual(
          rows,
          assignments.map((segment, index) => ({
            member_id: id(index + 1),
            member_segment: segment,
          })),
        );
        assert.equal(email.get('candidate_count'), 4);
        assert.equal(email.get('email_count'), 4);
      } finally {
        await models.Product.destroy({ id: product.id });
      }
    });
  }

  it('retries the entire selection before writing any batches', async () => {
    segments = ['status:free', 'status:-free'];
    filter += '+email_disabled:0';
    let attempts = 0;
    const batchCounts: number[] = [];
    const audience = interceptSweep(async () => {
      attempts += 1;
      batchCounts.push((await service.getBatches(email)).length);
      if (attempts === 1) {
        await db
          .knex('members')
          .where({ id: id(4) })
          .update({ email_disabled: true });
        throw new Error('transient sweep failure');
      }
    });
    await prepare();
    sinon.assert.callCount(audience, 2);
    assert.deepEqual(batchCounts, [0, 0]);
    assert.equal(email.get('candidate_count'), 3);
    assert.deepEqual((await recipients()).map((row) => row.member_id).sort(), [
      id(1),
      id(2),
      id(3),
    ]);
    assert.equal((await service.getBatches(email)).length, 2);
  });

  it('does not begin preparation when shutdown starts during selection', async () => {
    segments = ['status:free', 'status:-free'];
    interceptSweep(async () => service.onPreStop());
    await assert.rejects(prepare(), { code: 'BULK_EMAIL_SHUTDOWN_IN_PROGRESS' });
    assert.deepEqual(await service.getBatches(email), []);
    assert.equal((await recipients()).length, 0);
    assert.equal(email.get('prepared_at') ?? null, null);
  });

  it('drains concurrent transactions before freezing and preserves warming assignments', async () => {
    const firstWriting = deferred();
    const releaseFirst = deferred();
    const laterCommitted = deferred();
    const original = models.EmailBatch.transaction.bind(models.EmailBatch);
    let calls = 0;
    let active = 0;
    let maxActive = 0;
    sinon
      .stub(batchTransactions, 'transaction')
      .callsFake(async (handler: (trx: Knex.Transaction) => Promise<unknown>) => {
        const position = calls;
        calls += 1;
        active += 1;
        maxActive = Math.max(maxActive, active);
        try {
          const result = await original(async (trx: Knex.Transaction) => {
            const batch = await handler(trx);
            if (position === 0) {
              firstWriting.resolve();
              await releaseFirst.promise;
            }
            return batch;
          });
          if (position > 0) {
            laterCommitted.resolve();
          }
          return result;
        } finally {
          active -= 1;
        }
      });
    const run = prepare();
    try {
      await firstWriting.promise;
      await laterCommitted.promise;
      assert.equal(email.get('prepared_at') ?? null, null);
      assert.ok(active >= 1 && active <= 2);
    } finally {
      releaseFirst.resolve();
    }
    const batches = await run;
    assert.equal(maxActive, 2);
    assert.equal(batches.length, 3);
    assert.ok(email.get('prepared_at'));
    assert.equal((await recipients()).length, 4);
  });

  it('settles a committed write and recovers its original data after acknowledgement loss', async () => {
    const original = models.EmailBatch.transaction.bind(models.EmailBatch);
    let lost = false;
    sinon
      .stub(batchTransactions, 'transaction')
      .callsFake(async (handler: (trx: Knex.Transaction) => Promise<unknown>) => {
        const result = await original(handler);
        if (!lost) {
          lost = true;
          await db
            .knex('members')
            .whereIn('id', [id(3), id(4)])
            .update({ email: db.knex.raw("concat('changed-', email)") });
          throw new Error('commit response lost');
        }
        return result;
      });
    await prepare();
    const rows = await recipients();
    assert.equal(rows.length, 4);
    assert.equal(rows.find((row) => row.member_id === id(4))!.member_email, 'sweep-4@example.com');
    sinon.assert.calledWithMatch(logging.info, { event: { name: 'email.batch.recovered' } });
  });

  it('does not start page writes when shutdown occurs during the sweep', async () => {
    interceptSweep(async () => {
      service.onPreStop();
    });
    const write = sinon.spy(service, 'createBatch');
    await assert.rejects(prepare(), { code: 'BULK_EMAIL_SHUTDOWN_IN_PROGRESS' });
    sinon.assert.notCalled(write);
    assert.equal((await recipients()).length, 0);
  });

  it('drains and recovers a sibling commit after terminal failure without freezing', async () => {
    const firstWriting = deferred();
    const releaseFirst = deferred();
    const terminalFailure = deferred();
    const original = models.EmailBatch.transaction.bind(models.EmailBatch);
    const error = Object.assign(new Error('terminal page failure'), { retryable: false });
    let calls = 0;
    let settled = false;
    let committedIds: string[] = [];
    sinon.stub(batchTransactions, 'transaction').callsFake(async (handler) => {
      calls += 1;
      if (calls === 1) {
        await original(async (trx: Knex.Transaction) => {
          const result = await handler(trx);
          committedIds = await trx('email_recipients')
            .where({ email_id: email.id })
            .pluck('member_id');
          firstWriting.resolve();
          await releaseFirst.promise;
          return result;
        });
        throw new Error('commit response lost');
      }
      await firstWriting.promise;
      throw error;
    });
    // The failed worker has finished its recovery lookup before retryDb rejects it.
    const retry = service.retryDb.bind(service);
    sinon.stub(service, 'retryDb').callsFake(async (...args: unknown[]) => {
      try {
        return await retry(...args);
      } catch (failure) {
        if (failure === error) {
          terminalFailure.resolve();
        }
        throw failure;
      }
    });
    const result = assert
      .rejects(prepare(), (failure) => failure === error)
      .then(() => {
        settled = true;
      });
    try {
      await terminalFailure.promise;
      await Promise.resolve();
      assert.equal(settled, false);
      assert.equal(email.get('prepared_at') ?? null, null);
    } finally {
      releaseFirst.resolve();
    }
    await result;
    assert.equal(calls, 2);
    assert.ok(committedIds.length > 0);
    assert.deepEqual((await recipients()).map((row) => row.member_id).sort(), committedIds.sort());
    assert.equal(email.get('prepared_at') ?? null, null);
    sinon.assert.calledWithMatch(logging.info, { event: { name: 'email.batch.recovered' } });
    sinon.assert.neverCalledWithMatch(logging.info, {
      event: { name: 'email.preparation.completed' },
    });
  });

  it('uses relation subqueries without DISTINCT for overlapping labels and tiers', () => {
    const segmenter = new EmailSegmenter({});
    const memberFilter = segmenter.getMemberFilterForSegment(
      { id: id(99), get: () => 'members' },
      '(label:[one,two],products:[gold,silver])',
      null,
    );
    const sql = models.Member.getFilteredCollectionQuery({ filter: memberFilter })
      .orderByRaw('members.id DESC')
      .select('members.id')
      .toSQL().sql;
    assert.match(sql, /in \(select/i);
    assert.doesNotMatch(sql, /select distinct/i);
  });

  it('returns a member only once when multiple selected labels match', async () => {
    const newsletter = await db.knex('newsletters').first();
    const labelIds = [ObjectID().toHexString(), ObjectID().toHexString()];
    try {
      await db.knex('labels').insert(
        labelIds.map((labelId, index) => ({
          id: labelId,
          name: `sweep-label-${index}`,
          slug: `sweep-label-${index}`,
          created_at: new Date(),
        })),
      );
      await db.knex('members_labels').insert(
        labelIds.map((labelId) => ({
          id: ObjectID().toHexString(),
          member_id: id(4),
          label_id: labelId,
        })),
      );
      await db.knex('members_newsletters').insert({
        id: ObjectID().toHexString(),
        member_id: id(4),
        newsletter_id: newsletter.id,
      });
      const segmenter = new EmailSegmenter({});
      const memberFilter = segmenter.getMemberFilterForSegment(
        { id: newsletter.id, get: () => 'members' },
        'label:[sweep-label-0,sweep-label-1]',
        null,
      );
      const rows = await models.Member.getFilteredCollectionQuery({ filter: memberFilter })
        .orderByRaw('members.id DESC')
        .select('members.id');
      assert.deepEqual(rows, [{ id: id(4) }]);
    } finally {
      await db.knex('members_labels').whereIn('label_id', labelIds).del();
      await db.knex('labels').whereIn('id', labelIds).del();
    }
  });
});
