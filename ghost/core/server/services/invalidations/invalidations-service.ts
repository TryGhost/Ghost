import { IncorrectUsageError, InternalServerError } from '@tryghost/errors';
import type { GhostLogger } from '@tryghost/logging';
import type { InvalidationMessage, InvalidationTransport, TransportHandlers } from './transport';

type InvalidationCallback = () => unknown;

/**
 * Every cache that may use this service. A fixed list, not a pattern, so no
 * name can carry an id or a state, and a new cache is a change to this module.
 */
export const CACHE_NAMES: readonly string[] = ['tiers'];

interface InvalidationsServiceDeps {
  transport: InvalidationTransport;
  instanceId: string;
  logging: GhostLogger;
  /** Monotonic milliseconds, for durations. */
  now?: () => number;
  /** Epoch milliseconds, comparable with a peer's: for when a message was sent. */
  wallClock?: () => number;
  /** How long to wait before running failed callbacks again. */
  retryDelayMs?: number;
  cacheNames?: readonly string[];
}

export interface InvalidationHandle {
  /** Tells other instances to run their callback for this name. Never rejects. */
  notifyPeers(): Promise<void>;
  /**
   * Runs this name's callback on this instance alone, one at a time with the
   * runs for peers, for when a reload may have hidden a change made here.
   * A failure leaves the instance not ready until a retry succeeds, and
   * rejects, so the caller knows its cache may not hold its change.
   */
  reload(): Promise<void>;
}

/**
 * Lets an in-process cache hear that another instance changed what it holds.
 *
 * A caller invalidates its own copy and then calls `notifyPeers()`; every
 * other instance runs the callback the caller registered under the same name.
 * After a lost connection every callback runs, because messages sent while
 * disconnected are gone.
 */
export class InvalidationsService {
  readonly #transport: InvalidationTransport;
  readonly #instanceId: string;
  readonly #logging: GhostLogger;
  readonly #now: () => number;
  readonly #wallClock: () => number;
  readonly #callbacks = new Map<string, InvalidationCallback>();
  readonly #running = new Map<string, Promise<boolean>>();
  readonly #queued = new Map<string, Promise<boolean>>();
  readonly #publishing = new Map<string, Promise<void>>();
  /**
   * Names that may have changed before anything here registered them, e.g.
   * during boot: a peer sent them, or a reset ran.
   */
  readonly #missed = new Set<string>();
  readonly #retryDelayMs: number;
  readonly #cacheNames: ReadonlySet<string>;
  /**
   * From a lost connection or a stop until reconnecting: messages sent
   * meanwhile are gone.
   */
  #lost = false;
  /** Names whose callback must succeed before this instance is ready again. */
  readonly #stale = new Set<string>();
  /** Bumped by a lost connection or a stop, either of which makes a running reset stale. */
  #generation = 0;
  #retryTimer: NodeJS.Timeout | null = null;

  readonly #handlers: TransportHandlers = {
    onMessage: (message) => this.#receive(message),
    onConnectionLost: () => this.#connectionLost(),
    onReconnected: () => this.#reset(),
  };

  constructor({
    transport,
    instanceId,
    logging,
    now = () => performance.now(),
    wallClock = () => Date.now(),
    retryDelayMs = 10_000,
    cacheNames = CACHE_NAMES,
  }: InvalidationsServiceDeps) {
    this.#transport = transport;
    this.#instanceId = instanceId;
    this.#logging = logging;
    this.#now = now;
    this.#wallClock = wallClock;
    this.#retryDelayMs = retryDelayMs;
    this.#cacheNames = new Set(cacheNames);
  }

  /** Registering a name again replaces its callback, so callers can re-initialize. */
  register(name: string, callback: InvalidationCallback): InvalidationHandle {
    if (!this.#cacheNames.has(name)) {
      throw new IncorrectUsageError({
        message: `Invalidation name ${JSON.stringify(name)} is not one of ${[...this.#cacheNames].join(', ')}`,
      });
    }
    this.#callbacks.set(name, callback);
    // The cache may have loaded before that message, so it reloads once now
    if (this.#missed.delete(name)) {
      void this.#refresh(name);
    }
    return {
      notifyPeers: () => this.#notifyPeers(name),
      reload: async () => {
        if (!(await this.#refresh(name))) {
          // The callback's own error is logged as invalidations.handler.failed
          throw new InternalServerError({ message: `Could not reload ${name}` });
        }
      },
    };
  }

  /**
   * False from a lost connection or a stop until every callback has succeeded
   * after reconnecting, and from a callback failing for a peer's message until it
   * has succeeded on a retry.
   */
  isReady(): boolean {
    return !this.#lost && this.#stale.size === 0;
  }

  async start() {
    const generation = this.#generation;
    await this.#transport.subscribe(this.#handlers);
    // Started again after a stop, and a first subscription reports no reconnect
    // to reset on. One that reported a lost connection resets when it recovers.
    if (!this.isReady() && generation === this.#generation) {
      await this.#reset();
    }
  }

  async stop() {
    this.#supersedeReset();
    this.#lost = true;
    // A rerun queued before the stop then does not start, and a reset after
    // starting again queues its own rather than joining one that will not run
    this.#queued.clear();
    await this.#transport.close();
  }

  #notifyPeers(name: string): Promise<void> {
    // Checked now, not when the message goes out: a reload reading the store
    // may have missed this change and could finish before then
    if (this.#running.has(name)) {
      void this.#refresh(name);
    }

    // One change often notifies several times in a turn, e.g. once per key
    let publishing = this.#publishing.get(name);
    if (!publishing) {
      publishing = new Promise((resolve) => {
        setImmediate(resolve);
      }).then(() => {
        this.#publishing.delete(name);
        return this.#publish(name);
      });
      this.#publishing.set(name, publishing);
    }
    return publishing;
  }

  async #publish(name: string) {
    try {
      await this.#transport.publish({ name, origin: this.#instanceId, sentAt: this.#wallClock() });
    } catch (err) {
      // The caller has already invalidated its own copy, so its write stands.
      this.#logging.error(
        { event: { name: 'invalidations.publish.failed' }, invalidation: { name }, err },
        `Could not notify peers to invalidate ${name}`,
      );
    }
  }

  async #receive({ name, origin, sentAt }: InvalidationMessage) {
    if (origin === this.#instanceId) {
      return;
    }
    const invalidation = {
      name,
      origin,
      // Approximate: the two clocks can disagree
      ...(sentAt === undefined ? {} : { deliveryLatencyMs: this.#wallClock() - sentAt }),
    };
    if (!this.#callbacks.has(name)) {
      if (this.#cacheNames.has(name)) {
        this.#missed.add(name);
      }
      this.#logging.warn(
        { event: { name: 'invalidations.unknown' }, invalidation },
        `Received an invalidation for unregistered cache ${name}`,
      );
      return;
    }

    const start = this.#now();
    const succeeded = await this.#refresh(name);
    this.#logging.info(
      {
        event: {
          name: 'invalidations.received',
          duration: this.#nanosecondsSince(start),
          outcome: succeeded ? 'success' : 'failure',
        },
        invalidation,
      },
      succeeded ? `Invalidated ${name} for a peer` : `Could not invalidate ${name} for a peer`,
    );
  }

  /**
   * Runs a name's callback for a change it may have missed. A failure leaves
   * the cache stale, so the instance is not ready until a retry succeeds.
   */
  async #refresh(name: string): Promise<boolean> {
    const succeeded = await this.#run(name);
    if (!succeeded) {
      this.#stale.add(name);
      this.#scheduleRetry();
    }
    return succeeded;
  }

  #connectionLost() {
    this.#supersedeReset();
    this.#lost = true;
    this.#logging.warn(
      { event: { name: 'invalidations.connection.lost' } },
      'Lost the invalidation connection to peers',
    );
  }

  async #reset() {
    this.#logging.info(
      { event: { name: 'invalidations.reset.started' } },
      'Reconnected to peers, invalidating every registered cache',
    );
    this.#lost = false;
    for (const name of this.#cacheNames) {
      // A cache still loading may have read before a message it missed
      if (this.#callbacks.has(name)) {
        this.#stale.add(name);
      } else {
        this.#missed.add(name);
      }
    }
    await this.#refreshStale(this.#generation);
  }

  /**
   * Runs the callbacks of every stale name and becomes ready when all succeed.
   * Otherwise it stays not ready and runs the failed ones again after a delay,
   * unless a lost connection or a stop has made this run stale meanwhile.
   */
  async #refreshStale(generation: number) {
    const names = [...this.#stale];
    const start = this.#now();
    await Promise.all(
      names.map(async (name) => {
        // Cleared as soon as this run ends, so a later run that fails, as for
        // a peer's message, marks it stale again rather than being undone
        if ((await this.#run(name)) && generation === this.#generation) {
          this.#stale.delete(name);
        }
      }),
    );
    if (generation !== this.#generation) {
      return;
    }
    const duration = this.#nanosecondsSince(start);

    if (this.#stale.size === 0) {
      this.#logging.info(
        {
          event: { name: 'invalidations.reset.finished', duration },
          invalidation: { count: names.length },
        },
        `Invalidated ${names.length} stale caches`,
      );
      return;
    }
    const failed = [...this.#stale];
    this.#logging.error(
      {
        event: { name: 'invalidations.reset.failed', duration },
        invalidation: { count: names.length, failed },
      },
      `Could not invalidate ${failed.join(', ')}, retrying in ${this.#retryDelayMs}ms`,
    );
    this.#scheduleRetry();
  }

  /** A reconnect runs every callback anyway, so there is no retry while disconnected. */
  #scheduleRetry() {
    if (this.#retryTimer || this.#lost) {
      return;
    }
    const generation = this.#generation;
    this.#retryTimer = setTimeout(() => {
      this.#retryTimer = null;
      void this.#refreshStale(generation);
    }, this.#retryDelayMs);
    this.#retryTimer.unref();
  }

  #supersedeReset() {
    this.#generation += 1;
    if (this.#retryTimer) {
      clearTimeout(this.#retryTimer);
      this.#retryTimer = null;
    }
  }

  /**
   * Runs a name's callback, at most one at a time per name. A request while
   * one runs queues a single rerun, so an overlapping reload cannot finish
   * last with an older read. Resolves to whether the callback succeeded.
   */
  #run(name: string): Promise<boolean> {
    const queued = this.#queued.get(name);
    if (queued) {
      return queued;
    }
    const running = this.#running.get(name);
    if (!running) {
      return this.#start(name);
    }
    const rerun: Promise<boolean> = running.then(() => {
      if (this.#queued.get(name) !== rerun) {
        // A stop dropped it; starting again resets every name anyway
        return false;
      }
      this.#queued.delete(name);
      return this.#start(name);
    });
    this.#queued.set(name, rerun);
    return rerun;
  }

  #start(name: string): Promise<boolean> {
    const run = this.#invoke(name).finally(() => {
      this.#running.delete(name);
    });
    this.#running.set(name, run);
    return run;
  }

  /** Runs one callback, logging a failure. Resolves to whether it succeeded. */
  async #invoke(name: string): Promise<boolean> {
    try {
      await this.#callbacks.get(name)?.();
      return true;
    } catch (err) {
      this.#logging.error(
        { event: { name: 'invalidations.handler.failed' }, invalidation: { name }, err },
        `Could not invalidate ${name}`,
      );
      return false;
    }
  }

  #nanosecondsSince(start: number) {
    return Math.round((this.#now() - start) * 1e6);
  }
}
