import assert from 'node:assert/strict';
import { JobsBackendBase, JobEnvelope, DispatchEnvelope } from './base.ts';

export type BackendFactory = () => JobsBackendBase;

export interface JobsContractTestFramework {
  describe(name: string, fn: () => void): void;
  it(name: string, fn: () => void | Promise<void>): void;
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function deferred<T = void>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function runJobsBackendContractTests(
  makeBackend: BackendFactory,
  { describe, it }: JobsContractTestFramework,
): void {
  // The job as it is delivered to the processor, and the dispatch envelope that
  // carries it. `payload.job` is exactly the JobEnvelope the processor receives.
  // JobEnvelope is a named type without an index signature, so crossing it into
  // the envelope's opaque JSON payload needs an assertion.
  function pack(jobEnvelope: JobEnvelope, queue?: string): DispatchEnvelope {
    const payload =
      queue === undefined ? { job: jobEnvelope } : { job: jobEnvelope, routing: { queue } };
    return { version: 1, payload: payload as unknown as DispatchEnvelope['payload'] };
  }

  const job: JobEnvelope = { type: 'test-job', payload: '{"value":1}' };
  const envelope: DispatchEnvelope = pack(job);

  function routed(queue: string): DispatchEnvelope {
    return pack(job, queue);
  }

  describe('jobs backend contract', function () {
    it('delivers an enqueued envelope to the processor', async function () {
      const received: JobEnvelope[] = [];
      const backend = makeBackend();
      await backend.start({
        processor: async (env) => {
          received.push(env);
        },
      });

      await backend.enqueue('dispatch-1', envelope);
      await backend.shutdown({ timeoutMs: 1000 });

      assert.deepEqual(received, [job]);
    });

    it('resolves enqueue on acceptance, not on completion', async function () {
      let completed = false;
      const release = deferred();
      const started = deferred();

      const backend = makeBackend();
      await backend.start({
        processor: async () => {
          started.resolve();
          await release.promise;
          completed = true;
        },
      });

      await backend.enqueue('dispatch-1', envelope);

      await started.promise;
      assert.equal(completed, false);

      release.resolve();
      await backend.shutdown({ timeoutMs: 1000 });
      assert.equal(completed, true);
    });

    it('drains in-flight work on shutdown', async function () {
      let completed = false;
      const backend = makeBackend();
      await backend.start({
        processor: async () => {
          await delay(30);
          completed = true;
        },
      });

      await backend.enqueue('dispatch-1', envelope);
      await backend.shutdown({ timeoutMs: 1000 });

      assert.equal(completed, true);
    });

    it('bounds shutdown when a handler hangs', async function () {
      const backend = makeBackend();
      const started = deferred();
      await backend.start({
        processor: () =>
          new Promise<void>(() => {
            started.resolve();
          }),
      });

      await backend.enqueue('dispatch-1', envelope);
      await started.promise;

      const raced = await Promise.race([
        Promise.resolve(backend.shutdown({ timeoutMs: 30 })).then(() => 'shutdown'),
        delay(2000).then(() => 'hung'),
      ]);

      assert.equal(raced, 'shutdown');
    });

    // Queue routing is metadata carried in the envelope: a backend may isolate
    // queues or run one lane, but a routed envelope must always be delivered,
    // and unknown routing must never lose work.
    it('delivers an envelope enqueued with queue routing', async function () {
      const received: JobEnvelope[] = [];
      const backend = makeBackend();
      await backend.start({
        processor: async (env) => {
          received.push(env);
        },
        queues: { isolated: { concurrency: 1 } },
      });

      await backend.enqueue('dispatch-1', routed('isolated'));
      await backend.shutdown({ timeoutMs: 1000 });

      assert.deepEqual(received, [job]);
    });

    it('delivers an envelope routed to a queue no handler declared', async function () {
      const received: JobEnvelope[] = [];
      const backend = makeBackend();
      await backend.start({
        processor: async (env) => {
          received.push(env);
        },
      });

      await backend.enqueue('dispatch-1', routed('undeclared'));
      await backend.shutdown({ timeoutMs: 1000 });

      assert.deepEqual(received, [job]);
    });

    it('tolerates start after a prior shutdown', async function () {
      const received: JobEnvelope[] = [];
      const backend = makeBackend();

      await backend.start({ processor: async () => {} });
      await backend.shutdown({ timeoutMs: 1000 });

      await backend.start({
        processor: async (env) => {
          received.push(env);
        },
      });
      await backend.enqueue('dispatch-1', envelope);
      await backend.shutdown({ timeoutMs: 1000 });

      assert.deepEqual(received, [job]);
    });

    it('delivers the unwrapped job on each recurring tick', async function () {
      const received: JobEnvelope[] = [];
      const backend = makeBackend();
      await backend.start({
        processor: async (env) => {
          received.push(env);
        },
      });

      // Every second, so the test observes at least one real tick quickly.
      await backend.scheduleRecurring(envelope, { cron: '*/1 * * * * *' });
      const deadline = Date.now() + 2500;
      while (received.length === 0 && Date.now() < deadline) {
        await delay(50);
      }
      await backend.shutdown({ timeoutMs: 1000 });

      assert.ok(received.length >= 1, 'the recurring schedule fired at least once');
      assert.deepEqual(received[0], job);
    });

    it('keeps the first recurring schedule for a job type', async function () {
      const received: JobEnvelope[] = [];
      const backend = makeBackend();
      await backend.start({
        processor: async (env) => {
          received.push(env);
        },
      });

      const first: DispatchEnvelope = {
        version: 1,
        payload: { job: { type: 'recurring-job', payload: '"first"' } },
      };
      const second: DispatchEnvelope = {
        version: 1,
        payload: { job: { type: 'recurring-job', payload: '"second"' } },
      };
      await backend.scheduleRecurring(first, { cron: '*/1 * * * * *' });
      await backend.scheduleRecurring(second, { cron: '*/1 * * * * *' });

      const deadline = Date.now() + 2500;
      while (received.length === 0 && Date.now() < deadline) {
        await delay(50);
      }
      await backend.shutdown({ timeoutMs: 1000 });

      assert.ok(received.length >= 1, 'the recurring schedule fired at least once');
      assert.ok(
        received.every((env) => env.payload === '"first"'),
        're-registering a type must not replace the running schedule',
      );
    });
  });
}
