import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import net from 'node:net';
import { Queue } from 'bullmq';
import type { RedisConnection } from 'bullmq';
import type { JobEnvelope, DispatchEnvelope } from '@tryghost/adapter-base-jobs';
import { runJobsBackendContractTests } from '@tryghost/adapter-base-jobs/contract-test-suite';
import { JobsService } from '../../../../core/server/services/jobs-service/jobs-service';
import { Job } from '../../../../core/server/services/jobs-service/job';
import BullMQJobsBackend from '../../../../core/server/adapters/jobs/BullMQJobsBackend';

const sinon = require('sinon');
const logging = require('@tryghost/logging');

const redisUp = process.env.GHOST_TEST_REDIS_AVAILABLE === '1';
const connection = { host: '127.0.0.1', port: 6379 };
const fileId = crypto.randomBytes(4).toString('hex');
const prefixes: string[] = [];

const fastConfig = {
  lockDuration: 1000,
  stalledInterval: 500,
  maxStalledCount: 1,
};

function newPrefix(): string {
  const prefix = `test-jobs-${fileId}-${prefixes.length}`;
  prefixes.push(prefix);
  return prefix;
}

function makeBackend(config: Record<string, unknown> = {}): BullMQJobsBackend {
  return new BullMQJobsBackend({
    connection,
    prefix: newPrefix(),
    ...fastConfig,
    ...config,
  });
}

function dispatch(job: JobEnvelope, queue?: string): DispatchEnvelope {
  return {
    version: 1,
    payload: queue === undefined ? { job } : { job, routing: { queue } },
  };
}

function inspect(prefix: string, name = 'default'): Queue {
  return new Queue(name, { connection, prefix });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitFor(condition: () => boolean | Promise<boolean>, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (!(await condition())) {
    if (Date.now() > deadline) {
      throw new Error('Timed out waiting for condition');
    }
    await delay(25);
  }
}

interface Scanner {
  scan(cursor: string, ...args: (string | number)[]): Promise<[string, string[]]>;
  del(...keys: string[]): Promise<number>;
}

async function deleteKeys(prefix: string): Promise<void> {
  const queue = new Queue('cleanup', { connection, prefix });
  const client = (await queue.client) as unknown as Scanner;
  let cursor = '0';
  do {
    const [next, keys] = await client.scan(cursor, 'MATCH', `${prefix}:*`, 'COUNT', 500);
    cursor = next;
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } while (cursor !== '0');
  await queue.close();
}

describe.skipIf(!redisUp)('Integration: BullMQJobsBackend', function () {
  const job: JobEnvelope = { type: 'test-job', payload: '{"value":1}' };

  afterAll(async function () {
    for (const prefix of prefixes) {
      await deleteKeys(prefix);
    }
  });

  afterEach(function () {
    sinon.restore();
  });

  // A fresh prefix per backend: the contract tests reuse "dispatch-1"
  runJobsBackendContractTests(() => makeBackend(), {
    describe: (name, fn) => describe(name, fn),
    it,
  });

  it('dedupes an enqueue that reuses a dispatch id', async function () {
    const backend = makeBackend();
    const received: JobEnvelope[] = [];
    await backend.start({
      processor: async (env) => {
        received.push(env);
      },
    });

    await backend.enqueue('dup-1', dispatch(job));
    await waitFor(() => received.length === 1);
    await backend.enqueue('dup-1', dispatch(job));
    await delay(300);
    await backend.shutdown({ timeoutMs: 1000 });

    assert.equal(received.length, 1);
  });

  it('names its Redis connections with the configured connectionName', async function () {
    const connectionName = `test-jobs-${fileId}-named`;
    const backend = makeBackend({ connection: { ...connection, connectionName } });
    await backend.start({ processor: async () => {} });
    await backend.enqueue('named-1', dispatch(job));

    const queue = inspect(prefixes[prefixes.length - 1]!);
    const client = (await queue.client) as unknown as { client(command: string): Promise<string> };
    const clients = await client.client('LIST');
    await queue.close();
    await backend.shutdown({ timeoutMs: 1000 });

    assert.match(clients, new RegExp(`name=${connectionName} `));
  });

  it('shuts down without an unhandled error while a connection is still being established', async function () {
    // Reset the first 3 connections, then hang their reconnects
    let accepted = 0;
    const open = new Set<net.Socket>();
    const server = net.createServer((socket) => {
      accepted += 1;
      open.add(socket);
      socket.on('close', () => open.delete(socket));
      if (accepted <= 3) {
        socket.resetAndDestroy();
      } else {
        socket.resume();
      }
    });
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    const unhandled: unknown[] = [];
    const onUnhandled = (err: unknown) => unhandled.push(err);
    process.on('unhandledRejection', onUnhandled);
    sinon.stub(logging, 'error');

    try {
      const backend = new BullMQJobsBackend({
        connection: { host: '127.0.0.1', port: (server.address() as net.AddressInfo).port },
        prefix: newPrefix(),
      });
      await backend.start({ processor: async () => {} });
      await waitFor(() => accepted > 3);
      await backend.shutdown({ timeoutMs: 200 });
      await waitFor(() => open.size === 0);
      await delay(100);
    } finally {
      process.off('unhandledRejection', onUnhandled);
      server.close();
    }

    assert.deepEqual(unhandled, []);
  });

  it('bounds shutdown when closing never finishes', async function () {
    const realClose = Queue.prototype.close;
    const hung: Queue[] = [];
    sinon.stub(Queue.prototype, 'close').callsFake(function (this: Queue) {
      hung.push(this);
      return new Promise<void>(() => {});
    });
    const warn = sinon.stub(logging, 'warn');
    const disconnect = sinon.spy(Queue.prototype, 'disconnect');
    const backend = makeBackend();
    await backend.start({ processor: async () => {} });

    const startedAt = Date.now();
    await backend.shutdown({ timeoutMs: 100 });
    const elapsed = Date.now() - startedAt;
    const disconnected = disconnect.callCount;

    sinon.restore();
    await Promise.allSettled(hung.map((queue) => realClose.call(queue)));
    assert.ok(hung.length > 0);
    assert.ok(elapsed < 2000, `shutdown took ${elapsed}ms`);
    sinon.assert.calledWithMatch(warn, 'did not close in time');
    assert.ok(disconnected > 0);
  });

  it('fails an invalid payload for good, without running it or retrying', async function () {
    const error = sinon.stub(logging, 'error');
    const processor = sinon.stub().resolves();
    const backend = makeBackend();
    await backend.start({ processor });

    const queue = inspect(prefixes[prefixes.length - 1]!);
    await queue.add('corrupt', { type: 42 }, { jobId: 'corrupt-1', attempts: 3 });
    await waitFor(async () => (await queue.getJob('corrupt-1'))?.failedReason !== undefined);
    const stored = await queue.getJob('corrupt-1');
    await queue.close();
    await backend.shutdown({ timeoutMs: 1000 });

    sinon.assert.notCalled(processor);
    assert.equal(stored?.attemptsMade, 1);
    assert.match(stored?.failedReason ?? '', /invalid payload/);
    sinon.assert.calledWithMatch(error, 'invalid payload');
  });

  it('drops an error on a worker connection that arrives after shutdown', async function () {
    const open = new Set<net.Socket>();
    const server = net.createServer((socket) => {
      open.add(socket);
      socket.on('close', () => open.delete(socket));
      socket.resume();
    });
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    sinon.stub(logging, 'error');

    try {
      const backend = new BullMQJobsBackend({
        connection: { host: '127.0.0.1', port: (server.address() as net.AddressInfo).port },
        prefix: newPrefix(),
      });
      await backend.start({ processor: async () => {} });
      const lanes = (backend as unknown as { _lanes: Map<string, { worker: unknown }> })._lanes;
      const workers = [...lanes.values()].map(
        ({ worker }) =>
          worker as { connection: RedisConnection; blockingConnection: RedisConnection },
      );
      await backend.shutdown({ timeoutMs: 200 });

      for (const { connection: main, blockingConnection } of workers) {
        for (const conn of [main, blockingConnection]) {
          assert.doesNotThrow(() => conn.emit('error', new Error('connect ECONNREFUSED')));
        }
      }
    } finally {
      for (const socket of open) {
        socket.destroy();
      }
      server.close();
    }
  });

  it('caps concurrency per lane within one process', async function () {
    const running = { serial: 0, default: 0 };
    const max = { serial: 0, default: 0 };
    const release: Array<() => void> = [];
    const backend = makeBackend({ concurrency: 2 });
    await backend.start({
      processor: async (env) => {
        const lane = env.type === 'serial-job' ? 'serial' : 'default';
        running[lane] += 1;
        max[lane] = Math.max(max[lane], running[lane]);
        await new Promise<void>((resolve) => {
          release.push(resolve);
        });
        running[lane] -= 1;
      },
      queues: { serial: { concurrency: 1 } },
    });

    for (let i = 0; i < 4; i += 1) {
      await backend.enqueue(`s${i}`, dispatch({ type: 'serial-job', payload: '{}' }, 'serial'));
      await backend.enqueue(`d${i}`, dispatch({ type: 'plain-job', payload: '{}' }));
    }

    await waitFor(() => max.serial === 1 && max.default === 2);
    await delay(200);
    assert.equal(max.serial, 1);
    assert.equal(max.default, 2);

    const drain = setInterval(() => release.splice(0).forEach((resolve) => resolve()), 10);
    await backend.shutdown({ timeoutMs: 3000 });
    clearInterval(drain);
  });

  it('puts a job routed to an undeclared queue on its own BullMQ queue', async function () {
    const backend = makeBackend();
    const received: JobEnvelope[] = [];
    await backend.start({
      processor: async (env) => {
        received.push(env);
      },
    });

    await backend.enqueue('u1', dispatch(job, 'undeclared'));
    await waitFor(() => received.length === 1);
    await backend.shutdown({ timeoutMs: 1000 });

    const queue = inspect(prefixes[prefixes.length - 1]!, 'undeclared');
    const stored = await queue.getJob('u1');
    await queue.close();
    assert.deepEqual(stored?.data, job);
  });

  it('recovers a job from a stalled worker on another backend with the same prefix', async function () {
    const prefix = newPrefix();
    const a = new BullMQJobsBackend({ connection, prefix, ...fastConfig });
    const b = new BullMQJobsBackend({ connection, prefix, ...fastConfig });
    const started = Promise.withResolvers<void>();
    await a.start({
      processor: () => {
        started.resolve();
        return new Promise<void>(() => {});
      },
    });
    await a.enqueue('stall-1', dispatch(job));
    await started.promise;
    await a.shutdown({ timeoutMs: 50 });

    const received: JobEnvelope[] = [];
    await b.start({
      processor: async (env) => {
        received.push(env);
      },
    });
    await waitFor(() => received.length === 1, 8000);
    await b.shutdown({ timeoutMs: 1000 });

    assert.deepEqual(received, [job]);
  });

  it('leaves waiting jobs in Redis on shutdown for another backend with the same prefix', async function () {
    const prefix = newPrefix();
    const a = new BullMQJobsBackend({ connection, prefix, ...fastConfig, concurrency: 1 });
    const b = new BullMQJobsBackend({ connection, prefix, ...fastConfig });
    const started = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const ranOnA: JobEnvelope[] = [];
    await a.start({
      processor: async (env) => {
        ranOnA.push(env);
        started.resolve();
        await release.promise;
      },
    });
    const first: JobEnvelope = { type: 'first-job', payload: '{}' };
    const second: JobEnvelope = { type: 'second-job', payload: '{}' };
    await a.enqueue('hold-1', dispatch(first));
    await started.promise;
    await a.enqueue('wait-1', dispatch(second));

    const shutdown = a.shutdown({ timeoutMs: 1000 });
    release.resolve();
    await shutdown;

    const received: JobEnvelope[] = [];
    await b.start({
      processor: async (env) => {
        received.push(env);
      },
    });
    await waitFor(() => received.length === 1);
    await b.shutdown({ timeoutMs: 1000 });

    assert.deepEqual(ranOnA, [first]);
    assert.deepEqual(received, [second]);
  });

  it('logs a rejected processor and leaves the job in the failed set', async function () {
    const errorStub = sinon.stub(logging, 'error');
    const backend = makeBackend({ attempts: 1 });
    const attempted = Promise.withResolvers<void>();
    await backend.start({
      processor: async () => {
        attempted.resolve();
        throw new Error('boom');
      },
    });

    await backend.enqueue('fail-1', dispatch(job));
    await attempted.promise;
    const queue = inspect(prefixes[prefixes.length - 1]!);
    await waitFor(async () => (await (await queue.getJob('fail-1'))?.getState()) === 'failed');
    await backend.shutdown({ timeoutMs: 1000 });
    await queue.close();

    assert.match(String(errorStub.firstCall.args[0]), /test-job/);
  });

  describe('settlement', function () {
    const retry = { attempts: 2, backoff: { type: 'fixed', delay: 10 } };

    function recorder() {
      const settlements: Array<{ id: string; status: string }> = [];
      return {
        settlements,
        onSettled: async (id: string, settlement: { status: string }) => {
          settlements.push({ id, status: settlement.status });
        },
      };
    }

    it('reports a job that succeeds as completed', async function () {
      const backend = makeBackend();
      const { settlements, onSettled } = recorder();
      await backend.start({ processor: async () => {}, onSettled });

      await backend.enqueue('settle-ok', dispatch(job));
      await waitFor(() => settlements.length === 1);
      await backend.shutdown({ timeoutMs: 1000 });

      assert.deepEqual(settlements, [{ id: 'settle-ok', status: 'completed' }]);
    });

    it('reports a job that fails only once its attempts are used up', async function () {
      sinon.stub(logging, 'error');
      const backend = makeBackend(retry);
      const { settlements, onSettled } = recorder();
      let calls = 0;
      await backend.start({
        processor: async () => {
          calls += 1;
          throw new Error('boom');
        },
        onSettled,
      });

      await backend.enqueue('settle-dead', dispatch(job));
      await waitFor(() => settlements.length === 1);
      await backend.shutdown({ timeoutMs: 1000 });

      assert.equal(calls, 2);
      assert.deepEqual(settlements, [{ id: 'settle-dead', status: 'dead' }]);
    });

    it('reports a job that succeeds on a retry as completed, once', async function () {
      sinon.stub(logging, 'error');
      const backend = makeBackend(retry);
      const { settlements, onSettled } = recorder();
      let calls = 0;
      await backend.start({
        processor: async () => {
          calls += 1;
          if (calls === 1) {
            throw new Error('boom');
          }
        },
        onSettled,
      });

      await backend.enqueue('settle-retry', dispatch(job));
      await waitFor(() => settlements.length === 1);
      await delay(100);
      await backend.shutdown({ timeoutMs: 1000 });

      assert.deepEqual(settlements, [{ id: 'settle-retry', status: 'completed' }]);
    });

    it('reports an invalid payload as dead without retrying', async function () {
      sinon.stub(logging, 'error');
      const backend = makeBackend(retry);
      const { settlements, onSettled } = recorder();
      await backend.start({ processor: async () => {}, onSettled });

      const queue = inspect(prefixes[prefixes.length - 1]!);
      await queue.add('corrupt', { type: 42 }, { jobId: 'settle-corrupt', ...retry });
      await waitFor(() => settlements.length === 1);
      await queue.close();
      await backend.shutdown({ timeoutMs: 1000 });

      assert.deepEqual(settlements, [{ id: 'settle-corrupt', status: 'dead' }]);
    });

    it('reports a job that stalls more often than allowed as dead', async function () {
      sinon.stub(logging, 'error');
      const prefix = newPrefix();
      const noStalls = { ...fastConfig, maxStalledCount: 0 };
      const a = new BullMQJobsBackend({ connection, prefix, ...noStalls });
      const b = new BullMQJobsBackend({ connection, prefix, ...noStalls });
      const started = Promise.withResolvers<void>();
      await a.start({
        processor: () => {
          started.resolve();
          return new Promise<void>(() => {});
        },
      });
      await a.enqueue('settle-stalled', dispatch(job));
      await started.promise;
      await a.shutdown({ timeoutMs: 50 });

      const { settlements, onSettled } = recorder();
      await b.start({ processor: async () => {}, onSettled });
      await waitFor(() => settlements.length === 1, 8000);
      await b.shutdown({ timeoutMs: 1000 });

      assert.deepEqual(settlements, [{ id: 'settle-stalled', status: 'dead' }]);
    });

    it('puts an interrupted job back without using an attempt', async function () {
      // A single attempt: if the interruption used it up, the job would fail
      const backend = makeBackend({ attempts: 1 });
      const { settlements, onSettled } = recorder();
      let runs = 0;
      await backend.start({
        processor: async () => {
          runs += 1;
          return runs === 1 ? 'interrupted' : undefined;
        },
        onSettled,
      });

      await backend.enqueue('settle-interrupted', dispatch(job));
      await waitFor(() => settlements.length === 1);
      await backend.shutdown({ timeoutMs: 1000 });

      assert.equal(runs, 2);
      assert.deepEqual(settlements, [{ id: 'settle-interrupted', status: 'completed' }]);
    });

    it('waits a lock duration before running an interrupted job again', async function () {
      // A worker that is shutting down must stop before the job comes due again
      const backend = makeBackend({ lockDuration: 1000 });
      const runAt: number[] = [];
      await backend.start({
        processor: async () => {
          runAt.push(Date.now());
          return runAt.length === 1 ? 'interrupted' : undefined;
        },
      });

      await backend.enqueue('settle-interrupted-later', dispatch(job));
      await waitFor(() => runAt.length === 2);
      await backend.shutdown({ timeoutMs: 1000 });

      assert.ok(runAt[1]! - runAt[0]! >= 1000, `ran again after ${runAt[1]! - runAt[0]!}ms`);
    });

    it('does not report settlement for a recurring tick', async function () {
      const backend = makeBackend();
      const onSettled = sinon.stub();
      let ticks = 0;
      await backend.start({
        processor: async () => {
          ticks += 1;
        },
        onSettled,
      });

      await backend.scheduleRecurring(dispatch({ type: 'tick', payload: '{}' }), {
        cron: '* * * * * *',
      });
      await waitFor(() => ticks >= 2, 5000);
      await backend.shutdown({ timeoutMs: 1000 });

      sinon.assert.notCalled(onSettled);
    });
  });

  describe('recurring schedules', function () {
    const recurring = (type: string): DispatchEnvelope => dispatch({ type, payload: '{}' });

    it('keeps the stored schedule when a later registration has a different cron', async function () {
      const first = makeBackend();
      const prefix = prefixes[prefixes.length - 1]!;
      const second = new BullMQJobsBackend({ connection, prefix, ...fastConfig });
      await first.start({ processor: async () => {} });
      await second.start({ processor: async () => {} });

      await first.scheduleRecurring(recurring('nightly'), { cron: '0 3 * * *' });
      await first.scheduleRecurring(recurring('nightly'), { cron: '0 4 * * *' });
      await second.scheduleRecurring(recurring('nightly'), { cron: '0 5 * * *' });

      const queue = inspect(prefix);
      const stored = await queue.getJobScheduler('nightly');
      await queue.close();
      await first.shutdown({ timeoutMs: 1000 });
      await second.shutdown({ timeoutMs: 1000 });

      assert.equal(stored?.pattern, '0 3 * * *');
    });

    it('stores the configured timezone', async function () {
      const backend = makeBackend({ timezone: 'Europe/London' });
      await backend.start({ processor: async () => {} });
      await backend.scheduleRecurring(recurring('nightly'), { cron: '0 3 * * *' });

      const queue = inspect(prefixes[prefixes.length - 1]!);
      const stored = await queue.getJobScheduler('nightly');
      await queue.close();
      await backend.shutdown({ timeoutMs: 1000 });

      assert.equal(stored?.tz, 'Europe/London');
    });

    it('defaults the timezone to the process timezone', async function () {
      const backend = makeBackend();
      await backend.start({ processor: async () => {} });
      await backend.scheduleRecurring(recurring('nightly'), { cron: '0 3 * * *' });

      const queue = inspect(prefixes[prefixes.length - 1]!);
      const stored = await queue.getJobScheduler('nightly');
      await queue.close();
      await backend.shutdown({ timeoutMs: 1000 });

      assert.equal(stored?.tz, Intl.DateTimeFormat().resolvedOptions().timeZone);
    });
  });

  describe('retries and retention', function () {
    const retry = { attempts: 3, backoff: { type: 'fixed', delay: 10 } };

    it('retries a rejected delivery up to attempts, then leaves it failed', async function () {
      sinon.stub(logging, 'error');
      const backend = makeBackend(retry);
      let calls = 0;
      await backend.start({
        processor: async () => {
          calls += 1;
          throw new Error('boom');
        },
      });
      await backend.enqueue('retry-1', dispatch(job));

      const queue = inspect(prefixes[prefixes.length - 1]!);
      await waitFor(async () => (await (await queue.getJob('retry-1'))?.getState()) === 'failed');
      const stored = await queue.getJob('retry-1');
      await queue.close();
      await backend.shutdown({ timeoutMs: 1000 });

      assert.equal(calls, 3);
      assert.equal(stored?.attemptsMade, 3);
    });

    it('retries a delivery of an unknown job type through the jobs service', async function () {
      class UnknownJob extends Job {
        static type = 'unknown-job';
      }
      sinon.stub(logging, 'error');
      const backend = makeBackend({ ...retry, attempts: 2 });
      const silent = { error() {}, info() {}, warn() {} };
      const service = new JobsService({ backend, logging: silent });
      await service.start();
      await service.dispatch(new UnknownJob());

      const queue = inspect(prefixes[prefixes.length - 1]!);
      await waitFor(async () => (await queue.getJobCountByTypes('failed')) === 1);
      const [failed] = await queue.getFailed();
      await queue.close();
      await service.shutdown({ timeoutMs: 1000 });

      assert.equal(failed?.attemptsMade, 2);
      assert.match(String(failed?.failedReason), /No handler registered/);
    });

    it('applies the retention config to stored jobs', async function () {
      const backend = makeBackend({
        retention: { completedAgeSeconds: 60, failedAgeSeconds: 120, maxCount: 50 },
      });
      const done = Promise.withResolvers<void>();
      await backend.start({
        processor: async () => done.resolve(),
      });
      await backend.enqueue('keep-1', dispatch(job));
      await done.promise;

      const queue = inspect(prefixes[prefixes.length - 1]!);
      const stored = await queue.getJob('keep-1');
      await queue.close();
      await backend.shutdown({ timeoutMs: 1000 });

      assert.deepEqual(stored?.opts.removeOnComplete, { age: 60, count: 50 });
      assert.deepEqual(stored?.opts.removeOnFail, { age: 120, count: 50 });
    });

    it('applies the default retry and retention options when none are configured', async function () {
      const prefix = newPrefix();
      const backend = new BullMQJobsBackend({ connection, prefix });
      const done = Promise.withResolvers<void>();
      await backend.start({
        processor: async () => done.resolve(),
      });
      await backend.enqueue('defaults-1', dispatch(job));
      await done.promise;

      const queue = inspect(prefix);
      const stored = await queue.getJob('defaults-1');
      await queue.close();
      await backend.shutdown({ timeoutMs: 1000 });

      assert.equal(stored?.opts.attempts, 6);
      assert.deepEqual(stored?.opts.backoff, { type: 'exponential', delay: 20000 });
      assert.deepEqual(stored?.opts.removeOnComplete, { age: 86400, count: 10000 });
      assert.deepEqual(stored?.opts.removeOnFail, { age: 604800, count: 10000 });
    });

    it('gives up an enqueue after enqueueTimeoutMs when Redis is unreachable', async function () {
      const backend = new BullMQJobsBackend({
        connection: { host: '127.0.0.1', port: 1 },
        prefix: newPrefix(),
        enqueueTimeoutMs: 200,
      });
      sinon.stub(logging, 'error');
      await backend.start({ processor: async () => {} });

      const started = Date.now();
      await assert.rejects(backend.enqueue('x', dispatch(job)), {
        message: 'Timed out enqueueing job "test-job": Redis is unavailable.',
      });
      const elapsed = Date.now() - started;
      await backend.shutdown({ timeoutMs: 500 });

      assert.ok(elapsed < 1000, `rejected after ${elapsed}ms`);
    });
  });

  it('fails enqueue fast when Redis is unreachable and still shuts down', async function () {
    const backend = new BullMQJobsBackend({
      connection: { host: '127.0.0.1', port: 1 },
      prefix: newPrefix(),
    });
    sinon.stub(logging, 'error');
    await backend.start({ processor: async () => {} });

    const outcome = await Promise.race([
      backend.enqueue('x', dispatch(job)).then(
        () => 'accepted',
        () => 'rejected',
      ),
      delay(4000).then(() => 'hung'),
    ]);
    assert.equal(outcome, 'rejected');

    await backend.shutdown({ timeoutMs: 500 });
  });

  it('fails a recurring schedule fast when Redis is unreachable', async function () {
    const backend = new BullMQJobsBackend({
      connection: { host: '127.0.0.1', port: 1 },
      prefix: newPrefix(),
    });
    sinon.stub(logging, 'error');
    await backend.start({ processor: async () => {} });

    const outcome = await Promise.race([
      backend.scheduleRecurring(dispatch(job), { cron: '0 3 * * *' }).then(
        () => 'accepted',
        (err: Error) => err.message,
      ),
      delay(4000).then(() => 'hung'),
    ]);
    assert.equal(outcome, 'Timed out scheduling recurring job "test-job": Redis is unavailable.');

    await backend.shutdown({ timeoutMs: 500 });
  });
});
