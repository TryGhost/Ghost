import assert from 'node:assert/strict';
import type { Knex } from 'knex';
import type { DispatchEnvelope, JobsBackendBase } from '@tryghost/adapter-base-jobs';
import { JobsOutbox } from '../../../core/server/services/jobs-service/jobs-outbox';
import { OutboxRelay } from '../../../core/server/services/jobs-service/outbox-relay';
import { JobsService } from '../../../core/server/services/jobs-service/jobs-service';
import { Job } from '../../../core/server/services/jobs-service/job';
import InMemoryJobsBackend from '../../../core/server/adapters/jobs/InMemoryJobsBackend';

const testUtils = require('../../utils');
const DatabaseInfo = require('@tryghost/database-info');
const ObjectID = require('bson-objectid').default;
const knex = require('../../../core/server/data/db').knex;

const TABLE = 'jobs_outbox';
const isMySQL = DatabaseInfo.isMySQL(knex);

// Small timings keep the relay-loop tests fast and deterministic.
const TIMINGS = { pollIntervalMs: 20, submissionTimeoutMs: 2000, retryDelayMs: 120 };

const silentLogger = { error() {}, info() {}, warn() {} };
const noopSentry = { captureException() {} };

function newId(): string {
  return new ObjectID().toHexString();
}

function envelopeFor(
  type = 'test-job',
  data: Record<string, unknown> = { value: 1 },
): DispatchEnvelope {
  return { version: 1, payload: { job: { type, payload: JSON.stringify(data) } } };
}

interface BackendCall {
  id: string;
  envelope: DispatchEnvelope;
}

function makeBackend() {
  const calls: BackendCall[] = [];
  let behaviour: (id: string, envelope: DispatchEnvelope) => Promise<void> = async () => {};
  return {
    calls,
    on(fn: (id: string, envelope: DispatchEnvelope) => Promise<void>) {
      behaviour = fn;
    },
    async enqueue(id: string, envelope: DispatchEnvelope): Promise<void> {
      calls.push({ id, envelope });
      await behaviour(id, envelope);
    },
  };
}

class GreetJob extends Job {
  static type = 'e2e-greet';
  name: string;
  constructor(data: { name: string }) {
    super();
    this.name = data.name;
  }
}

// Wraps a real backend to observe forwarded envelopes, and optionally fail the
// first submission of each id so retry and routing preservation can be checked
// end-to-end.
function recordingBackend(real: InMemoryJobsBackend, { failFirst = false } = {}) {
  const calls: BackendCall[] = [];
  const failedOnce = new Set<string>();
  return {
    calls,
    start(options: Parameters<InMemoryJobsBackend['start']>[0]) {
      return real.start(options);
    },
    shutdown(options?: Parameters<InMemoryJobsBackend['shutdown']>[0]) {
      return real.shutdown(options);
    },
    scheduleRecurring(
      envelope: DispatchEnvelope,
      schedule: Parameters<InMemoryJobsBackend['scheduleRecurring']>[1],
    ) {
      return real.scheduleRecurring(envelope, schedule);
    },
    async enqueue(id: string, envelope: DispatchEnvelope): Promise<void> {
      calls.push({ id, envelope });
      if (failFirst && !failedOnce.has(id)) {
        failedOnce.add(id);
        throw new Error('forced one-time failure');
      }
      return real.enqueue(id, envelope);
    },
  };
}

async function waitFor(
  check: () => Promise<boolean> | boolean,
  { timeoutMs = 4000, intervalMs = 10 } = {},
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) {
      return true;
    }
    await new Promise((resolve) => {
      setTimeout(resolve, intervalMs);
    });
  }
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function countRows(): Promise<number> {
  const [{ count }] = await knex(TABLE).count({ count: '*' });
  return Number(count);
}

async function rowById(id: string): Promise<{ available_at: Date } | undefined> {
  return knex(TABLE).select('available_at').where('id', id).first();
}

describe.runIf(isMySQL)('Jobs outbox + relay (MySQL)', function () {
  let outbox: JobsOutbox;

  beforeAll(testUtils.teardownDb);
  beforeAll(testUtils.setup());

  beforeEach(async function () {
    await knex(TABLE).truncate();
    outbox = new JobsOutbox({ knex });
  });

  describe('JobsOutbox.insert', function () {
    it('commits the row with the caller transaction, or rolls it back together', async function () {
      const committedId = newId();
      await knex.transaction(async (trx: Knex.Transaction) => {
        await outbox.insert({ id: committedId, envelope: envelopeFor() }, { transacting: trx });
      });
      assert.equal(await countRows(), 1, 'a committed transaction leaves the row');

      const rolledBackId = newId();
      await assert.rejects(
        knex.transaction(async (trx: Knex.Transaction) => {
          await outbox.insert({ id: rolledBackId, envelope: envelopeFor() }, { transacting: trx });
          throw new Error('roll back');
        }),
      );
      assert.equal(await rowById(rolledBackId), undefined, 'a rolled-back insert leaves no row');
      assert.equal(await countRows(), 1, 'only the committed row remains');
    });

    it('makes a freshly inserted row immediately eligible (UTC pin)', async function () {
      const id = newId();
      await outbox.insert({ id, envelope: envelopeFor() });

      const submitted: string[] = [];
      const outcome = await outbox.processNext(
        async (claimedId) => {
          submitted.push(claimedId);
        },
        { retryDelayMs: TIMINGS.retryDelayMs },
      );

      assert.deepEqual(submitted, [id], 'the row was eligible the instant after insertion');
      assert.equal(outcome.status, 'delivered');
    });
  });

  describe('JobsOutbox.processNext', function () {
    it('forwards the exact id and envelope, then deletes on confirmed acceptance', async function () {
      const id = newId();
      const envelope = envelopeFor('greet', { name: 'Ada' });
      await outbox.insert({ id, envelope });

      const seen: BackendCall[] = [];
      const outcome = await outbox.processNext(
        async (claimedId, claimedEnvelope) => {
          seen.push({ id: claimedId, envelope: claimedEnvelope });
        },
        { retryDelayMs: TIMINGS.retryDelayMs },
      );

      assert.equal(outcome.status, 'delivered');
      assert.equal(seen.length, 1);
      assert.equal(seen[0]!.id, id);
      assert.deepEqual(seen[0]!.envelope, envelope);
      assert.equal(await countRows(), 0, 'a delivered row is removed');
    });

    it('retains a rejected row and moves its available_at forward', async function () {
      const id = newId();
      await outbox.insert({ id, envelope: envelopeFor() });
      const before = (await rowById(id))!.available_at;

      const outcome = await outbox.processNext(
        async () => {
          throw new Error('backend refused');
        },
        { retryDelayMs: 5000 },
      );

      assert.equal(outcome.status, 'failed');
      const after = (await rowById(id))!.available_at;
      assert.ok(
        after.getTime() > before.getTime(),
        'available_at is bumped past its original value',
      );
      assert.ok(after.getTime() > Date.now(), 'the bumped row is no longer eligible');
      assert.equal(await countRows(), 1, 'a rejected row is retained, never discarded');
    });

    it('reports idle when no row is eligible', async function () {
      const id = newId();
      await outbox.insert({ id, envelope: envelopeFor() });
      // Bump it out of eligibility.
      await outbox.processNext(
        async () => {
          throw new Error('refused');
        },
        { retryDelayMs: 60000 },
      );

      const outcome = await outbox.processNext(async () => {}, {
        retryDelayMs: TIMINGS.retryDelayMs,
      });
      assert.equal(outcome.status, 'idle');
    });

    it('reuses the same id and byte-identical envelope on a retry', async function () {
      const id = newId();
      const envelope = envelopeFor('greet', { name: 'Ada', nested: { a: [1, 2, 3] } });
      await outbox.insert({ id, envelope });

      const attempts: BackendCall[] = [];
      await outbox.processNext(
        async (claimedId, claimedEnvelope) => {
          attempts.push({ id: claimedId, envelope: claimedEnvelope });
          throw new Error('refused once');
        },
        { retryDelayMs: 60 },
      );

      await waitFor(async () => {
        const row = await rowById(id);
        return !!row && row.available_at.getTime() <= Date.now();
      });

      const outcome = await outbox.processNext(
        async (claimedId, claimedEnvelope) => {
          attempts.push({ id: claimedId, envelope: claimedEnvelope });
        },
        { retryDelayMs: 60 },
      );

      assert.equal(outcome.status, 'delivered');
      assert.equal(attempts.length, 2);
      assert.equal(attempts[0]!.id, attempts[1]!.id, 'the dispatch id is stable across retries');
      assert.equal(
        JSON.stringify(attempts[0]!.envelope),
        JSON.stringify(attempts[1]!.envelope),
        'the envelope is byte-identical across retries',
      );
      assert.deepEqual(attempts[1]!.envelope, envelope);
    });

    it('claims rows in (available_at, id) order', async function () {
      const now = Date.now();
      const rows = [
        { id: 'bbbbbbbbbbbbbbbbbbbbbbb2', at: new Date(now - 1000) },
        { id: 'aaaaaaaaaaaaaaaaaaaaaaa1', at: new Date(now - 1000) },
        { id: 'ccccccccccccccccccccccc3', at: new Date(now - 5000) },
      ];
      await knex(TABLE).insert(
        rows.map((r) => ({
          id: r.id,
          envelope: JSON.stringify(envelopeFor()),
          created_at: r.at,
          available_at: r.at,
        })),
      );

      const order: string[] = [];
      for (let i = 0; i < rows.length; i = i + 1) {
        const outcome = await outbox.processNext(
          async (claimedId) => {
            order.push(claimedId);
          },
          { retryDelayMs: TIMINGS.retryDelayMs },
        );
        assert.equal(outcome.status, 'delivered');
      }

      assert.deepEqual(order, [
        'ccccccccccccccccccccccc3', // earliest available_at
        'aaaaaaaaaaaaaaaaaaaaaaa1', // same available_at, lower id
        'bbbbbbbbbbbbbbbbbbbbbbb2',
      ]);
    });
  });

  describe('OutboxRelay', function () {
    let relays: OutboxRelay[] = [];

    function makeRelay(backend: ReturnType<typeof makeBackend>, overrides = {}): OutboxRelay {
      const relay = new OutboxRelay({
        outbox,
        backend,
        logging: silentLogger,
        sentry: noopSentry,
        ...TIMINGS,
        ...overrides,
      });
      relays.push(relay);
      return relay;
    }

    beforeEach(function () {
      relays = [];
    });

    afterEach(async function () {
      await Promise.all(relays.map((relay) => relay.stop()));
    });

    it('delivers a committed row and removes it', async function () {
      const id = newId();
      await outbox.insert({ id, envelope: envelopeFor() });

      const backend = makeBackend();
      makeRelay(backend).start();

      const delivered = await waitFor(() => backend.calls.length === 1);
      assert.ok(delivered, 'the relay forwarded the committed row');
      assert.equal(backend.calls[0]!.id, id);
      assert.ok(
        await waitFor(async () => (await countRows()) === 0),
        'the delivered row is removed',
      );
    });

    it('does not let a rejected row block the eligible rows behind it', async function () {
      const poison = newId();
      const good = newId();
      await outbox.insert({ id: poison, envelope: envelopeFor('poison') });
      await delay(5); // ensure the good row sorts after the poison row by id-time
      await outbox.insert({ id: good, envelope: envelopeFor('good') });

      const backend = makeBackend();
      backend.on(async (id) => {
        if (id === poison) {
          throw new Error('poison always fails');
        }
      });
      makeRelay(backend).start();

      assert.ok(
        await waitFor(async () => (await rowById(good)) === undefined),
        'the good row is delivered despite the poison row failing',
      );
      assert.ok(await rowById(poison), 'the poison row is retained for a later retry');
      assert.ok(
        backend.calls.some((call) => call.id === poison),
        'the poison row was attempted',
      );
    });

    it('delivers every pre-existing committed row (restart recovery)', async function () {
      const ids = Array.from({ length: 8 }, () => newId());
      await knex(TABLE).insert(
        ids.map((id) => ({
          id,
          envelope: JSON.stringify(envelopeFor()),
          created_at: new Date(),
          available_at: new Date(),
        })),
      );

      const backend = makeBackend();
      makeRelay(backend).start();

      assert.ok(
        await waitFor(async () => (await countRows()) === 0),
        'a fresh relay drains rows that were committed before it started',
      );
      assert.deepEqual(backend.calls.map((c) => c.id).sort(), [...ids].sort());
    });

    it('two relays over the same table deliver each row exactly once', async function () {
      const ids = Array.from({ length: 12 }, () => newId());
      await knex(TABLE).insert(
        ids.map((id) => ({
          id,
          envelope: JSON.stringify(envelopeFor()),
          created_at: new Date(),
          available_at: new Date(),
        })),
      );

      const delivered: string[] = [];
      const backendA = makeBackend();
      const backendB = makeBackend();
      backendA.on(async (id) => {
        delivered.push(id);
      });
      backendB.on(async (id) => {
        delivered.push(id);
      });
      makeRelay(backendA).start();
      makeRelay(backendB).start();

      assert.ok(
        await waitFor(async () => (await countRows()) === 0),
        'both relays drain the table',
      );
      assert.deepEqual(delivered.slice().sort(), [...ids].sort(), 'every row delivered once');
      assert.equal(new Set(delivered).size, delivered.length, 'no row delivered twice');
    });

    it('stop() waits out an in-flight submission', async function () {
      const id = newId();
      await outbox.insert({ id, envelope: envelopeFor() });

      const gate = Promise.withResolvers<void>();
      const backend = makeBackend();
      backend.on(async () => {
        await gate.promise;
      });
      const relay = makeRelay(backend);
      relay.start();

      assert.ok(await waitFor(() => backend.calls.length === 1), 'the submission started');

      let stopped = false;
      const stopping = relay.stop().then(() => {
        stopped = true;
      });
      await delay(100);
      assert.equal(stopped, false, 'stop() does not resolve while a submission is in flight');

      gate.resolve();
      await stopping;
      assert.equal(stopped, true);
      assert.equal(
        await countRows(),
        0,
        'the in-flight submission completed and its row was removed',
      );
    });
  });

  describe('dispatch end-to-end through the outbox', function () {
    let services: JobsService[] = [];

    function buildActiveService({
      queue,
      failFirst = false,
    }: { queue?: string; failFirst?: boolean } = {}) {
      const real = new InMemoryJobsBackend();
      const backend = recordingBackend(real, { failFirst });
      const store = new JobsOutbox({ knex });
      const relay = new OutboxRelay({
        outbox: store,
        backend,
        logging: silentLogger,
        sentry: noopSentry,
        ...TIMINGS,
      });
      const service = new JobsService({
        backend: backend as unknown as JobsBackendBase,
        logging: silentLogger,
        sentry: noopSentry,
        outbox: { store, relay },
      });
      const delivered: GreetJob[] = [];
      const handler = async (job: GreetJob) => {
        delivered.push(job);
      };
      if (queue) {
        service.handle(GreetJob, handler, { queue, concurrency: 1 });
      } else {
        service.handle(GreetJob, handler);
      }
      services.push(service);
      return { service, backend, delivered };
    }

    beforeEach(function () {
      services = [];
    });

    afterEach(async function () {
      await Promise.all(services.map((service) => service.shutdown({ timeoutMs: 1000 })));
    });

    it('commits a row on a plain dispatch and the relay delivers it', async function () {
      const { service, delivered } = buildActiveService();
      await service.start();

      await service.dispatch(new GreetJob({ name: 'Ada' }));

      assert.ok(await waitFor(() => delivered.length === 1), 'the dispatched job was delivered');
      assert.equal(delivered[0]!.name, 'Ada');
      assert.ok(
        await waitFor(async () => (await countRows()) === 0),
        'the delivered row is removed',
      );
    });

    it('rolls the row back with the caller transaction, so the job is never delivered', async function () {
      const { service, delivered } = buildActiveService();
      await service.start();

      await assert.rejects(
        knex.transaction(async (trx: Knex.Transaction) => {
          await service.dispatch(new GreetJob({ name: 'Rolled' }), { transacting: trx });
          throw new Error('roll back');
        }),
      );

      // Give the relay several poll cycles to prove nothing was committed.
      await delay(TIMINGS.pollIntervalMs * 4 + 50);
      assert.equal(delivered.length, 0, 'a rolled-back dispatch delivers nothing');
      assert.equal(await countRows(), 0, 'and leaves no row');
    });

    it('delivers once the caller transaction commits', async function () {
      const { service, delivered } = buildActiveService();
      await service.start();

      await knex.transaction(async (trx: Knex.Transaction) => {
        await service.dispatch(new GreetJob({ name: 'Committed' }), { transacting: trx });
      });

      assert.ok(await waitFor(() => delivered.length === 1), 'a committed dispatch is delivered');
      assert.equal(delivered[0]!.name, 'Committed');
    });

    it('preserves the default lane end-to-end (no routing in the forwarded envelope)', async function () {
      const { service, backend, delivered } = buildActiveService();
      await service.start();

      await service.dispatch(new GreetJob({ name: 'Ada' }));

      assert.ok(await waitFor(() => delivered.length === 1));
      assert.equal(
        (backend.calls.at(-1)!.envelope.payload as { routing?: unknown }).routing,
        undefined,
        'an unrouted job carries no routing',
      );
    });

    it('preserves a named lane end-to-end, including across a forced retry', async function () {
      const { service, backend, delivered } = buildActiveService({
        queue: 'greetings',
        failFirst: true,
      });
      await service.start();

      await service.dispatch(new GreetJob({ name: 'Ada' }));

      assert.ok(
        await waitFor(() => delivered.length === 1),
        'the job is delivered after the forced retry',
      );
      assert.ok(backend.calls.length >= 2, 'the first submission failed and was retried');
      assert.ok(
        backend.calls.every(
          (call) =>
            (call.envelope.payload as { routing?: { queue?: string } }).routing?.queue ===
            'greetings',
        ),
        'every attempt, retry included, preserves the named lane',
      );
    });
  });
});

describe.runIf(!isMySQL)('Jobs outbox fallback (non-MySQL)', function () {
  beforeAll(testUtils.teardownDb);
  beforeAll(testUtils.setup());

  afterEach(async function () {
    await knex(TABLE).truncate();
  });

  // The relay path is MySQL-only (FOR UPDATE SKIP LOCKED), so an enabled flag on
  // SQLite must fall back to the legacy direct path, warn once, and never touch
  // the outbox table.
  it('with the flag enabled on SQLite, warns at start and uses the legacy path', async function () {
    assert.ok(DatabaseInfo.isSQLite(knex), 'this suite only runs on SQLite');

    const warnings: unknown[][] = [];
    const logging = {
      error() {},
      info() {},
      warn: (...args: unknown[]) => warnings.push(args),
    };
    const backend = new InMemoryJobsBackend();
    const delivered: GreetJob[] = [];
    // logOutboxUnavailable mirrors what init() passes on an enabled-but-SQLite
    // database: no outbox wiring, legacy path, a warning at start.
    const service = new JobsService({
      backend,
      logging,
      sentry: noopSentry,
      logOutboxUnavailable: true,
    });
    service.handle(GreetJob, async (job) => {
      delivered.push(job);
    });

    await service.start();
    assert.ok(
      warnings.some((args) => /outbox/i.test(String(args[0]))),
      'a warning is logged at start',
    );

    await service.dispatch(new GreetJob({ name: 'Ada' }));
    assert.ok(await waitFor(() => delivered.length === 1), 'the legacy path delivers the job');

    assert.equal(await countRows(), 0, 'the outbox table is left untouched');
    await service.shutdown({ timeoutMs: 1000 });
  });
});
