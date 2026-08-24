import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'vitest';
import type {
  JobsBackendBase,
  JobEnvelope,
  JobsStartOptions,
  JobProcessor,
  RecurringSchedule,
  JobsShutdownOptions,
} from '@tryghost/adapter-base-jobs';
import {
  JobsService,
  JobsLogger,
  JobsErrorReporter,
} from '../../../../../core/server/services/jobs-service/jobs-service';
import { Job } from '../../../../../core/server/services/jobs-service/job';

class FakeBackend implements JobsBackendBase {
  readonly requiredFns = ['start', 'enqueue', 'scheduleRecurring', 'shutdown'] as const;
  processor: JobProcessor | null = null;
  enqueued: JobEnvelope[] = [];
  recurring: { envelope: JobEnvelope; schedule: RecurringSchedule }[] = [];
  shutdownCalls: (JobsShutdownOptions | undefined)[] = [];

  start(options: JobsStartOptions): void {
    this.processor = options.processor;
  }

  enqueue(envelope: JobEnvelope): void {
    this.enqueued.push(envelope);
  }

  scheduleRecurring(envelope: JobEnvelope, schedule: RecurringSchedule): void {
    this.recurring.push({ envelope, schedule });
  }

  shutdown(options?: JobsShutdownOptions): void {
    this.shutdownCalls.push(options);
  }

  async deliver(index = 0): Promise<void> {
    assert.ok(this.processor, 'processor must be wired via start()');
    await this.processor!(this.enqueued[index]!);
  }
}

function makeLogger() {
  const calls = { error: [] as unknown[][], info: [] as unknown[][], warn: [] as unknown[][] };
  const logging: JobsLogger = {
    error: (...args) => {
      calls.error.push(args);
    },
    info: (...args) => {
      calls.info.push(args);
    },
    warn: (...args) => {
      calls.warn.push(args);
    },
  };
  return { logging, calls };
}

function makeSentry() {
  const captured: { err: unknown; context?: unknown }[] = [];
  const sentry: JobsErrorReporter = {
    captureException: (err, context) => captured.push({ err, context }),
  };
  return { sentry, captured };
}

class GreetJob extends Job {
  static type = 'greet';
  name: string;
  constructor(data: { name: string }) {
    super();
    this.name = data.name;
  }
}

describe('JobsService', function () {
  let backend: FakeBackend;
  let logger: ReturnType<typeof makeLogger>;

  beforeEach(function () {
    backend = new FakeBackend();
    logger = makeLogger();
  });

  function makeService(overrides: { sentry?: JobsErrorReporter } = {}) {
    return new JobsService({
      backend,
      logging: logger.logging,
      sentry: overrides.sentry,
    });
  }

  describe('handle', function () {
    it('throws when the job class has no static type', function () {
      const service = makeService();
      class Untyped extends Job {}
      assert.throws(
        () => service.handle(Untyped as never, async () => {}),
        /missing a static "type"/,
      );
    });

    it('throws on a duplicate type registration', function () {
      const service = makeService();
      service.handle(GreetJob, async () => {});
      assert.throws(() => service.handle(GreetJob, async () => {}), /already registered/);
    });
  });

  describe('dispatch', function () {
    it('enqueues a {type, payload} envelope, not the live instance', async function () {
      const service = makeService();
      await service.dispatch(new GreetJob({ name: 'Ada' }));

      assert.equal(backend.enqueued.length, 1);
      const envelope = backend.enqueued[0]!;
      assert.equal(envelope.type, 'greet');
      assert.equal(typeof envelope.payload, 'string');
      assert.deepEqual(JSON.parse(envelope.payload), { name: 'Ada' });
    });

    it('delivers a rehydrated instance to the handler, never the dispatched object', async function () {
      const service = makeService();
      const dispatched = new GreetJob({ name: 'Ada' });
      let received: unknown = null;
      service.handle(GreetJob, async (job) => {
        received = job;
      });
      await service.start();

      await service.dispatch(dispatched);
      await backend.deliver();

      assert.ok(received instanceof GreetJob, 'handler receives a real GreetJob instance');
      assert.notEqual(received, dispatched, 'handler must not receive the dispatched object');
      assert.equal(received.name, 'Ada');
    });

    it('throws when dispatching a job with no static type', async function () {
      const service = makeService();
      class Untyped extends Job {}
      await assert.rejects(() => service.dispatch(new Untyped()), /missing a static "type"/);
    });
  });

  describe('delivery error handling', function () {
    it('captures handler errors with job context and rethrows so the backend sees a failed delivery', async function () {
      const { sentry, captured } = makeSentry();
      const service = makeService({ sentry });
      const boom = new Error('handler exploded');
      service.handle(GreetJob, async () => {
        throw boom;
      });
      await service.start();

      await service.dispatch(new GreetJob({ name: 'Ada' }));
      await assert.rejects(() => backend.deliver(), /handler exploded/);

      assert.equal(captured.length, 1);
      assert.equal(captured[0]!.err, boom);
      assert.deepEqual(captured[0]!.context, { tags: { job_type: 'greet' } });
      assert.equal(logger.calls.error.length, 1);
      assert.equal(logger.calls.error[0]![0], boom);
      assert.match(
        String(logger.calls.error[0]![1]),
        /^\[Background Job\] greet failed after \d+ms$/,
      );
    });

    it('logs and drops delivery for an unknown job type', async function () {
      const service = makeService();
      await service.start();
      await service.dispatch(new GreetJob({ name: 'Ada' }));
      await backend.deliver();

      assert.equal(logger.calls.error.length, 1);
      assert.match(String(logger.calls.error[0]![0]), /No handler registered for job type "greet"/);
    });
  });

  describe('lifecycle logging', function () {
    it('logs started and a structured completed event around a successful delivery', async function () {
      const service = makeService();
      service.handle(GreetJob, async () => {});
      await service.start();

      await service.dispatch(new GreetJob({ name: 'Ada' }));
      await backend.deliver();

      assert.equal(logger.calls.info.length, 2);
      assert.equal(logger.calls.info[0]![0], '[Background Job] greet started');

      const [event, message] = logger.calls.info[1]! as [
        { system: { event: string; job_type: string; duration_ms: number } },
        string,
      ];
      assert.equal(event.system.event, 'job.completed');
      assert.equal(event.system.job_type, 'greet');
      assert.equal(typeof event.system.duration_ms, 'number');
      assert.match(String(message), /^\[Background Job\] greet completed in \d+ms$/);
    });

    it('does not log a completed event for a failed delivery', async function () {
      const service = makeService();
      service.handle(GreetJob, async () => {
        throw new Error('handler exploded');
      });
      await service.start();

      await service.dispatch(new GreetJob({ name: 'Ada' }));
      await assert.rejects(() => backend.deliver(), /handler exploded/);

      assert.equal(logger.calls.info.length, 1, 'only the started line is logged');
      assert.equal(logger.calls.error.length, 1);
    });

    it('still runs the handler when the logger throws', async function () {
      const service = new JobsService({
        backend,
        logging: {
          info: () => {
            throw new Error('logger unavailable');
          },
          error: () => {
            throw new Error('logger unavailable');
          },
          warn: () => {
            throw new Error('logger unavailable');
          },
        },
      });
      let handled = false;
      service.handle(GreetJob, async () => {
        handled = true;
      });
      await service.start();

      await service.dispatch(new GreetJob({ name: 'Ada' }));
      await backend.deliver();

      assert.ok(handled, 'a broken logger must not decide whether a job runs');
    });
  });

  describe('scheduleRecurring', function () {
    it('hands the backend an envelope and schedule', async function () {
      const service = makeService();
      await service.scheduleRecurring(new GreetJob({ name: 'cron' }), { cron: '0 0 3 * * *' });

      assert.equal(backend.recurring.length, 1);
      assert.equal(backend.recurring[0]!.envelope.type, 'greet');
      assert.equal(backend.recurring[0]!.schedule.cron, '0 0 3 * * *');
    });

    it('rejects an invalid cron before touching the backend', async function () {
      const service = makeService();
      await assert.rejects(
        () => service.scheduleRecurring(new GreetJob({ name: 'cron' }), { cron: 'not-a-cron' }),
        /Invalid cron expression/,
      );
      assert.equal(backend.recurring.length, 0);
    });
  });

  describe('shutdown', function () {
    it('delegates to the backend with the given options', async function () {
      const service = makeService();
      await service.shutdown({ timeoutMs: 42 });
      assert.deepEqual(backend.shutdownCalls, [{ timeoutMs: 42 }]);
    });
  });
});
