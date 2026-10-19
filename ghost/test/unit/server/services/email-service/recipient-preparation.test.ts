import assert from 'node:assert/strict';
import knex from 'knex';
import { vi } from 'vitest';
import {
  preparationPages,
  resolvePreparationMembers,
  runPreparationWorkers,
  selectPreparationCandidates,
  waitForPreparationRetry,
} from '../../../../../core/server/services/email-service/recipient-preparation';
import { RECIPIENT_VERIFICATION_CODE } from '../../../../../core/server/services/email-service/recipient-accounting';

const BatchSendingService = require('../../../../../core/server/services/email-service/batch-sending-service');

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('Recipient preparation workers', () => {
  afterEach(() => vi.useRealTimers());

  it('accepts explicit concurrency independently of the database pool', () => {
    for (const value of [1, 2, 4]) {
      assert.doesNotThrow(
        () =>
          new BatchSendingService({
            batchCreationConcurrency: value,
            db: { knex: { client: { pool: { max: 1 } } } },
          }),
      );
    }
    for (const value of [0, -1, 1.5, Infinity, NaN, '2', null]) {
      assert.throws(
        () => new BatchSendingService({ batchCreationConcurrency: value }),
        /bulkEmail:batchCreationConcurrency must be a positive integer/,
      );
    }
  });

  it('pages selected candidates without lookahead', () => {
    const ids = ['c', 'b', 'a'];
    assert.deepEqual(
      [...preparationPages(ids, 2)],
      [
        { ids: ['c', 'b'], offset: 0, useFallbackDomain: false },
        { ids: ['a'], offset: 2, useFallbackDomain: false },
      ],
    );
  });

  it('selects ordered candidates for every segment in one statement, including empty segments', async () => {
    const db = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    try {
      await db.schema.createTable('members', (table) => {
        table.string('id').primary();
        table.string('status');
      });
      await db.schema.createTable('matches', (table) => table.string('member_id'));
      await db('members').insert([
        { id: 'a', status: 'free' },
        { id: 'b', status: 'paid' },
        { id: 'c', status: 'free' },
      ]);
      await db('matches').insert([{ member_id: 'c' }, { member_id: 'c' }]);
      const queries: string[] = [];
      db.on('query', (query) => queries.push(query.sql));
      assert.deepEqual(
        await selectPreparationCandidates(db, [
          db('members').where('status', 'comped'),
          db('members').where('status', 'free'),
          db('members').where('status', 'paid'),
          db('members').join('matches', 'matches.member_id', 'members.id'),
        ]),
        [[], ['c', 'a'], ['b'], ['c']],
      );
      assert.equal(queries.length, 1);
      assert.deepEqual(await selectPreparationCandidates(db, []), []);
      assert.equal(queries.length, 1);
    } finally {
      await db.destroy();
    }
  });

  it('ends a page at the warming boundary and fills the next on the fallback domain', () => {
    assert.deepEqual(
      [...preparationPages(['d', 'c', 'b', 'a'], 3, 1)],
      [
        { ids: ['d'], offset: 0, useFallbackDomain: false },
        { ids: ['c', 'b', 'a'], offset: 1, useFallbackDomain: true },
      ],
    );
  });

  for (const batchSize of [0, -1, 1.5, NaN, Infinity]) {
    it(`rejects batch size ${batchSize} before yielding a page`, () => {
      assert.throws(
        () => preparationPages(['a'], batchSize).next(),
        /batchSize must be a positive integer/,
      );
    });
  }

  it('finishes completed work without another shutdown check when there are no pages left', async () => {
    let shuttingDown = false;
    await runPreparationWorkers(
      [1],
      1,
      () => {
        if (shuttingDown) {
          throw new Error('shutdown');
        }
      },
      async () => {
        shuttingDown = true;
      },
    );
  });

  it('holds an exact bound while later pages finish before earlier pages', async () => {
    const gates = Array.from({ length: 4 }, deferred);
    const twoStarted = deferred();
    const thirdStarted = deferred();
    const started: number[] = [];
    const completed: number[] = [];
    let active = 0;
    let maxActive = 0;
    const run = runPreparationWorkers(
      [0, 1, 2, 3],
      2,
      () => {},
      async (index) => {
        started.push(index);
        active += 1;
        maxActive = Math.max(active, maxActive);
        if (started.length === 2) {
          twoStarted.resolve();
        }
        if (started.length === 3) {
          thirdStarted.resolve();
        }
        await gates[index]!.promise;
        active -= 1;
        completed.push(index);
      },
    );
    await twoStarted.promise;
    assert.deepEqual(started, [0, 1]);
    gates[1]!.resolve();
    await thirdStarted.promise;
    assert.deepEqual(completed, [1]);
    assert.deepEqual(started, [0, 1, 2]);
    gates.forEach((gate) => gate.resolve());
    await run;
    assert.equal(maxActive, 2);
    assert.equal(active, 0);
    assert.equal(completed.length, 4);
  });

  it('queues concurrent page reads and writes through one SQLite connection', async () => {
    const db = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
      pool: { min: 1, max: 1 },
      acquireConnectionTimeout: 1000,
    });
    try {
      await db.schema.createTable('members', (table) => {
        table.string('id').primary();
        table.string('uuid');
        table.string('email');
        table.string('name');
      });
      await db.schema.createTable('prepared', (table) => table.string('member_id').primary());
      const ids = ['d', 'c', 'b', 'a'];
      await db('members').insert(
        ids.map((id) => ({ id, uuid: `uuid-${id}`, email: `${id}@example.com`, name: null })),
      );
      await runPreparationWorkers(
        preparationPages(ids, 2),
        2,
        () => {},
        async (page) => {
          const members = await resolvePreparationMembers(db, page.ids);
          await db.transaction(async (trx) => {
            await trx('prepared').insert(members.map((member) => ({ member_id: member.id })));
          });
        },
      );
      assert.deepEqual(await db('prepared').orderBy('member_id', 'desc').pluck('member_id'), ids);
    } finally {
      await db.destroy();
    }
  });

  it('wakes sibling retry waits and drains an in-flight operation after failure', async () => {
    vi.useFakeTimers();
    const fail = deferred();
    const finishWrite = deferred();
    const allStarted = deferred();
    const error = new Error('terminal write failure');
    const started: number[] = [];
    let settled = false;
    const run = runPreparationWorkers(
      [0, 1, 2, 3],
      3,
      () => {},
      async (index, signal) => {
        started.push(index);
        if (index === 0) {
          await fail.promise;
          throw error;
        }
        if (index === 1) {
          await waitForPreparationRetry(600_000, signal);
        }
        if (index === 2) {
          allStarted.resolve();
          await finishWrite.promise;
        }
      },
    );
    const result = assert
      .rejects(run, (candidate) => candidate === error)
      .then(() => {
        settled = true;
      });
    await allStarted.promise;
    assert.equal(vi.getTimerCount(), 1);
    fail.resolve();
    await vi.advanceTimersByTimeAsync(0);
    assert.equal(vi.getTimerCount(), 0);
    assert.equal(settled, false);
    assert.deepEqual(started, [0, 1, 2]);
    finishWrite.resolve();
    await result;
  });

  it('drains workers after a dispatcher error and preserves a later integrity failure', async () => {
    const finishWrite = deferred();
    const error = new Error('shutdown');
    const integrity = Object.assign(new Error('corrupt committed batch'), {
      code: RECIPIENT_VERIFICATION_CODE,
    });
    let claims = 0;
    let settled = false;
    const run = runPreparationWorkers(
      [0, 1],
      2,
      () => {
        claims += 1;
        if (claims === 2) {
          throw error;
        }
      },
      async () => {
        await finishWrite.promise;
        throw integrity;
      },
    );
    const result = assert
      .rejects(run, (candidate) => candidate === integrity)
      .then(() => {
        settled = true;
      });
    await Promise.resolve();
    assert.equal(settled, false);
    finishWrite.resolve();
    await result;
  });

  it('does not dispatch after an iterator throws', async () => {
    const error = new Error('cannot select next page');
    function* pages() {
      yield 1;
      throw error;
    }
    const finish = deferred();
    const started: number[] = [];
    const run = runPreparationWorkers(
      pages(),
      2,
      () => {},
      async (value) => {
        started.push(value);
        await finish.promise;
      },
    );
    const result = assert.rejects(run, (candidate) => candidate === error);
    finish.resolve();
    await result;
    assert.deepEqual(started, [1]);
  });

  it('checks an already aborted retry signal before calling the operation', async () => {
    const controller = new AbortController();
    const error = new Error('another page failed');
    controller.abort(error);
    const service = new BatchSendingService({});
    const operation = vi.fn();
    await assert.rejects(
      service.retryDb(operation, { signal: controller.signal }),
      (candidate) => candidate === error,
    );
    assert.equal(operation.mock.calls.length, 0);
  });

  it('does not start another database attempt when aborted during backoff', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const service = new BatchSendingService({});
    const operation = vi.fn().mockRejectedValue(new Error('transient database error'));
    const error = new Error('another page failed');
    const result = assert.rejects(
      service.retryDb(operation, {
        maxRetries: 5,
        sleep: 600_000,
        signal: controller.signal,
        description: 'test page',
      }),
      (candidate) => candidate === error,
    );
    await vi.advanceTimersByTimeAsync(0);
    assert.equal(vi.getTimerCount(), 1);
    controller.abort(error);
    await result;
    assert.equal(operation.mock.calls.length, 1);
    assert.equal(vi.getTimerCount(), 0);
  });

  it('settles an operation already started when its signal is aborted', async () => {
    const controller = new AbortController();
    const finishWrite = deferred();
    const service = new BatchSendingService({});
    const run = service.retryDb(
      async () => {
        await finishWrite.promise;
        return 'committed';
      },
      {
        signal: controller.signal,
        description: 'test commit',
      },
    );
    controller.abort(new Error('sibling failed'));
    finishWrite.resolve();
    assert.equal(await run, 'committed');
  });

  it('removes the abort listener when the backoff completes normally', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, 'removeEventListener');
    const wait = waitForPreparationRetry(10, controller.signal);
    await vi.advanceTimersByTimeAsync(10);
    await wait;
    assert.equal(remove.mock.calls.length, 1);
    assert.equal(vi.getTimerCount(), 0);
  });
});
