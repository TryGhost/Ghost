import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import { z } from 'zod';
import { Queue, UnrecoverableError, Worker } from 'bullmq';
import type { Job as BullJob, JobsOptions, RedisOptions } from 'bullmq';
import { JobsBackendBase } from '@tryghost/adapter-base-jobs';
import type { RedisConnection } from 'bullmq';
import type {
  JobProcessor,
  JobSettlement,
  DispatchEnvelope,
  JobsStartOptions,
  RecurringSchedule,
  JobsShutdownOptions,
} from '@tryghost/adapter-base-jobs';

const logging = require('@tryghost/logging');

const messages = {
  invalidConfig: 'Invalid jobs backend config at "{path}": {issue}.',
  invalidConcurrency:
    'Invalid concurrency for declared queue "{name}": {concurrency}. Expected a positive integer.',
  invalidPayload: 'Job {id} has an invalid payload and will not be retried.',
  enqueueBeforeStart: 'Cannot enqueue job "{type}" before the jobs backend is started.',
  enqueueTimedOut: 'Timed out enqueueing job "{type}": Redis is unavailable.',
  scheduleBeforeStart: 'Cannot schedule recurring job "{type}" before the jobs backend is started.',
  scheduleTimedOut: 'Timed out scheduling recurring job "{type}": Redis is unavailable.',
  redisTimeoutContext: 'Redis did not answer within {timeoutMs}ms.',
  redisTimeoutHelp: 'Check that Redis is reachable, then retry.',
  closeFailed: 'Jobs backend failed to close cleanly',
  closeTimedOut: 'Jobs backend did not close in time; Redis may be unavailable',
};

const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10000;
const MIN_CLOSE_GRACE_MS = 1000;
const DEFAULT_QUEUE = 'default';

function isKnownTimezone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

// Ghost's config loader turns all-digit environment values into numbers.
const configString = z.union([z.string(), z.number()]).transform(String);
const nonEmptyConfigString = configString.pipe(z.string().min(1));

const tlsSchema = z.union([z.boolean(), z.record(z.string(), z.unknown())]);

const sentinelSchema = z.strictObject({
  hosts: z
    .array(z.strictObject({ host: z.string().min(1), port: z.number().int().positive() }))
    .min(1),
  name: nonEmptyConfigString,
  username: configString.nullish(),
  password: configString.nullish(),
  tls: tlsSchema.optional(),
});

const connectionSchema = z
  .strictObject({
    host: z.string().min(1).optional(),
    port: z.number().int().positive().optional(),
    sentinel: sentinelSchema.optional(),
    username: configString.nullish(),
    password: configString.nullish(),
    db: z.number().int().nonnegative().optional(),
    tls: tlsSchema.optional(),
    connectionName: nonEmptyConfigString.optional(),
  })
  .superRefine(({ sentinel, host, port, tls }, ctx) => {
    const reject = (path: string[], message: string) => {
      ctx.addIssue({ code: 'custom', path, message });
    };
    if (sentinel && host !== undefined) {
      reject(['host'], 'Not allowed when sentinel is set');
    }
    if (sentinel && port !== undefined) {
      reject(['port'], 'Not allowed when sentinel is set');
    }
    if (sentinel?.tls && !tls) {
      reject(['sentinel', 'tls'], 'Requires tls, or traffic to Redis stays plaintext');
    }
  })
  .transform(({ sentinel, username, password, tls, ...rest }): RedisOptions => {
    const options: RedisOptions = sentinel
      ? { ...rest, sentinels: sentinel.hosts, name: sentinel.name }
      : { host: '127.0.0.1', port: 6379, ...rest };
    if (username !== null && username !== undefined) {
      options.username = username;
    }
    if (password !== null && password !== undefined) {
      options.password = password;
    }
    if (tls) {
      options.tls = tls === true ? {} : tls;
      // ioredis ignores tls in Sentinel mode unless this is set
      if (sentinel) {
        options.enableTLSForSentinelMode = true;
      }
    }
    if (sentinel?.username !== null && sentinel?.username !== undefined) {
      options.sentinelUsername = sentinel.username;
    }
    if (sentinel?.password !== null && sentinel?.password !== undefined) {
      options.sentinelPassword = sentinel.password;
    }
    if (sentinel?.tls) {
      options.sentinelTLS = sentinel.tls === true ? {} : sentinel.tls;
    }
    return options;
  });

const jobEnvelopeSchema = z.object({
  type: z.string().min(1),
  payload: z.string(),
});

const schema = z.strictObject({
  connection: connectionSchema.prefault({}),
  prefix: nonEmptyConfigString,
  concurrency: z.number().int().positive().default(3),
  lockDuration: z.number().int().positive().default(30000),
  stalledInterval: z.number().int().positive().default(30000),
  maxStalledCount: z.number().int().nonnegative().default(1),
  timezone: z
    .string()
    .refine(isKnownTimezone, 'Expected an IANA timezone name')
    .nullish()
    .transform((zone) => zone ?? Intl.DateTimeFormat().resolvedOptions().timeZone),
  attempts: z.number().int().positive().default(6),
  backoff: z
    .strictObject({
      type: z.enum(['exponential', 'fixed']).default('exponential'),
      delay: z.number().int().nonnegative().default(20000),
    })
    .prefault({}),
  retention: z
    .strictObject({
      completedAgeSeconds: z.number().int().positive().default(86400),
      failedAgeSeconds: z.number().int().positive().default(604800),
      maxCount: z.number().int().positive().default(10000),
    })
    .prefault({}),
  enqueueTimeoutMs: z.number().int().positive().default(2000),
});

type ResolvedConfig = z.output<typeof schema>;

function parseConfig(config: unknown): ResolvedConfig {
  try {
    return schema.parse(config);
  } catch (err) {
    if (!(err instanceof z.ZodError)) {
      throw err;
    }
    const [issue] = err.issues;
    const path =
      issue!.code === 'unrecognized_keys' ? [...issue!.path, issue!.keys[0]!] : issue!.path;
    throw new errors.IncorrectUsageError({
      message: tpl(messages.invalidConfig, { path: path.join('.'), issue: issue!.message }),
    });
  }
}

// Keep finished jobs: dedupe of outbox resubmits only works while the key exists.
function jobOptions({ attempts, backoff, retention }: ResolvedConfig): JobsOptions {
  return {
    attempts,
    backoff,
    removeOnComplete: { age: retention.completedAgeSeconds, count: retention.maxCount },
    removeOnFail: { age: retention.failedAgeSeconds, count: retention.maxCount },
  };
}

interface Lane {
  queue: Queue;
  worker: Worker;
}

// BullMQ removes 'error' listeners on close, yet a connection still being set up
// re-emits its error afterwards. A no-op listener added right after close() catches it.
function dropErrorsAfterClose(connection: RedisConnection): void {
  const close = connection.close.bind(connection);
  connection.close = (force?: boolean) => {
    const closing = close(force);
    connection.on('error', () => {});
    return closing;
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export default class BullMQJobsBackend extends JobsBackendBase {
  private _processor: JobProcessor | null;
  private _onSettled: JobsStartOptions['onSettled'];
  private _stopped: boolean;
  private _prefix: string;
  private _connection: RedisOptions;
  private _defaultConcurrency: number;
  private _lockDuration: number;
  private _stalledInterval: number;
  private _maxStalledCount: number;
  private _timezone: string;
  private _jobOptions: JobsOptions;
  private _enqueueTimeoutMs: number;
  private _lanes: Map<string, Lane>;
  private _inflight: Set<Promise<void>>;

  constructor(config: unknown = {}) {
    super();
    const resolved = parseConfig(config);
    this._processor = null;
    this._onSettled = undefined;
    this._stopped = false;
    this._prefix = resolved.prefix;
    this._connection = resolved.connection;
    this._defaultConcurrency = resolved.concurrency;
    this._lockDuration = resolved.lockDuration;
    this._stalledInterval = resolved.stalledInterval;
    this._maxStalledCount = resolved.maxStalledCount;
    this._timezone = resolved.timezone;
    this._jobOptions = jobOptions(resolved);
    this._enqueueTimeoutMs = resolved.enqueueTimeoutMs;
    this._lanes = new Map();
    this._inflight = new Set();
  }

  private _producerConnection(): RedisOptions {
    return {
      ...this._connection,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => Math.min(times * 200, 2000),
    };
  }

  private _workerConnection(): RedisOptions {
    return { ...this._connection, maxRetriesPerRequest: null };
  }

  private _makeLane(name: string, concurrency: number): Lane {
    const queue = new Queue(name, {
      connection: this._producerConnection(),
      prefix: this._prefix,
      defaultJobOptions: this._jobOptions,
    });
    const worker = new Worker(name, (bullJob) => this._deliver(bullJob), {
      connection: this._workerConnection(),
      prefix: this._prefix,
      concurrency,
      lockDuration: this._lockDuration,
      stalledInterval: this._stalledInterval,
      maxStalledCount: this._maxStalledCount,
    });
    // Private BullMQ fields: recheck on upgrade
    const internals = [queue, worker] as unknown as Array<{
      connection: RedisConnection;
      blockingConnection?: RedisConnection;
    }>;
    for (const { connection, blockingConnection } of internals) {
      dropErrorsAfterClose(connection);
      if (blockingConnection) {
        dropErrorsAfterClose(blockingConnection);
      }
    }
    queue.on('error', (err) => logging.error(`Jobs queue "${name}" error`, err));
    worker.on('error', (err) => logging.error(`Jobs worker "${name}" error`, err));
    worker.on('completed', (bullJob) => {
      void this._settle(bullJob, { status: 'completed' });
    });
    worker.on('failed', (bullJob, err) => {
      // BullMQ only marks a job finished once it will not retry it: attempts
      // used up, an unrecoverable error, or too many stalls
      if (bullJob?.finishedOn !== undefined) {
        void this._settle(bullJob, { status: 'dead', error: err });
      }
    });
    return { queue, worker };
  }

  start({ processor, queues, onSettled }: JobsStartOptions): void {
    const declared = new Map<string, number>();
    for (const [name, { concurrency }] of Object.entries(queues ?? {})) {
      if (concurrency !== undefined && (!Number.isInteger(concurrency) || concurrency < 1)) {
        throw new errors.IncorrectUsageError({
          message: tpl(messages.invalidConcurrency, {
            name,
            concurrency: JSON.stringify(concurrency),
          }),
        });
      }
      declared.set(name, concurrency ?? this._defaultConcurrency);
    }

    this._processor = processor;
    this._onSettled = onSettled;
    this._stopped = false;
    for (const [name, concurrency] of declared) {
      this._lanes.set(name, this._makeLane(name, concurrency));
    }
    if (!this._lanes.has(DEFAULT_QUEUE)) {
      this._lanes.set(DEFAULT_QUEUE, this._makeLane(DEFAULT_QUEUE, this._defaultConcurrency));
    }
  }

  private _lane(name: string): Lane {
    let lane = this._lanes.get(name);
    if (!lane) {
      lane = this._makeLane(name, this._defaultConcurrency);
      this._lanes.set(name, lane);
    }
    return lane;
  }

  async enqueue(id: string, envelope: DispatchEnvelope): Promise<void> {
    if (this._stopped) {
      return;
    }
    const { job, routing } = envelope.payload;
    if (!this._processor) {
      throw new errors.IncorrectUsageError({
        message: tpl(messages.enqueueBeforeStart, { type: job.type }),
      });
    }
    const lane = this._lane(routing?.queue ?? DEFAULT_QUEUE);
    await this._withTimeout(
      lane.queue.add(job.type, job, { jobId: id }),
      tpl(messages.enqueueTimedOut, { type: job.type }),
    );
  }

  private async _withTimeout<T>(promise: Promise<T>, message: string): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => {
            reject(
              new errors.InternalServerError({
                message,
                context: tpl(messages.redisTimeoutContext, { timeoutMs: this._enqueueTimeoutMs }),
                help: tpl(messages.redisTimeoutHelp),
              }),
            );
          }, this._enqueueTimeoutMs);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  private async _settle(bullJob: BullJob<unknown>, settlement: JobSettlement): Promise<void> {
    // A scheduler's ticks were never enqueued
    if (bullJob.repeatJobKey || bullJob.id === undefined) {
      return;
    }
    try {
      await this._onSettled?.(bullJob.id, settlement);
    } catch (err) {
      logging.error(`Job "${bullJob.name}" settled, but reporting it failed`, err);
    }
  }

  private async _deliver(bullJob: BullJob<unknown>): Promise<void> {
    const parsed = jobEnvelopeSchema.safeParse(bullJob.data);
    if (!parsed.success) {
      const message = tpl(messages.invalidPayload, { id: bullJob.id });
      logging.error(message, parsed.error);
      // oxlint-disable-next-line ghost/ghost-custom/ghost-error-usage
      throw new UnrecoverableError(message);
    }
    const envelope = parsed.data;
    const delivery = this._processor!(envelope);
    const tracked = delivery.then(
      () => undefined,
      () => undefined,
    );
    this._inflight.add(tracked);
    try {
      await delivery;
    } catch (err) {
      logging.error(`Job "${envelope.type}" delivery failed`, err);
      throw err;
    } finally {
      this._inflight.delete(tracked);
    }
  }

  private async _awaitInflight(): Promise<void> {
    while (this._inflight.size > 0) {
      await Promise.all([...this._inflight]);
    }
  }

  async scheduleRecurring(envelope: DispatchEnvelope, { cron }: RecurringSchedule): Promise<void> {
    if (this._stopped) {
      return;
    }
    const { job, routing } = envelope.payload;
    if (!this._processor) {
      throw new errors.IncorrectUsageError({
        message: tpl(messages.scheduleBeforeStart, { type: job.type }),
      });
    }
    const { queue } = this._lane(routing?.queue ?? DEFAULT_QUEUE);
    // First registration wins, so a reboot never changes a stored cron. This is not
    // atomic: containers booting at once with different crons can race.
    const timeoutMessage = tpl(messages.scheduleTimedOut, { type: job.type });
    if (await this._withTimeout(queue.getJobScheduler(job.type), timeoutMessage)) {
      return;
    }
    await this._withTimeout(
      queue.upsertJobScheduler(
        job.type,
        { pattern: cron, tz: this._timezone },
        { name: job.type, data: job },
      ),
      timeoutMessage,
    );
  }

  async shutdown(options: JobsShutdownOptions = {}): Promise<void> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS;
    const deadline = Date.now() + timeoutMs;
    this._stopped = true;

    const lanes = [...this._lanes.values()];
    this._lanes = new Map();

    const drained = await Promise.race([
      (async () => {
        await Promise.all(lanes.map(({ worker }) => worker.pause(true)));
        await this._awaitInflight();
        return true;
      })().catch(() => false),
      delay(timeoutMs).then(() => false),
    ]);
    // Force-closing is safe: stalled-job handling redelivers a hung job once its lock expires.
    const closing = (async () => {
      await Promise.all(lanes.map(({ worker }) => worker.close(!drained)));
      await Promise.all(lanes.map(({ queue }) => queue.close()));
    })().then(
      () => true,
      (err) => {
        logging.error(messages.closeFailed, err);
        return true;
      },
    );
    const closed = await Promise.race([
      closing,
      delay(Math.max(deadline - Date.now(), MIN_CLOSE_GRACE_MS)).then(() => false),
    ]);
    if (!closed) {
      logging.warn(messages.closeTimedOut);
      // close(true) would only return the pending close. Not awaited: disconnect can hang too.
      void Promise.allSettled(
        lanes.flatMap(({ worker, queue }) => [worker.disconnect(), queue.disconnect()]),
      );
    }
    this._inflight = new Set();
    this._processor = null;
    this._onSettled = undefined;
  }
}
