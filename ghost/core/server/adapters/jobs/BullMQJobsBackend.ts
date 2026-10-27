import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import { z } from 'zod';
import { Queue, UnrecoverableError, Worker } from 'bullmq';
import type { Job as BullJob, RedisOptions } from 'bullmq';
import { JobsBackendBase } from '@tryghost/adapter-base-jobs';
import type { RedisConnection } from 'bullmq';
import type {
  JobProcessor,
  DispatchEnvelope,
  JobsStartOptions,
  RecurringSchedule,
  JobsShutdownOptions,
} from '@tryghost/adapter-base-jobs';

const logging = require('@tryghost/logging');

// Durable jobs on Redis, selected with adapters:jobs:active = "BullMQJobsBackend"
// and configured under adapters:jobs:BullMQJobsBackend (see the schema below).
//
// - `connection` is passed through to ioredis. It is deliberately never
//   borrowed from the cache Redis config: the queue needs AOF persistence and
//   maxmemory-policy noeviction, while the cache tolerates eviction.
// - `prefix` namespaces every key and has no default. Sites that share one Redis
//   must set distinct prefixes, or they will consume each other's jobs.
// - `concurrency` is per container, per lane. There is no global concurrency.

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
// Closing still gets this long when draining used up the whole shutdown budget.
const MIN_CLOSE_GRACE_MS = 1000;
// A producer waits for its first connection, which never comes when Redis is
// down, so enqueue and recurring registration give up after this long instead
// of hanging their caller.
const ENQUEUE_TIMEOUT_MS = 2000;
// Envelopes with no routing share this lane; routing to "default" by name is
// the same lane, not a collision.
const DEFAULT_QUEUE = 'default';

function isKnownTimezone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

// Ghost's config loader parses environment values, so an all-digit string
// setting arrives as a number.
const configString = z.union([z.string(), z.number()]).transform(String);
const nonEmptyConfigString = configString.pipe(z.string().min(1));

const tlsSchema = z.union([z.boolean(), z.record(z.string(), z.unknown())]);

const connectionSchema = z
  .strictObject({
    host: z.string().min(1).optional(),
    port: z.number().int().positive().optional(),
    // The Redis data nodes' credentials, in Sentinel mode too. Sentinel's own
    // auth goes in sentinelUsername and sentinelPassword.
    username: configString.nullish(),
    password: configString.nullish(),
    db: z.number().int().nonnegative().optional(),
    tls: tlsSchema.optional(),
    sentinels: z
      .array(z.strictObject({ host: z.string().min(1), port: z.number().int().positive() }))
      .min(1)
      .optional(),
    // The Sentinel master group name
    name: nonEmptyConfigString.optional(),
    sentinelUsername: configString.nullish(),
    sentinelPassword: configString.nullish(),
    sentinelTLS: tlsSchema.optional(),
    enableTLSForSentinelMode: z.boolean().optional(),
    // Sent as CLIENT SETNAME on the queue's and worker's main connections, so
    // this site's clients can be found in CLIENT LIST. BullMQ names the worker's
    // blocking connection itself, as `<prefix>:<base64 queue name>`.
    connectionName: nonEmptyConfigString.optional(),
  })
  .superRefine(
    ({ sentinels, name, host, port, tls, sentinelTLS, enableTLSForSentinelMode }, ctx) => {
      const reject = (key: string, message: string) => {
        ctx.addIssue({ code: 'custom', path: [key], message });
      };
      if (sentinels && !name) {
        reject('name', 'Required when sentinels is set');
      }
      if (!sentinels && name) {
        reject('name', 'Only allowed when sentinels is set');
      }
      if (sentinels && host !== undefined) {
        reject('host', 'Not allowed when sentinels is set');
      }
      if (sentinels && port !== undefined) {
        reject('port', 'Not allowed when sentinels is set');
      }
      // ioredis ignores `tls` in Sentinel mode without enableTLSForSentinelMode, and
      // would send the data-node password in plaintext
      if (sentinels && tls && !enableTLSForSentinelMode) {
        reject('enableTLSForSentinelMode', 'Required when tls is set with sentinels');
      }
      if (enableTLSForSentinelMode && !tls) {
        reject('tls', 'Required when enableTLSForSentinelMode is set');
      }
      if (sentinelTLS && !tls) {
        reject('tls', 'Required when sentinelTLS is set, or data-node traffic stays plaintext');
      }
      if (!sentinels && enableTLSForSentinelMode !== undefined) {
        reject('enableTLSForSentinelMode', 'Only allowed when sentinels is set');
      }
      if (!sentinels && sentinelTLS) {
        reject('sentinelTLS', 'Only allowed when sentinels is set');
      }
    },
  )
  .transform(
    ({
      username,
      password,
      tls,
      sentinelUsername,
      sentinelPassword,
      sentinelTLS,
      ...rest
    }): RedisOptions => {
      const options: RedisOptions = rest.sentinels
        ? { ...rest }
        : { host: '127.0.0.1', port: 6379, ...rest };
      if (username !== null && username !== undefined) {
        options.username = username;
      }
      if (password !== null && password !== undefined) {
        options.password = password;
      }
      if (sentinelUsername !== null && sentinelUsername !== undefined) {
        options.sentinelUsername = sentinelUsername;
      }
      if (sentinelPassword !== null && sentinelPassword !== undefined) {
        options.sentinelPassword = sentinelPassword;
      }
      if (tls === true) {
        options.tls = {};
      } else if (tls) {
        options.tls = tls;
      }
      if (sentinelTLS === true) {
        options.sentinelTLS = {};
      } else if (sentinelTLS) {
        options.sentinelTLS = sentinelTLS;
      }
      return options;
    },
  );

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
  // Cron schedules are read in this zone: the configured one, else the process's.
  timezone: z
    .string()
    .refine(isKnownTimezone, 'Expected an IANA timezone name')
    .nullish()
    .transform((zone) => zone ?? Intl.DateTimeFormat().resolvedOptions().timeZone),
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
    // An unknown key's issue sits on its parent, so name the key itself
    const path =
      issue!.code === 'unrecognized_keys' ? [...issue!.path, issue!.keys[0]!] : issue!.path;
    throw new errors.IncorrectUsageError({
      message: tpl(messages.invalidConfig, { path: path.join('.'), issue: issue!.message }),
    });
  }
}

interface Lane {
  queue: Queue;
  worker: Worker;
}

// BullMQ removes a connection's 'error' listeners when it closes it. A close
// that lands while the connection is still being established lets that
// attempt's error arrive afterwards, re-emitted with no listener: an unhandled
// rejection. In that case close() runs synchronously up to removing the
// listeners, so a no-op listener added straight after the call drops the error.
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

// Work only flows between start() and shutdown(): boot starts the service
// before the web app is mounted or any recurring job is scheduled, so an
// enqueue or recurring registration before start() is a boot-ordering bug and
// throws, while an enqueue after shutdown() is a benign shutdown race and is
// dropped.
export default class BullMQJobsBackend extends JobsBackendBase {
  private _processor: JobProcessor | null;
  private _stopped: boolean;
  private _prefix: string;
  private _connection: RedisOptions;
  private _defaultConcurrency: number;
  private _lockDuration: number;
  private _stalledInterval: number;
  private _maxStalledCount: number;
  private _timezone: string;
  private _lanes: Map<string, Lane>;
  // Deliveries running now. Shutdown waits on them, within its time budget.
  private _inflight: Set<Promise<void>>;

  constructor(config: unknown = {}) {
    super();
    const resolved = parseConfig(config);
    this._processor = null;
    this._stopped = false;
    this._prefix = resolved.prefix;
    this._connection = resolved.connection;
    this._defaultConcurrency = resolved.concurrency;
    this._lockDuration = resolved.lockDuration;
    this._stalledInterval = resolved.stalledInterval;
    this._maxStalledCount = resolved.maxStalledCount;
    this._timezone = resolved.timezone;
    this._lanes = new Map();
    this._inflight = new Set();
  }

  // Producers fail fast when Redis is down, so enqueue rejects promptly and the
  // outbox relay (or the direct path) decides what happens to the job.
  private _producerConnection(): RedisOptions {
    return {
      ...this._connection,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => Math.min(times * 200, 2000),
    };
  }

  // Workers wait for Redis forever and pick up again when it returns.
  private _workerConnection(): RedisOptions {
    return { ...this._connection, maxRetriesPerRequest: null };
  }

  private _makeLane(name: string, concurrency: number): Lane {
    const queue = new Queue(name, {
      connection: this._producerConnection(),
      prefix: this._prefix,
    });
    const worker = new Worker(name, (bullJob) => this._deliver(bullJob), {
      connection: this._workerConnection(),
      prefix: this._prefix,
      concurrency,
      lockDuration: this._lockDuration,
      stalledInterval: this._stalledInterval,
      maxStalledCount: this._maxStalledCount,
    });
    // BullMQ keeps these connections internal; the worker's blocking one is private
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
    // Without listeners a Redis connection error would be an unhandled 'error' event
    queue.on('error', (err) => logging.error(`Jobs queue "${name}" error`, err));
    worker.on('error', (err) => logging.error(`Jobs worker "${name}" error`, err));
    return { queue, worker };
  }

  start({ processor, queues }: JobsStartOptions): void {
    const declared = new Map<string, number>();
    for (const [name, { concurrency }] of Object.entries(queues ?? {})) {
      // A declaration the backend cannot satisfy must fail loudly here, never
      // silently fall back (see the jobs-base README).
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

    // State only changes once every declaration is valid, so a rejected
    // start() never leaves a partially started backend that accepts work.
    this._processor = processor;
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
      // Lanes are created lazily for any queue name no handler declared, at the
      // default concurrency.
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
    // The dispatch id is the job id: the outbox relay resubmits the same id, so
    // BullMQ dedupes for as long as the job key exists.
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
                context: tpl(messages.redisTimeoutContext, { timeoutMs: ENQUEUE_TIMEOUT_MS }),
                help: tpl(messages.redisTimeoutHelp),
              }),
            );
          }, ENQUEUE_TIMEOUT_MS);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  private async _deliver(bullJob: BullJob<unknown>): Promise<void> {
    const parsed = jobEnvelopeSchema.safeParse(bullJob.data);
    if (!parsed.success) {
      const message = tpl(messages.invalidPayload, { id: bullJob.id });
      logging.error(message, parsed.error);
      // It can never succeed, so it must not use up the retries
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
      // Rethrow so BullMQ records the failed attempt
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
    // First schedule per type wins, even when the cron differs: a re-registration
    // (every boot, every container) must not disturb a schedule already in Redis.
    // Check-then-upsert is not atomic, so two containers booting at the same
    // moment with different crons can race; identical crons are harmless.
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

    // Stop fetching first, then let running deliveries finish. Jobs still
    // waiting stay in Redis and run after the next start.
    const drained = await Promise.race([
      (async () => {
        await Promise.all(lanes.map(({ worker }) => worker.pause(true)));
        await this._awaitInflight();
        return true;
      })().catch(() => false),
      delay(timeoutMs).then(() => false),
    ]);
    // A hung handler's job stays locked; BullMQ's stalled-job handling recovers
    // it once the lock expires, on the next container or boot. Closing with
    // force skips waiting for it.
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
    // A close waits on Redis, which may not be answering. The process is about
    // to exit, so give up on it rather than block shutdown.
    const closed = await Promise.race([
      closing,
      delay(Math.max(deadline - Date.now(), MIN_CLOSE_GRACE_MS)).then(() => false),
    ]);
    if (!closed) {
      logging.warn(messages.closeTimedOut);
      // A worker.close(true) would only return the close already in progress.
      // Best effort and not awaited: disconnecting can wait on Redis too.
      void Promise.allSettled(
        lanes.flatMap(({ worker, queue }) => [worker.disconnect(), queue.disconnect()]),
      );
    }
    this._inflight = new Set();
    this._processor = null;
  }
}
