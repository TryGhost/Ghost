import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';
import { InternalServerError } from '@tryghost/errors';
import type { GhostLogger } from '@tryghost/logging';
import {
  invalidationMessageSchema,
  type InvalidationMessage,
  type InvalidationTransport,
  type TransportHandlers,
} from './transport';

interface Heartbeat {
  /** How often to send one, and to check the last one came back. */
  intervalMs: number;
  /** How long without hearing one before the connections count as dead. */
  timeoutMs: number;
}

interface RedisTransportDeps {
  connection: Redis.RedisOptions;
  channel: string;
  logging: GhostLogger;
  heartbeat?: Heartbeat;
  /** How long boot waits for the first subscription before carrying on without it. */
  firstConnectionWaitMs?: number;
}

interface Clients {
  publisher: Redis.Redis;
  subscriber: Redis.Redis;
  /** Settles the publishes waiting on this publisher when its connection closes. */
  awaitingReply: Set<() => void>;
}

const DEFAULT_HEARTBEAT: Heartbeat = { intervalMs: 15_000, timeoutMs: 45_000 };

// Not JSON, so it cannot be mistaken for an invalidation message
const HEARTBEAT_PREFIX = 'heartbeat:';

/** The channel every instance of one site in one environment shares. */
export function channelFor({ url, env }: { url: string; env: string }): string {
  const { host, pathname } = new URL(url);
  const path = pathname.replace(/^\/+|\/+$/g, '').replaceAll('/', ':');
  return ['ghost:invalidations', env, host.toLowerCase(), path.toLowerCase()]
    .filter(Boolean)
    .join(':');
}

/** The one place a payload from Redis becomes a message. */
function parseMessage(raw: string): InvalidationMessage | null {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = invalidationMessageSchema.safeParse(json);
  if (!parsed.success) {
    return null;
  }
  const { name, origin, sentAt } = parsed.data;
  return sentAt === undefined ? { name, origin } : { name, origin, sentAt };
}

/**
 * Redis pub/sub on one channel. A subscribed connection cannot publish, so
 * there are two. Both reconnect on their own; the subscriber reports the gap.
 *
 * Neither connection carries traffic between invalidations, so a dead one
 * could go unnoticed. Each instance therefore publishes a heartbeat and
 * listens for its own, which crosses both connections, and reconnects them
 * when it stops coming back.
 */
export class RedisTransport implements InvalidationTransport {
  readonly channel: string;
  readonly #logging: GhostLogger;
  readonly #connection: Redis.RedisOptions;
  /**
   * The clients of the current lifetime, which also identifies it: work
   * started in an earlier lifetime checks it to leave this one alone.
   */
  #clients: Clients;
  readonly #heartbeat: Heartbeat;
  readonly #heartbeatMessage = `${HEARTBEAT_PREFIX}${randomUUID()}`;
  readonly #firstConnectionWaitMs: number;
  /** When each connection Redis accepted but has not answered was first seen that way. */
  readonly #stalledSince = new Map<Redis.Redis, number>();
  /** Connections whose error this outage was logged, so retries do not log again. */
  readonly #erroring = new Set<Redis.Redis>();
  #heartbeatTimer: NodeJS.Timeout | null = null;
  /** Monotonic, as are the stall times, so a step of the wall clock cannot hide a dead connection. */
  #heartbeatHeardAt = 0;
  /**
   * The latest message per name Redis has not confirmed, with the number of
   * its send and whether a failed send was logged as held.
   */
  readonly #unsent = new Map<string, { payload: string; send: number; held: boolean }>();
  #sends = 0;
  #state: 'idle' | 'connected' | 'lost' | 'closed' = 'idle';
  #listeners: Record<'message' | 'close' | 'ready', (...args: string[]) => unknown> | null = null;

  constructor({
    connection,
    channel,
    logging,
    heartbeat = DEFAULT_HEARTBEAT,
    firstConnectionWaitMs = 2_000,
  }: RedisTransportDeps) {
    this.channel = channel;
    this.#logging = logging;
    this.#heartbeat = heartbeat;
    this.#firstConnectionWaitMs = firstConnectionWaitMs;
    this.#connection = connection;
    this.#clients = this.#createClients(connection);
  }

  /**
   * ioredis clients for one lifetime of the transport. A client disconnected
   * while it waited to reconnect stays marked as closed on purpose, and would
   * then not reconnect after a later drop, so subscribing after a close
   * starts with new ones.
   */
  #createClients(connection: Redis.RedisOptions): Clients {
    const publisher = new Redis({
      ...connection,
      lazyConnect: true,
      // The transport holds what Redis did not confirm and sends it again on
      // the next connection (see #send), because ioredis can lose a command
      // that was in flight when the connection closed. So a publish fails at
      // once while disconnected, and ioredis resends nothing itself.
      enableOfflineQueue: false,
      autoResendUnfulfilledCommands: false,
    });
    // Settles each publish still waiting on this publisher when its connection
    // closes. One listener, so waiting publishes add none, and each removes
    // itself once settled.
    const awaitingReply = new Set<() => void>();
    // ioredis may never settle a command the connection closed on
    publisher.on('close', () => {
      for (const settle of awaitingReply) {
        settle();
      }
      awaitingReply.clear();
    });
    publisher.on('ready', () => {
      for (const [name, { payload }] of [...this.#unsent]) {
        // Rejects only when closing meanwhile, which drops it on purpose
        this.#send(name, payload).catch(() => {});
      }
    });
    const subscriber = new Redis({ ...connection, lazyConnect: true });
    for (const client of [publisher, subscriber]) {
      client.on('ready', () => this.#erroring.delete(client));
      // Without a listener, a connection error crashes the process
      client.on('error', (err: Error) => {
        // ioredis emits one per failed attempt, every few seconds while Redis is away
        if (this.#erroring.has(client)) {
          return;
        }
        this.#erroring.add(client);
        this.#logging.warn(
          { event: { name: 'invalidations.redis.error' }, err },
          'Invalidation connection to Redis failed',
        );
      });
    }
    return { publisher, subscriber, awaitingReply };
  }

  async subscribe(handlers: TransportHandlers) {
    if (this.#state === 'closed') {
      this.#clients = this.#createClients(this.#connection);
    }
    const clients = this.#clients;
    this.#state = 'idle';
    const resubscribe = async () => {
      if (this.#state !== 'lost') {
        return;
      }
      // ioredis resubscribes on ready without waiting for Redis to confirm.
      // Subscribing again resolves after that, so the reset cannot miss a
      // message published while the subscription was still pending.
      try {
        await this.#clients.subscriber.subscribe(this.channel);
      } catch {
        // The connection dropped again; the next ready retries
        return;
      }
      if (this.#state !== 'lost') {
        return;
      }
      this.#connected();
      void handlers.onReconnected();
    };
    this.#listeners = {
      message: (_channel: string, raw: string) => {
        if (raw.startsWith(HEARTBEAT_PREFIX)) {
          // Peers' heartbeats share the channel and prove nothing about this instance
          if (raw === this.#heartbeatMessage) {
            this.#heartbeatHeardAt = performance.now();
          }
          return;
        }
        const message = parseMessage(raw);
        if (!message) {
          this.#logging.warn(
            { event: { name: 'invalidations.redis.malformed' } },
            'Dropped a malformed invalidation message',
          );
          return;
        }
        void handlers.onMessage(message);
      },
      close: () => {
        if (this.#state === 'connected') {
          this.#state = 'lost';
          handlers.onConnectionLost();
        }
      },
      ready: resubscribe,
    };
    for (const [event, listener] of Object.entries(this.#listeners)) {
      this.#clients.subscriber.on(event, listener);
    }
    this.#heartbeatTimer = setInterval(() => this.#beat(), this.#heartbeat.intervalMs);
    this.#heartbeatTimer.unref();

    // What is published before the publisher connects is held and sent when
    // it does, so its first attempt failing needs no more than the error it logs
    this.#clients.publisher.connect().catch(() => {});
    let err: unknown;
    const subscribed = this.#clients.subscriber
      .connect()
      .then(() => this.#clients.subscriber.subscribe(this.channel))
      .then(
        () => true,
        (subscribeErr: unknown) => {
          err = subscribeErr;
          return false;
        },
      );
    // ioredis has no timeout once the socket is open, so a Redis that accepts
    // connections and never answers would otherwise hold boot forever
    let waitTimer: NodeJS.Timeout | undefined;
    const waited = new Promise<false>((resolve) => {
      waitTimer = setTimeout(() => resolve(false), this.#firstConnectionWaitMs);
    });
    const isSubscribed = await Promise.race([subscribed, waited]);
    clearTimeout(waitTimer);

    if (this.#state !== 'idle' || clients !== this.#clients) {
      // Closed while connecting, and maybe subscribed again since
      return;
    }
    if (!isSubscribed) {
      // Redis being away must not stop Ghost booting. ioredis keeps retrying,
      // so this is a lost connection from the start: the reset on reconnecting
      // covers everything missed until then.
      this.#state = 'lost';
      this.#logging.error(
        { event: { name: 'invalidations.redis.unavailable' }, err },
        'Could not connect to Redis for invalidations, retrying in the background',
      );
      handlers.onConnectionLost();
      if (this.#clients.subscriber.status === 'ready') {
        // It became ready before giving up on it, so no ready follows
        void resubscribe();
      }
      return;
    }
    this.#connected();
  }

  async publish(message: InvalidationMessage) {
    if (this.#state === 'closed') {
      throw new InternalServerError({
        message: `Could not send the invalidation of ${message.name}: the transport is closed`,
      });
    }
    await this.#send(message.name, JSON.stringify(message));
  }

  async close() {
    this.#state = 'closed';
    if (this.#heartbeatTimer) {
      clearInterval(this.#heartbeatTimer);
      this.#heartbeatTimer = null;
    }
    for (const [event, listener] of Object.entries(this.#listeners ?? {})) {
      this.#clients.subscriber.removeListener(event, listener);
    }
    this.#listeners = null;
    this.#unsent.clear();
    this.#clients.publisher.disconnect();
    this.#clients.subscriber.disconnect();
  }

  /**
   * Publishes a message, holding it to send on the next connection when Redis
   * does not confirm it. A message carries no values, so a late one is still
   * right, and only the latest one per name needs holding. Rejects once
   * closed, as it can then neither send nor hold it.
   */
  async #send(name: string, payload: string) {
    this.#sends += 1;
    const send = this.#sends;
    const held = this.#unsent.get(name)?.held ?? false;
    this.#unsent.set(name, { payload, send, held });
    let failure: { err?: unknown } | null = null;
    const clients = this.#clients;
    const closed = Promise.withResolvers<false>();
    const settle = () => closed.resolve(false);
    clients.awaitingReply.add(settle);
    try {
      const confirmed = await Promise.race([
        clients.publisher.publish(this.channel, payload).then(() => true),
        closed.promise,
      ]);
      failure = confirmed ? null : {};
    } catch (err) {
      failure = { err };
    } finally {
      clients.awaitingReply.delete(settle);
    }

    const unsent = this.#unsent.get(name);
    if (!failure) {
      // A later send of the same message may still be waiting for its answer
      if (unsent?.send === send) {
        this.#unsent.delete(name);
        if (unsent.held) {
          this.#logging.info(
            { event: { name: 'invalidations.redis.publish.released' }, invalidation: { name } },
            `Sent the held invalidation of ${name}`,
          );
        }
      }
    } else if (this.#state === 'closed' || clients !== this.#clients) {
      // Closing dropped what was held, so it is neither sent nor held
      throw (
        failure.err ??
        new InternalServerError({
          message: `Could not send the invalidation of ${name}: the transport closed`,
        })
      );
    } else {
      if (unsent) {
        unsent.held = true;
      }
      this.#logging.warn(
        {
          event: { name: 'invalidations.redis.publish.held' },
          invalidation: { name },
          ...failure,
        },
        `Holding the invalidation of ${name} to send once Redis is reachable`,
      );
    }
  }

  #connected() {
    this.#state = 'connected';
    // A new subscription gets the whole timeout to hear its first heartbeat
    this.#heartbeatHeardAt = performance.now();
  }

  /**
   * Sends a heartbeat and what Redis refused before, or reconnects when the
   * last heartbeats did not come back.
   */
  #beat() {
    if (this.#state === 'idle' || this.#state === 'closed') {
      return;
    }
    const now = performance.now();
    this.#reconnectStalled(now);
    if (this.#state !== 'connected') {
      return;
    }
    if (this.#clients.publisher.status !== 'ready') {
      // Nothing can come back while the publisher reconnects, which it does on
      // its own, so that says nothing about the subscriber
      this.#heartbeatHeardAt = now;
      return;
    }
    if (now - this.#heartbeatHeardAt > this.#heartbeat.timeoutMs) {
      this.#logging.warn(
        { event: { name: 'invalidations.redis.heartbeat.missed' } },
        'Heard no invalidation heartbeat from Redis, reconnecting',
      );
      this.#heartbeatHeardAt = now;
      // Either connection may be the dead one. The close and ready listeners
      // take it from here, as for any lost connection.
      this.#clients.publisher.disconnect(true);
      this.#clients.subscriber.disconnect(true);
      return;
    }
    // A failure shows as a missed heartbeat
    this.#clients.publisher.publish(this.channel, this.#heartbeatMessage).catch(() => {});
    // Redis can refuse a publish and keep the connection, as when busy with a
    // script, and then no ready comes to send what it refused
    for (const [name, { payload, held }] of [...this.#unsent]) {
      if (held) {
        this.#send(name, payload).catch(() => {});
      }
    }
  }

  /**
   * ioredis waits forever on a connection Redis accepted and never answered,
   * and on a subscription Redis never confirmed. Only a new connection retries
   * the subscription, as resubscribing runs on ready.
   */
  #reconnectStalled(now: number) {
    for (const client of [this.#clients.publisher, this.#clients.subscriber]) {
      const unsubscribed =
        client === this.#clients.subscriber && client.status === 'ready' && this.#state === 'lost';
      if (client.status !== 'connect' && !unsubscribed) {
        this.#stalledSince.delete(client);
        continue;
      }
      const since = this.#stalledSince.get(client) ?? now;
      this.#stalledSince.set(client, since);
      if (now - since > this.#heartbeat.timeoutMs) {
        this.#logging.warn(
          { event: { name: 'invalidations.redis.stalled' } },
          'Redis has not answered an invalidation connection, reconnecting',
        );
        this.#stalledSince.delete(client);
        client.disconnect(true);
      }
    }
  }
}
