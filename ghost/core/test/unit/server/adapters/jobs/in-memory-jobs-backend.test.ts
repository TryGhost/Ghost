import assert from 'node:assert/strict';
import type { JobEnvelope } from '@tryghost/adapter-base-jobs';
import { runJobsBackendContractTests } from '@tryghost/adapter-base-jobs/contract-test-suite';
import InMemoryJobsBackend from '../../../../../core/server/adapters/jobs/InMemoryJobsBackend';

const sinon = require('sinon');
const logging = require('@tryghost/logging');

runJobsBackendContractTests(() => new InMemoryJobsBackend(), { describe, it });

describe('InMemoryJobsBackend', function () {
  it('has the required contract methods', function () {
    const backend = new InMemoryJobsBackend();
    assert.deepEqual(backend.requiredFns, ['start', 'enqueue', 'scheduleRecurring', 'shutdown']);
  });

  it('buffers envelopes enqueued before start, then delivers on start', async function () {
    const received: JobEnvelope[] = [];
    const backend = new InMemoryJobsBackend();

    backend.enqueue({ type: 'buffered', payload: '{"n":1}' });

    backend.start({
      processor: async (env) => {
        received.push(env);
      },
    });
    await backend.shutdown({ timeoutMs: 1000 });

    assert.deepEqual(received, [{ type: 'buffered', payload: '{"n":1}' }]);
  });

  it('caps concurrent deliveries at the default concurrency', async function () {
    let running = 0;
    let maxConcurrent = 0;
    const release: Array<() => void> = [];
    const backend = new InMemoryJobsBackend();

    backend.start({
      processor: async () => {
        running = running + 1;
        maxConcurrent = Math.max(maxConcurrent, running);
        await new Promise<void>((resolve) => {
          release.push(resolve);
        });
        running = running - 1;
      },
    });

    for (let i = 0; i < 8; i = i + 1) {
      backend.enqueue({ type: 'work', payload: `{"i":${i}}` });
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });
    assert.equal(maxConcurrent, 3, 'at most 3 deliveries run concurrently');

    release.forEach((resolve) => resolve());
    const drainRelease = setInterval(() => release.forEach((resolve) => resolve()), 5);
    await backend.shutdown({ timeoutMs: 2000 });
    clearInterval(drainRelease);

    assert.ok(maxConcurrent <= 3);
  });

  it('caps concurrent deliveries at the configured concurrency', async function () {
    let running = 0;
    let maxConcurrent = 0;
    const release: Array<() => void> = [];
    const backend = new InMemoryJobsBackend({ concurrency: 2 });

    backend.start({
      processor: async () => {
        running = running + 1;
        maxConcurrent = Math.max(maxConcurrent, running);
        await new Promise<void>((resolve) => {
          release.push(resolve);
        });
        running = running - 1;
      },
    });

    for (let i = 0; i < 8; i = i + 1) {
      backend.enqueue({ type: 'work', payload: `{"i":${i}}` });
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });
    assert.equal(maxConcurrent, 2, 'at most the configured 2 deliveries run concurrently');

    release.forEach((resolve) => resolve());
    const drainRelease = setInterval(() => release.forEach((resolve) => resolve()), 5);
    await backend.shutdown({ timeoutMs: 2000 });
    clearInterval(drainRelease);
  });

  it('rejects an invalid concurrency config instead of silently stalling the pump', function () {
    assert.throws(() => new InMemoryJobsBackend({ concurrency: 0 }), /concurrency/i);
    assert.throws(() => new InMemoryJobsBackend({ concurrency: -1 }), /concurrency/i);
    assert.throws(() => new InMemoryJobsBackend({ concurrency: 1.5 }), /concurrency/i);
    assert.throws(() => new InMemoryJobsBackend({ concurrency: NaN }), /concurrency/i);
    assert.throws(() => new InMemoryJobsBackend({ concurrency: '3' }), /concurrency/i);
  });

  it('falls back to the default when no concurrency is configured', function () {
    assert.doesNotThrow(() => new InMemoryJobsBackend());
    assert.doesNotThrow(() => new InMemoryJobsBackend({}));
  });

  it('logs a rejected delivery with its job type and keeps delivering subsequent work', async function () {
    const errorStub = sinon.stub(logging, 'error');
    try {
      const delivered: string[] = [];
      const backend = new InMemoryJobsBackend({ concurrency: 1 });

      backend.start({
        processor: async (env) => {
          delivered.push(env.type);
          if (env.type === 'boom') {
            throw new Error('delivery failed');
          }
        },
      });

      backend.enqueue({ type: 'boom', payload: '{}' });
      backend.enqueue({ type: 'next', payload: '{}' });

      await new Promise((resolve) => {
        setTimeout(resolve, 20);
      });
      await backend.shutdown({ timeoutMs: 1000 });

      assert.deepEqual(delivered, ['boom', 'next'], 'a rejected delivery does not stall the queue');
      assert.ok(errorStub.calledOnce, 'the rejected delivery is logged');
      assert.match(String(errorStub.firstCall.args[0]), /boom/);
    } finally {
      errorStub.restore();
    }
  });

  it('drops queued-but-unstarted deliveries on shutdown', async function () {
    const received: string[] = [];
    const backend = new InMemoryJobsBackend();
    const gate: Array<() => void> = [];

    backend.start({
      processor: async (env) => {
        received.push(env.type);
        await new Promise<void>((resolve) => {
          gate.push(resolve);
        });
      },
    });

    for (let i = 0; i < 6; i = i + 1) {
      backend.enqueue({ type: `job-${i}`, payload: '{}' });
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });

    gate.forEach((resolve) => resolve());
    const releaser = setInterval(() => gate.forEach((resolve) => resolve()), 5);
    await backend.shutdown({ timeoutMs: 2000 });
    clearInterval(releaser);

    assert.equal(received.length, 3, `only in-flight deliveries ran, got ${received.join(',')}`);
  });

  it('drops work enqueued after shutdown (no replay on the next start)', async function () {
    const received: string[] = [];
    const backend = new InMemoryJobsBackend();

    backend.start({
      processor: async (env) => {
        received.push(env.type);
      },
    });
    await backend.shutdown({ timeoutMs: 1000 });

    backend.enqueue({ type: 'late', payload: '{}' });

    backend.start({
      processor: async (env) => {
        received.push(env.type);
      },
    });
    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });
    await backend.shutdown({ timeoutMs: 1000 });

    assert.deepEqual(received, [], 'the post-shutdown enqueue was neither delivered nor replayed');
  });

  it('releases abandoned in-flight slots after a timed-out drain so a re-boot can start work', async function () {
    const backend = new InMemoryJobsBackend();

    backend.start({ processor: () => new Promise<void>(() => {}) });
    for (let i = 0; i < 3; i = i + 1) {
      backend.enqueue({ type: `hung-${i}`, payload: '{}' });
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });

    await backend.shutdown({ timeoutMs: 30 });

    const received: string[] = [];
    backend.start({
      processor: async (env) => {
        received.push(env.type);
      },
    });
    backend.enqueue({ type: 'fresh', payload: '{}' });
    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });
    await backend.shutdown({ timeoutMs: 1000 });

    assert.deepEqual(received, ['fresh'], 'a re-boot starts new work despite prior hung handlers');
  });

  describe('recurring schedules', function () {
    let clock: { tickAsync(ms: number): Promise<void>; restore(): void } | undefined;

    afterEach(function () {
      if (clock) {
        clock.restore();
        clock = undefined;
      }
    });

    it('fires the processor on each cron tick', async function () {
      clock = sinon.useFakeTimers({ now: Date.UTC(2020, 0, 1) });
      const received: JobEnvelope[] = [];
      const backend = new InMemoryJobsBackend();
      backend.start({
        processor: async (env) => {
          received.push(env);
        },
      });

      backend.scheduleRecurring({ type: 'tick', payload: '{}' }, { cron: '*/1 * * * * *' });
      await clock!.tickAsync(3000);

      assert.ok(received.length >= 2, `expected at least 2 ticks, got ${received.length}`);
      assert.equal(received[0].type, 'tick');
    });

    it('keeps the first schedule for a type and ignores re-registration', async function () {
      clock = sinon.useFakeTimers({ now: Date.UTC(2020, 0, 1) });
      const received: string[] = [];
      const backend = new InMemoryJobsBackend();
      backend.start({
        processor: async (env) => {
          received.push(env.payload);
        },
      });

      backend.scheduleRecurring({ type: 'tick', payload: '"first"' }, { cron: '*/1 * * * * *' });
      backend.scheduleRecurring({ type: 'tick', payload: '"second"' }, { cron: '*/1 * * * * *' });

      await clock!.tickAsync(2000);

      assert.ok(received.length >= 1);
      assert.ok(
        received.every((p) => p === '"first"'),
        `a re-registration must not replace the running schedule, got ${received.join(',')}`,
      );
    });

    it('schedules a day-of-week cron on the correct day (0 = Sunday)', async function () {
      clock = sinon.useFakeTimers({ now: Date.UTC(2026, 7, 17) });
      const fireDays: number[] = [];
      const backend = new InMemoryJobsBackend();
      backend.start({
        processor: async () => {
          fireDays.push(new Date().getUTCDay());
        },
      });

      backend.scheduleRecurring({ type: 'weekly', payload: '{}' }, { cron: '0 0 * * 0' });
      await clock!.tickAsync(14 * 24 * 60 * 60 * 1000);
      await backend.shutdown({ timeoutMs: 100 });

      assert.ok(fireDays.length >= 1, `expected at least one fire, got ${fireDays.length}`);
      assert.ok(
        fireDays.every((day) => day === 0),
        `weekly Sunday cron must only fire on Sundays, got ${fireDays.join(',')}`,
      );
    });

    it('stops firing after shutdown', async function () {
      clock = sinon.useFakeTimers({ now: Date.UTC(2020, 0, 1) });
      const received: JobEnvelope[] = [];
      const backend = new InMemoryJobsBackend();
      backend.start({
        processor: async (env) => {
          received.push(env);
        },
      });

      backend.scheduleRecurring({ type: 'tick', payload: '{}' }, { cron: '*/1 * * * * *' });
      await clock!.tickAsync(1500);
      await backend.shutdown({ timeoutMs: 100 });
      const countAtShutdown = received.length;

      await clock!.tickAsync(3000);
      assert.equal(received.length, countAtShutdown, 'no ticks should fire after shutdown');
    });

    it('does not install a recurring schedule after shutdown (no reactivation on re-boot)', async function () {
      clock = sinon.useFakeTimers({ now: Date.UTC(2020, 0, 1) });
      const received: JobEnvelope[] = [];
      const backend = new InMemoryJobsBackend();
      backend.start({
        processor: async (env) => {
          received.push(env);
        },
      });
      await backend.shutdown({ timeoutMs: 100 });

      backend.scheduleRecurring({ type: 'tick', payload: '{}' }, { cron: '*/1 * * * * *' });

      backend.start({
        processor: async (env) => {
          received.push(env);
        },
      });
      await clock!.tickAsync(3000);

      assert.deepEqual(
        received,
        [],
        'a schedule installed after shutdown must never fire, even after re-start',
      );
    });
  });
});
