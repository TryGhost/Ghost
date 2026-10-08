import assert from 'node:assert/strict';
import type { JobEnvelope, DispatchEnvelope } from '@tryghost/adapter-base-jobs';
import { runJobsBackendContractTests } from '@tryghost/adapter-base-jobs/contract-test-suite';
import InMemoryJobsBackend from '../../../../../core/server/adapters/jobs/InMemoryJobsBackend';

const sinon = require('sinon');
const logging = require('@tryghost/logging');
const later = require('@breejs/later');

// Wraps a deliverable job (and its optional lane) in the dispatch envelope the
// backend now receives, so these tests read as "enqueue this job on this lane".
function dispatch(job: JobEnvelope, queue?: string): DispatchEnvelope {
  const payload = queue === undefined ? { job } : { job, routing: { queue } };
  // JobEnvelope is a named type without a string index signature, so crossing
  // it into the envelope's opaque JSON payload needs an assertion.
  return { version: 1, payload: payload as unknown as DispatchEnvelope['payload'] };
}

runJobsBackendContractTests(() => new InMemoryJobsBackend(), { describe, it });

describe('InMemoryJobsBackend', function () {
  it('has the required contract methods', function () {
    const backend = new InMemoryJobsBackend();
    assert.deepEqual(backend.requiredFns, ['start', 'enqueue', 'scheduleRecurring', 'shutdown']);
  });

  // Boot starts the jobs service before the web app is mounted or any
  // recurring job is scheduled, so a pre-start enqueue or schedule is a
  // boot-ordering bug.
  it('throws on an enqueue before start instead of silently losing the job', function () {
    const backend = new InMemoryJobsBackend();
    assert.throws(
      () => backend.enqueue('d1', dispatch({ type: 'early', payload: '{}' })),
      /before the jobs backend is started/,
    );
  });

  // A silently accepted pre-start schedule would throw from enqueue inside
  // the timer callback later - an uncaughtException - so it must fail at the
  // registration site instead.
  it('throws on a recurring schedule before start instead of arming a delayed crash', function () {
    const backend = new InMemoryJobsBackend();
    assert.throws(
      () =>
        backend.scheduleRecurring(dispatch({ type: 'early', payload: '{}' }), {
          cron: '0 0 3 * * *',
        }),
      /before the jobs backend is started/,
    );
  });

  it('rejects an invalid declared queue concurrency at start instead of silently ignoring it', function () {
    const backend = new InMemoryJobsBackend();
    const processor = async () => {};
    assert.throws(
      () => backend.start({ processor, queues: { slow: { concurrency: 0 } } }),
      /declared queue "slow"/,
    );
    assert.throws(
      () => backend.start({ processor, queues: { slow: { concurrency: NaN } } }),
      /declared queue "slow"/,
    );
  });

  it('stays un-started when start rejects a declaration, so no work is accepted', function () {
    const backend = new InMemoryJobsBackend();
    assert.throws(() =>
      backend.start({
        processor: async () => {},
        queues: { ok: { concurrency: 1 }, bad: { concurrency: 0 } },
      }),
    );
    assert.throws(
      () => backend.enqueue('d1', dispatch({ type: 'early', payload: '{}' })),
      /before the jobs backend is started/,
    );
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
      backend.enqueue(`d${i}`, dispatch({ type: 'work', payload: `{"i":${i}}` }));
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
      backend.enqueue(`d${i}`, dispatch({ type: 'work', payload: `{"i":${i}}` }));
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

      backend.enqueue('d1', dispatch({ type: 'boom', payload: '{}' }));
      backend.enqueue('d2', dispatch({ type: 'next', payload: '{}' }));

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
      backend.enqueue(`d${i}`, dispatch({ type: `job-${i}`, payload: '{}' }));
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

    backend.enqueue('d1', dispatch({ type: 'late', payload: '{}' }));

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
      backend.enqueue(`d${i}`, dispatch({ type: `hung-${i}`, payload: '{}' }));
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
    backend.enqueue('fresh', dispatch({ type: 'fresh', payload: '{}' }));
    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });
    await backend.shutdown({ timeoutMs: 1000 });

    assert.deepEqual(received, ['fresh'], 'a re-boot starts new work despite prior hung handlers');
  });

  describe('shutdown deadline', function () {
    let clock: ReturnType<typeof sinon.useFakeTimers> | undefined;

    afterEach(function () {
      clock?.restore();
      clock = undefined;
    });

    it('waits 10 seconds for active deliveries when no timeout is given', async function () {
      clock = sinon.useFakeTimers();
      const backend = new InMemoryJobsBackend();
      backend.start({ processor: () => new Promise<void>(() => {}) });
      backend.enqueue('d1', dispatch({ type: 'hung', payload: '{}' }));

      let finished = false;
      const stopping = backend.shutdown().then(() => {
        finished = true;
      });
      await clock.tickAsync(9999);
      assert.equal(finished, false);

      await clock.tickAsync(1);
      await stopping;
      assert.equal(finished, true);
    });

    it('does not cancel an active delivery when the deadline passes', async function () {
      clock = sinon.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      const backend = new InMemoryJobsBackend();
      const release = Promise.withResolvers<void>();
      const completed = Promise.withResolvers<void>();
      let deliveryFinished = false;
      backend.start({
        processor: async () => {
          await release.promise;
          deliveryFinished = true;
          completed.resolve();
        },
      });
      backend.enqueue('d1', dispatch({ type: 'slow', payload: '{}' }));

      const stopping = backend.shutdown({ timeoutMs: 10 });
      await clock.tickAsync(10);
      await stopping;
      assert.equal(deliveryFinished, false);

      release.resolve();
      await completed.promise;
      assert.equal(deliveryFinished, true, 'the delivery kept running after shutdown returned');
    });

    it('leaves its deadline timer pending when deliveries drain early', async function () {
      // Only the deadline is faked; the queue's own drain scheduling stays real.
      clock = sinon.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      const backend = new InMemoryJobsBackend();
      const release = Promise.withResolvers<void>();
      backend.start({ processor: () => release.promise });
      backend.enqueue('d1', dispatch({ type: 'quick', payload: '{}' }));

      const stopping = backend.shutdown({ timeoutMs: 5000 });
      release.resolve();
      await stopping;
      assert.equal(clock.countTimers(), 1, 'the unused deadline timer is still scheduled');

      await clock.tickAsync(5000);
      assert.equal(clock.countTimers(), 0);
    });
  });

  describe('queue routing', function () {
    // Tracks per-lane concurrency by tagging each envelope with its lane.
    function makeLaneTracker() {
      const running = new Map<string, number>();
      const max = new Map<string, number>();
      const release: Array<() => void> = [];
      const processor = async (env: JobEnvelope) => {
        const lane = JSON.parse(env.payload).lane as string;
        running.set(lane, (running.get(lane) ?? 0) + 1);
        max.set(lane, Math.max(max.get(lane) ?? 0, running.get(lane)!));
        await new Promise<void>((resolve) => {
          release.push(resolve);
        });
        running.set(lane, running.get(lane)! - 1);
      };
      return { max, release, processor };
    }

    async function drainAndShutdown(
      backend: InMemoryJobsBackend,
      release: Array<() => void>,
    ): Promise<void> {
      release.forEach((resolve) => resolve());
      const releaser = setInterval(() => release.forEach((resolve) => resolve()), 5);
      await backend.shutdown({ timeoutMs: 2000 });
      clearInterval(releaser);
    }

    it('runs a declared queue at its own concurrency without occupying the default lane', async function () {
      const { max, release, processor } = makeLaneTracker();
      const backend = new InMemoryJobsBackend();

      backend.start({ processor, queues: { webmentions: { concurrency: 1 } } });

      for (let i = 0; i < 4; i = i + 1) {
        backend.enqueue(
          `w${i}`,
          dispatch({ type: 'webmention', payload: '{"lane":"webmentions"}' }, 'webmentions'),
        );
        backend.enqueue(`d${i}`, dispatch({ type: 'work', payload: '{"lane":"default"}' }));
      }
      await new Promise((resolve) => {
        setTimeout(resolve, 20);
      });

      assert.equal(max.get('webmentions'), 1, 'the declared queue runs serially');
      assert.equal(max.get('default'), 3, 'a busy declared queue does not occupy default workers');

      await drainAndShutdown(backend, release);
    });

    it('drains in-flight work on every lane at shutdown', async function () {
      const completed: string[] = [];
      const backend = new InMemoryJobsBackend();

      backend.start({
        processor: async (env) => {
          await new Promise((resolve) => {
            setTimeout(resolve, 20);
          });
          completed.push(env.type);
        },
        queues: { webmentions: { concurrency: 1 } },
      });

      backend.enqueue('w1', dispatch({ type: 'webmention', payload: '{}' }, 'webmentions'));
      backend.enqueue('d1', dispatch({ type: 'work', payload: '{}' }));
      await new Promise((resolve) => {
        setTimeout(resolve, 5);
      });
      await backend.shutdown({ timeoutMs: 2000 });

      assert.deepEqual(completed.sort(), ['webmention', 'work']);
    });
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

      backend.scheduleRecurring(dispatch({ type: 'tick', payload: '{}' }), {
        cron: '*/1 * * * * *',
      });
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

      backend.scheduleRecurring(dispatch({ type: 'tick', payload: '"first"' }), {
        cron: '*/1 * * * * *',
      });
      backend.scheduleRecurring(dispatch({ type: 'tick', payload: '"second"' }), {
        cron: '*/1 * * * * *',
      });

      await clock!.tickAsync(2000);

      assert.ok(received.length >= 1);
      assert.ok(
        received.every((p) => p === '"first"'),
        `a re-registration must not replace the running schedule, got ${received.join(',')}`,
      );
    });

    it('logs a tick whose enqueue throws and keeps the schedule running', async function () {
      clock = sinon.useFakeTimers({ now: Date.UTC(2020, 0, 1) });
      const errorStub = sinon.stub(logging, 'error');
      try {
        const backend = new InMemoryJobsBackend();
        backend.start({ processor: async () => {} });
        const failure = new Error('enqueue failed');
        // The recurring tick pushes the unwrapped job straight onto its lane;
        // make that push throw to exercise the tick's error guard.
        const push = sinon.stub(backend as never, '_pushToLane').throws(failure);

        backend.scheduleRecurring(dispatch({ type: 'tick', payload: '{}' }), {
          cron: '*/1 * * * * *',
        });
        await clock!.tickAsync(2500);

        assert.ok(push.callCount >= 2, `expected repeated ticks, got ${push.callCount}`);
        assert.equal(errorStub.callCount, push.callCount);
        assert.match(
          String(errorStub.firstCall.args[0]),
          /Recurring job "tick" tick failed to enqueue/,
        );
        assert.equal(errorStub.firstCall.args[1], failure);
        await backend.shutdown({ timeoutMs: 100 });
      } finally {
        errorStub.restore();
      }
    });

    it('reads cron schedules in the server local time', function () {
      assert.equal(later.date.isUTC, false);
    });

    it('schedules a day-of-week cron on the correct day (0 = Sunday)', async function () {
      clock = sinon.useFakeTimers({ now: Date.UTC(2026, 7, 17) });
      const fireDays: number[] = [];
      const backend = new InMemoryJobsBackend();
      backend.start({
        processor: async () => {
          // The backend reads schedules in local time, so that is the calendar
          // the weekday is asserted in.
          fireDays.push(new Date().getDay());
        },
      });

      backend.scheduleRecurring(dispatch({ type: 'weekly', payload: '{}' }), { cron: '0 0 * * 0' });
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

      backend.scheduleRecurring(dispatch({ type: 'tick', payload: '{}' }), {
        cron: '*/1 * * * * *',
      });
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

      backend.scheduleRecurring(dispatch({ type: 'tick', payload: '{}' }), {
        cron: '*/1 * * * * *',
      });

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
