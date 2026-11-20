import { InternalServerError } from '@tryghost/errors';
import type {
  ClaimTime,
  Claimed,
  PresenceStore,
  StoredClaim,
  StoredPresence,
} from './presence-store';

type ExecResult = Array<[Error | null, unknown]> | null;

/** The slice of an ioredis client the store uses; ioredis is not a direct dependency here. */
export interface RedisPresenceClient {
  pipeline(): RedisPresencePipeline;
  zrangebyscore(
    key: string,
    min: number | string,
    max: number | string,
    withScores: 'WITHSCORES',
  ): Promise<string[]>;
  zrem(key: string, ...members: string[]): Promise<number>;
}

export interface RedisPresencePipeline {
  zadd(key: string, score: number, member: string): RedisPresencePipeline;
  zadd(key: string, flag: 'XX', score: number, member: string): RedisPresencePipeline;
  zrem(key: string, ...members: string[]): RedisPresencePipeline;
  pexpire(key: string, milliseconds: number): RedisPresencePipeline;
  zremrangebyscore(key: string, min: number | string, max: number | string): RedisPresencePipeline;
  zrangebyscore(
    key: string,
    min: number | string,
    max: number | string,
    withScores: 'WITHSCORES',
  ): RedisPresencePipeline;
  exec(): Promise<ExecResult>;
}

function settled(results: ExecResult): Array<[Error | null, unknown]> {
  if (results === null) {
    throw new InternalServerError({ message: 'Presence pipeline returned no results' });
  }
  for (const [error] of results) {
    if (error) {
      throw error;
    }
  }
  return results;
}

/** A WITHSCORES reply is a flat list of member, score, member, score. */
function scored(flat: string[]): Array<[string, number]> {
  const result: Array<[string, number]> = [];
  for (let i = 0; i + 1 < flat.length; i += 2) {
    result.push([flat[i], Number(flat[i + 1])]);
  }
  return result;
}

/** A place as stored: its claim, and the element that holds it. */
interface Place extends StoredClaim {
  element: string;
}

/**
 * A place is one element, `<member>:<order>`, scored by its last renewal. With
 * order and freshness in the same element, neither can be changed or dropped
 * without the other.
 */
function places(flat: unknown): Place[] {
  return scored(flat as string[]).flatMap(([element]) => {
    const cut = element.lastIndexOf(':');
    const order = Number(element.slice(cut + 1));
    return cut > 0 && Number.isFinite(order)
      ? [{ element, member: element.slice(0, cut), order }]
      : [];
  });
}

function claimsOf(found: Place[]): StoredClaim[] {
  return found.map(({ member, order }) => ({ member, order }));
}

export class RedisPresenceStore implements PresenceStore {
  readonly kind = 'redis';
  readonly key: string;
  readonly leaseKey: string;
  private readonly client: RedisPresenceClient;

  constructor(options: { client: RedisPresenceClient; key: string; leaseKey: string }) {
    this.client = options.client;
    this.key = options.key;
    this.leaseKey = options.leaseKey;
  }

  /** PEXPIRE must directly follow ZADD so a new key never lacks a TTL; no MULTI, the commands commute. */
  async touch(member: string, now: number, retentionMs: number): Promise<void> {
    settled(
      await this.client
        .pipeline()
        .zadd(this.key, now, member)
        .pexpire(this.key, retentionMs)
        .zremrangebyscore(this.key, '-inf', now - retentionMs)
        .exec(),
    );
  }

  async read(since: number): Promise<StoredPresence[]> {
    const flat = await this.client.zrangebyscore(this.key, since, '+inf', 'WITHSCORES');
    return scored(flat).map(([member, ts]) => ({ member, ts }));
  }

  async remove(member: string): Promise<void> {
    await Promise.all([this.client.zrem(this.key, member), this.release(member)]);
  }

  async claim(
    member: string,
    { now, since, retentionMs }: ClaimTime,
    to?: 'front' | 'back',
  ): Promise<Claimed> {
    const write = async (pipeline: RedisPresencePipeline): Promise<Place[]> => {
      // Lapsed places go by their renewal time, so one renewed or made since is out of reach.
      const results = settled(
        await pipeline
          .pexpire(this.leaseKey, retentionMs)
          .zremrangebyscore(this.leaseKey, '-inf', since - 1)
          .zrangebyscore(this.leaseKey, since, '+inf', 'WITHSCORES')
          .exec(),
      );
      return places(results[results.length - 1][1]);
    };

    let found = places(await this.client.zrangebyscore(this.leaseKey, since, '+inf', 'WITHSCORES'));
    let own = found.filter((place) => place.member === member);
    if (own.length > 0 && !to) {
      const kept = own.reduce((lowest, place) => (place.order < lowest.order ? place : lowest));
      // XX: a place dropped since it was read stays dropped, and its member joins again below.
      found = await write(this.client.pipeline().zadd(this.leaseKey, 'XX', now, kept.element));
      if (found.some((place) => place.member === member)) {
        return { claims: claimsOf(found), joined: false };
      }
      own = [];
    }

    const orders = found.filter((place) => place.member !== member).map((place) => place.order);
    const order = to === 'front' ? Math.min(0, ...orders) - 1 : Math.max(0, ...orders) + 1;
    const pipeline = this.client.pipeline();
    if (own.length > 0) {
      pipeline.zrem(this.leaseKey, ...own.map((place) => place.element));
    }
    found = await write(pipeline.zadd(this.leaseKey, now, `${member}:${order}`));
    return { claims: claimsOf(found), joined: !to };
  }

  async claims(since: number): Promise<StoredClaim[]> {
    return claimsOf(
      places(await this.client.zrangebyscore(this.leaseKey, since, '+inf', 'WITHSCORES')),
    );
  }

  async release(member: string): Promise<void> {
    const own = places(
      await this.client.zrangebyscore(this.leaseKey, '-inf', '+inf', 'WITHSCORES'),
    ).filter((place) => place.member === member);
    if (own.length > 0) {
      await this.client.zrem(this.leaseKey, ...own.map((place) => place.element));
    }
  }
}
