import errors from '@tryghost/errors';
import cronValidate from 'cron-validate';
import type {
  JobsBackendBase,
  JobEnvelope,
  JobRouting,
  JobsShutdownOptions,
  QueueDeclaration,
  RecurringSchedule,
} from '@tryghost/adapter-base-jobs';
import { Job, JobConstructor, JobHandler } from './job';

export interface JobsLogger {
  error(...args: unknown[]): void;
  info(...args: unknown[]): void;
}

export interface JobsErrorReporter {
  captureException(err: unknown, captureContext?: { tags?: Record<string, string> }): void;
}

export interface JobsServiceOptions {
  backend: JobsBackendBase;
  logging: JobsLogger;
  sentry?: JobsErrorReporter;
}

type Deliverer = (payload: string) => Promise<void> | void;

// Execution policy for a job type, declared where its handler is registered:
// either no options (the type runs on the backend's shared default lane) or a
// queue name and concurrency together. The queue is routing metadata only -
// delivery always routes by job type - and concurrency is a queue-level
// declaration the backend enforces as strictly as it can (per process
// in-memory, globally where a durable backend supports it). A tunable value
// can be resolved from config at the registration site before declaring it
// here.
export interface JobHandlingOptions {
  /** Named lane; types declaring the same name and concurrency share it. */
  queue: string;
  /** Max concurrent deliveries for the queue. */
  concurrency: number;
}

export class JobsService {
  readonly #backend: JobsBackendBase;
  readonly #logging: JobsLogger;
  readonly #sentry?: JobsErrorReporter;
  readonly #registry = new Map<string, Deliverer>();
  readonly #queueByType = new Map<string, string>();
  readonly #queues = new Map<string, QueueDeclaration>();

  constructor({ backend, logging, sentry }: JobsServiceOptions) {
    this.#backend = backend;
    this.#logging = logging;
    this.#sentry = sentry;
  }

  handle<T extends Job, D>(
    JobClass: JobConstructor<T, D>,
    handler: JobHandler<T>,
    options?: JobHandlingOptions,
  ): void {
    const type = JobClass.type;
    if (typeof type !== 'string' || type.length === 0) {
      throw new errors.IncorrectUsageError({
        message: `Cannot register a job handler: ${JobClass.name ?? 'job class'} is missing a static "type" string.`,
      });
    }
    if (this.#registry.has(type)) {
      throw new errors.IncorrectUsageError({
        message: `A handler for job type "${type}" is already registered.`,
      });
    }
    this.#declareQueue(type, options);
    this.#registry.set(type, (payload) => handler(new JobClass(JSON.parse(payload))));
  }

  #declareQueue(type: string, options?: JobHandlingOptions): void {
    if (!options) {
      return;
    }
    const { queue, concurrency } = options;
    if (typeof queue !== 'string' || queue.length === 0) {
      throw new errors.IncorrectUsageError({
        message: `Invalid queue for job type "${type}": ${JSON.stringify(queue)}. Expected a non-empty string.`,
      });
    }
    // "default" is the backend's shared lane for types that declare no queue;
    // declaring it would silently re-size that lane for every unrouted type.
    if (queue === 'default') {
      throw new errors.IncorrectUsageError({
        message: `Queue name "default" is reserved for the shared lane; job type "${type}" must omit options to use it.`,
      });
    }
    if (!Number.isInteger(concurrency) || concurrency < 1) {
      throw new errors.IncorrectUsageError({
        message: `Invalid concurrency for job type "${type}": ${JSON.stringify(concurrency)}. Expected a positive integer.`,
      });
    }

    const existing = this.#queues.get(queue);
    if (existing && existing.concurrency !== concurrency) {
      throw new errors.IncorrectUsageError({
        message: `Conflicting concurrency for queue "${queue}": ${existing.concurrency} is already declared, job type "${type}" declares ${concurrency}.`,
      });
    }
    this.#queues.set(queue, { concurrency });
    this.#queueByType.set(type, queue);
  }

  #routingFor(type: string): JobRouting | undefined {
    const queue = this.#queueByType.get(type);
    return queue === undefined ? undefined : { queue };
  }

  async dispatch(job: Job): Promise<void> {
    const envelope = this.#buildEnvelope(job);
    await this.#backend.enqueue(envelope, this.#routingFor(envelope.type));
  }

  async scheduleRecurring(job: Job, schedule: RecurringSchedule): Promise<void> {
    this.#assertValidCron(schedule.cron);
    const envelope = this.#buildEnvelope(job);
    await this.#backend.scheduleRecurring(envelope, schedule, this.#routingFor(envelope.type));
  }

  // later.parse.cron does not strictly validate: it silently coerces a
  // malformed expression into a bogus schedule (garbage -> every minute,
  // out-of-range -> clamped, an impossible date -> effectively never), so
  // validate up front and fail loudly instead.
  #assertValidCron(cron: string): void {
    const result = cronValidate(cron, {
      preset: 'default', // the seconds field is not supported in the default preset
      override: { useSeconds: true },
    });
    if (!result.isValid()) {
      throw new errors.IncorrectUsageError({
        message: `Invalid cron expression: ${JSON.stringify(cron)}.`,
      });
    }
  }

  async start(): Promise<void> {
    await this.#backend.start({
      processor: (envelope) => this.#process(envelope),
      queues: Object.fromEntries(this.#queues),
    });
  }

  async shutdown(options?: JobsShutdownOptions): Promise<void> {
    await this.#backend.shutdown(options);
  }

  // An in-process restart (test harness) re-runs handler registration on the
  // same instance, so all registration state resets - handlers and queue
  // declarations alike. The duplicate-type guard still holds within a boot.
  clearHandlers(): void {
    this.#registry.clear();
    this.#queueByType.clear();
    this.#queues.clear();
  }

  #buildEnvelope(job: Job): JobEnvelope {
    return { type: this.#typeOf(job), payload: JSON.stringify(job) };
  }

  #typeOf(job: Job): string {
    const ctor: { type?: unknown; name?: string } = job.constructor;
    const type = ctor.type;
    if (typeof type !== 'string' || type.length === 0) {
      throw new errors.IncorrectUsageError({
        message: `Cannot dispatch job: ${ctor.name ?? 'job'} is missing a static "type" string.`,
      });
    }
    return type;
  }

  async #process(envelope: JobEnvelope): Promise<void> {
    const deliver = this.#registry.get(envelope.type);
    if (!deliver) {
      this.#logging.error(
        `No handler registered for job type "${envelope.type}"; dropping delivery.`,
      );
      return;
    }

    const startedAt = Date.now();
    this.#logging.info(`[Background Job] ${envelope.type} started`);

    try {
      await deliver(envelope.payload);
    } catch (err) {
      this.#logging.error(
        err,
        `[Background Job] ${envelope.type} failed after ${Date.now() - startedAt}ms`,
      );
      this.#sentry?.captureException(err, { tags: { job_type: envelope.type } });
      throw err;
    }

    const durationMs = Date.now() - startedAt;
    this.#logging.info(
      {
        system: {
          event: 'job.completed',
          job_type: envelope.type,
          duration_ms: durationMs,
        },
      },
      `[Background Job] ${envelope.type} completed in ${durationMs}ms`,
    );
  }
}
