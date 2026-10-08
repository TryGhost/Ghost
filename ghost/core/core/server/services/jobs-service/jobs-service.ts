import errors from '@tryghost/errors';
import cronValidate from 'cron-validate';
import ObjectID from 'bson-objectid';
import type { Knex } from 'knex';
import type {
  JobsBackendBase,
  JobEnvelope,
  DispatchEnvelope,
  JobsShutdownOptions,
  QueueDeclaration,
  RecurringSchedule,
} from '@tryghost/adapter-base-jobs';
import { Job, JobConstructor, JobHandler } from './job';

export interface JobsLogger {
  error(...args: unknown[]): void;
  info(...args: unknown[]): void;
  // Optional: the real @tryghost/logging always has it, but a minimal test
  // logger need not, and only the SQLite-fallback warning uses it.
  warn?(...args: unknown[]): void;
}

export interface JobsErrorReporter {
  captureException(err: unknown, captureContext?: { tags?: Record<string, string> }): void;
}

// The jobs service depends on only the slice of the outbox store and relay it
// uses, so the concrete classes are wired in boot without a module cycle.
export interface OutboxStore {
  insert(
    entry: { id: string; envelope: DispatchEnvelope },
    options?: { transacting?: Knex.Transaction },
  ): Promise<void>;
}

export interface OutboxRelayLike {
  start(): void;
  stop(): Promise<void>;
}

export interface JobsOutboxWiring {
  store: OutboxStore;
  relay: OutboxRelayLike;
}

export interface DispatchOptions {
  // When given, the outbox row is written in the caller's transaction, so the
  // caller's DB change and the pending job commit or roll back together.
  transacting?: Knex.Transaction;
}

export interface JobsServiceOptions {
  backend: JobsBackendBase;
  logging: JobsLogger;
  sentry?: JobsErrorReporter;
  // Present only when the outbox is active (enabled AND the DB is MySQL);
  // dispatch then commits a durable row instead of enqueueing directly.
  outbox?: JobsOutboxWiring;
  // The outbox was enabled but the database cannot support it (not MySQL);
  // the service stays on the legacy path and warns once at start.
  logOutboxUnavailable?: boolean;
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
  readonly #outbox?: JobsOutboxWiring;
  readonly #logOutboxUnavailable: boolean;
  readonly #registry = new Map<string, Deliverer>();
  readonly #queueByType = new Map<string, string>();
  readonly #queues = new Map<string, QueueDeclaration>();

  constructor({ backend, logging, sentry, outbox, logOutboxUnavailable }: JobsServiceOptions) {
    this.#backend = backend;
    this.#logging = logging;
    this.#sentry = sentry;
    this.#outbox = outbox;
    this.#logOutboxUnavailable = logOutboxUnavailable ?? false;
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

  /**
   * Resolves when the backend's enqueue call completes, without waiting for the
   * handler to run. Enqueue errors reject this promise. Resolution does not
   * guarantee execution: the backend controls what happens to work during shutdown.
   */
  async dispatch(job: Job, { transacting }: DispatchOptions = {}): Promise<void> {
    const envelope = this.#buildEnvelope(job);
    // A fresh dispatch ID per submission; a durable backend dedupes an
    // at-least-once redelivery on it, and the in-memory backend ignores it.
    const id = new ObjectID().toHexString();

    if (this.#outbox) {
      // Commit a durable row and resolve after the write. With a transaction
      // the caller controls the commit; without one the insert self-commits.
      await this.#outbox.store.insert({ id, envelope }, { transacting });
      return;
    }

    if (transacting) {
      throw new errors.IncorrectUsageError({
        message:
          'jobsService.dispatch cannot honour a transaction while the outbox is inactive; atomicity with the caller transaction is not available on the legacy direct path.',
      });
    }
    await this.#backend.enqueue(id, envelope);
  }

  async scheduleRecurring(job: Job, schedule: RecurringSchedule): Promise<void> {
    this.#assertValidCron(schedule.cron);
    const envelope = this.#buildEnvelope(job);
    await this.#backend.scheduleRecurring(envelope, schedule);
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
    // The relay forwards to the backend, so it only starts once the backend is
    // accepting work. Rows dispatched before start() wait for the next poll.
    if (this.#outbox) {
      this.#outbox.relay.start();
    } else if (this.#logOutboxUnavailable) {
      this.#logging.warn?.(
        '[Jobs] services:jobs:outbox is enabled but the database is not MySQL; using the legacy direct-dispatch path.',
      );
    }
  }

  async shutdown(options?: JobsShutdownOptions): Promise<void> {
    // Stop the relay before the backend so no further hand-offs are attempted
    // against a backend that is shutting down.
    if (this.#outbox) {
      await this.#outbox.relay.stop();
    }
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

  // Builds the dispatch envelope the backend (and later the outbox) carries:
  // the serialised job under `payload.job`, with its handler-declared lane
  // resolved into `payload.routing` so a retry preserves the original lane. An
  // unroutable type omits routing, selecting the default lane.
  #buildEnvelope(job: Job): DispatchEnvelope {
    const type = this.#typeOf(job);
    const serialised = JSON.stringify(job);
    const queue = this.#queueByType.get(type);
    const payload: DispatchEnvelope['payload'] =
      queue === undefined
        ? { job: { type, payload: serialised } }
        : { job: { type, payload: serialised }, routing: { queue } };
    return { version: 1, payload };
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
