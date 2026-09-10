import assert from 'node:assert/strict';
import createKnex, { type Knex } from 'knex';
import sinon from 'sinon';
import nock from 'nock';
import { SuppressionCleanupRepository } from '../../../core/server/services/email-suppression-list/suppression-cleanup-repository';
import { SuppressionCleanupWorker } from '../../../core/server/services/email-suppression-list/suppression-cleanup-worker';
import { SuppressionCleanupClient } from '../../../core/server/services/email-suppression-list/suppression-cleanup-client';

const { createTable } = require('../../../core/server/data/schema/commands');
const request = {
  kind: 'complaints' as const,
  email: 'member@example.com',
  domain: 'sending.example.com',
  apiOrigin: 'https://api.eu.mailgun.net',
  eventId: 'provider-event-1',
  eventTimestamp: '2026-09-01T12:00:00.000Z',
};

describe('Suppression cleanup worker', () => {
  let knex: Knex;
  let repository: SuppressionCleanupRepository;

  beforeAll(() => nock.disableNetConnect());
  afterAll(() => nock.enableNetConnect());

  beforeEach(async () => {
    knex = createKnex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await createTable('outbox', knex);
    repository = new SuppressionCleanupRepository(knex);
  });
  afterEach(async () => {
    await knex.destroy();
  });

  it('drains committed work and does not repeat a completed cleanup', async () => {
    await knex.transaction((trx) => repository.enqueue(request, trx));
    const removed: unknown[] = [];
    const worker = new SuppressionCleanupWorker({
      repository,
      enabled: () => true,
      client: () => ({
        remove: async (target) => {
          removed.push(target);
          return { status: 'removed' as const };
        },
      }),
    });
    await worker.run();
    await worker.run();
    assert.deepEqual(removed, [request]);
    assert.equal(await repository.claim(), null);
  });

  it.each([
    '{broken',
    'null',
    JSON.stringify({ ...request, email: '' }),
    JSON.stringify({ ...request, kind: '../complaints' }),
    JSON.stringify({ ...request, domain: '..' }),
  ])(
    'quarantines malformed work without deleting a broader target or blocking valid work: %s',
    async (payload) => {
      await knex.transaction((trx) => repository.enqueue(request, trx));
      await knex('outbox').update({ payload });
      const valid = { ...request, eventId: 'valid-event' };
      await knex.transaction((trx) => repository.enqueue(valid, trx));
      const removed: unknown[] = [];
      const worker = new SuppressionCleanupWorker({
        repository,
        enabled: () => true,
        client: () => ({
          remove: async (target) => {
            removed.push(target);
            return { status: 'removed' as const };
          },
        }),
      });
      await worker.run();
      assert.deepEqual(removed, [valid]);
      assert.equal(await repository.claim(new Date(Date.now() + 600000)), null);
    },
  );

  it('persists provider backoff so a new worker cannot retry the same item early', async () => {
    await knex.transaction((trx) => repository.enqueue(request, trx));
    const retryAt = Date.now() + 120000;
    let attempts = 0;
    const worker = new SuppressionCleanupWorker({
      repository,
      enabled: () => true,
      client: () => ({
        remove: async () => {
          attempts += 1;
          throw Object.assign(new Error('request failed'), {
            status: 429,
            rateLimit: { remaining: 0, resetAt: retryAt },
          });
        },
      }),
    });
    await worker.run();
    assert.equal(attempts, 1);
    assert.equal(await repository.claim(new Date(retryAt - 1)), null);
    const retry = await repository.claim(new Date(retryAt + 1000));
    assert.ok(retry);
    assert.equal(retry.attempt, 2);
  });

  it.each(['limited', 'exhausted-quota'])(
    'shares %s cooldown across items and worker runs',
    async (outcome) => {
      await knex.transaction((trx) => repository.enqueue(request, trx));
      await knex.transaction((trx) =>
        repository.enqueue({ ...request, eventId: 'second-event' }, trx),
      );
      let attempts = 0;
      const rateLimit = { remaining: 0, resetAt: Date.now() + 120000 };
      const worker = new SuppressionCleanupWorker({
        repository,
        enabled: () => true,
        client: () => ({
          remove: async () => {
            attempts += 1;
            if (outcome === 'limited') {
              throw Object.assign(new Error('limited'), { status: 429, rateLimit });
            }
            return { status: 'removed' as const, rateLimit };
          },
        }),
      });
      await worker.run();
      await worker.run();
      assert.equal(attempts, 1);
      assert.ok(await repository.claim());
    },
  );

  it('leaves exhausted retries visible as failed work instead of retrying forever', async () => {
    await knex.transaction((trx) => repository.enqueue(request, trx));
    await knex('outbox').update({ retry_count: 19 });
    const worker = new SuppressionCleanupWorker({
      repository,
      enabled: () => true,
      client: () => ({
        remove: async () => {
          throw Object.assign(new Error('private-provider-error'), { status: 500 });
        },
      }),
    });
    await worker.run();
    assert.equal(await repository.claim(new Date(Date.now() + 86400000)), null);
    const stored = await knex('outbox').first();
    assert.equal(stored.status, 'failed');
    assert.equal(stored.message, 'RETRY_EXHAUSTED_HTTP_500');
  });

  it('aborts and drains an active removal on shutdown, leaving the intent immediately retryable', async () => {
    await knex.transaction((trx) => repository.enqueue(request, trx));
    let started!: () => void;
    const requested = new Promise<void>((resolve) => {
      started = resolve;
    });
    let release: (() => void) | undefined;
    let attempts = 0;
    const worker = new SuppressionCleanupWorker({
      repository,
      enabled: () => true,
      client: () => ({
        remove: async (_target, signal) => {
          attempts += 1;
          started();
          return new Promise<never>((_resolve, reject) => {
            release = () => reject(new Error('aborted transport'));
            signal?.addEventListener('abort', release, { once: true });
          });
        },
      }),
    });
    const running = worker.run();
    running.catch(() => {});
    await requested;
    try {
      await worker.shutdown();
      await running;
      const recovered = await repository.claim();
      assert.ok(recovered);
      assert.equal(recovered.attempt, 2);
      await worker.run();
      assert.equal(attempts, 1);
    } finally {
      release?.();
      await running.catch(() => {});
    }
  });

  it('bounds one invocation even when every queued item is malformed', async () => {
    await knex('outbox').insert(
      Array.from({ length: 251 }, (_value, index) => ({
        id: String(index).padStart(24, '0'),
        event_type: 'email-suppression-cleanup',
        payload: '{}',
        status: 'pending',
        created_at: '2026-09-01 00:00:00',
      })),
    );
    const worker = new SuppressionCleanupWorker({
      repository,
      enabled: () => true,
      client: () => ({
        remove: async () => {
          assert.fail('invalid item reached the provider');
        },
      }),
    });
    const result = await worker.run();
    assert.deepEqual(result, { completed: 0, retrying: 0, failed: 250 });
    assert.ok(await repository.claim());
  });

  it('stops starting work after thirty seconds even before reaching the item cap', async () => {
    for (let index = 0; index < 4; index++) {
      await knex.transaction((trx) =>
        repository.enqueue({ ...request, eventId: `event-${index}` }, trx),
      );
    }
    let elapsed = 0;
    const realNow = performance.now.bind(performance);
    const clock = sinon.stub(performance, 'now').callsFake(() => realNow() + elapsed);
    try {
      const worker = new SuppressionCleanupWorker({
        repository,
        enabled: () => true,
        client: () => ({
          remove: async () => {
            elapsed += 11000;
            return { status: 'removed' as const };
          },
        }),
      });
      assert.deepEqual(await worker.run(), { completed: 3, retrying: 0, failed: 0 });
      assert.ok(await repository.claim());
    } finally {
      clock.restore();
    }
  });

  it('paces serial requests explicitly instead of issuing a burst', async () => {
    await knex.transaction((trx) => repository.enqueue(request, trx));
    await knex.transaction((trx) =>
      repository.enqueue({ ...request, eventId: 'second-event' }, trx),
    );
    const starts: number[] = [];
    const worker = new SuppressionCleanupWorker({
      repository,
      enabled: () => true,
      client: () => ({
        remove: async () => {
          starts.push(performance.now());
          return { status: 'removed' as const };
        },
      }),
    });
    await worker.run();
    assert.equal(starts.length, 2);
    assert.ok(
      starts[1] - starts[0] >= 100,
      `requests started only ${starts[1] - starts[0]}ms apart`,
    );
  });

  it('honors a quota reset even when the current item has exhausted its retries', async () => {
    await knex.transaction((trx) => repository.enqueue(request, trx, new Date(Date.now() - 10000)));
    await knex('outbox').update({ retry_count: 19 });
    await knex.transaction((trx) =>
      repository.enqueue({ ...request, eventId: 'fresh-event' }, trx),
    );
    let attempts = 0;
    const worker = new SuppressionCleanupWorker({
      repository,
      enabled: () => true,
      client: () => ({
        remove: async () => {
          attempts += 1;
          throw Object.assign(new Error('limited'), {
            status: 429,
            rateLimit: { resetAt: Date.now() + 120000 },
          });
        },
      }),
    });
    assert.deepEqual(await worker.run(), { completed: 0, retrying: 0, failed: 1 });
    assert.equal(attempts, 1);
    assert.ok(await repository.claim());
  });

  it.each([false, true])(
    'keeps work unclaimed when disabled or credentials are unavailable (enabled=%s)',
    async (enabled) => {
      await knex.transaction((trx) => repository.enqueue(request, trx));
      const worker = new SuppressionCleanupWorker({
        repository,
        enabled: () => enabled,
        client: () => {
          assert.equal(enabled, true, 'disabled worker looked up credentials');
          return null;
        },
      });
      assert.deepEqual(await worker.run(), { completed: 0, retrying: 0, failed: 0 });
      assert.equal((await repository.claim())?.attempt, 1);
    },
  );

  it('releases a claim when disabled while the database claim is in flight', async () => {
    await knex.transaction((trx) => repository.enqueue(request, trx));
    let enabled = true;
    const originalClaim = repository.claim.bind(repository);
    const claim = sinon.stub(repository, 'claim').callsFake(async () => {
      const claimed = await originalClaim();
      enabled = false;
      return claimed;
    });
    try {
      const worker = new SuppressionCleanupWorker({
        repository,
        enabled: () => enabled,
        client: () => ({
          remove: async () => {
            assert.fail('disabled worker called provider');
          },
        }),
      });
      assert.deepEqual(await worker.run(), { completed: 0, retrying: 1, failed: 0 });
      assert.equal((await originalClaim())?.attempt, 2);
    } finally {
      claim.restore();
    }
  });

  it('coalesces overlapping job deliveries into one serial drain', async () => {
    await knex.transaction((trx) => repository.enqueue(request, trx));
    await knex.transaction((trx) =>
      repository.enqueue({ ...request, eventId: 'second-event' }, trx),
    );
    let active = 0;
    let maximum = 0;
    let removed = 0;
    const worker = new SuppressionCleanupWorker({
      repository,
      enabled: () => true,
      client: () => ({
        remove: async () => {
          active += 1;
          maximum = Math.max(maximum, active);
          await new Promise((resolve) => {
            setTimeout(resolve, 10);
          });
          active -= 1;
          removed += 1;
          return { status: 'removed' as const };
        },
      }),
    });
    const first = worker.run();
    const second = worker.run();
    assert.equal(first, second);
    await Promise.all([first, second]);
    assert.equal(maximum, 1);
    assert.equal(removed, 2);
  });

  it('stops during pacing without reserving the next item', async () => {
    await knex.transaction((trx) => repository.enqueue(request, trx));
    await knex.transaction((trx) =>
      repository.enqueue({ ...request, eventId: 'second-event' }, trx),
    );
    let notify!: () => void;
    const firstRequest = new Promise<void>((resolve) => {
      notify = resolve;
    });
    let removed = 0;
    const worker = new SuppressionCleanupWorker({
      repository,
      enabled: () => true,
      client: () => ({
        remove: async () => {
          removed += 1;
          notify();
          return { status: 'removed' as const };
        },
      }),
    });
    const running = worker.run();
    await firstRequest;
    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });
    await worker.shutdown();
    await running;
    assert.equal(removed, 1);
    assert.equal((await repository.claim())?.attempt, 1);
  });

  it('backs off a transport failure without persisting its raw message', async () => {
    await knex.transaction((trx) => repository.enqueue(request, trx));
    const startedAt = Date.now();
    const worker = new SuppressionCleanupWorker({
      repository,
      enabled: () => true,
      client: () => ({
        remove: async () => {
          throw new Error('private-request-credentials');
        },
      }),
    });
    assert.deepEqual(await worker.run(), { completed: 0, retrying: 1, failed: 0 });
    assert.equal(await repository.claim(new Date(startedAt + 29000)), null);
    assert.equal((await repository.claim(new Date(startedAt + 40000)))?.attempt, 2);
    assert.equal((await knex('outbox').first()).message, 'TRANSPORT_ERROR');
  });

  it('retains a safe diagnostic for an API origin mismatch', async () => {
    await knex.transaction((trx) => repository.enqueue(request, trx));
    const worker = new SuppressionCleanupWorker({
      repository,
      enabled: () => true,
      client: () =>
        new SuppressionCleanupClient({
          baseUrl: 'https://api.mailgun.net/v3',
          apiKey: 'test-api-key',
        }),
    });
    assert.deepEqual(await worker.run(), { completed: 0, retrying: 1, failed: 0 });
    assert.equal((await knex('outbox').first()).message, 'API_ORIGIN_CHANGED');
  });
});
