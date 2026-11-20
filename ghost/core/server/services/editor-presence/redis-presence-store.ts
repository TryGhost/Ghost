import { InternalServerError } from '@tryghost/errors';
import type { ClaimPlace, PresenceStore, StoredClaim, StoredPresence } from './presence-store';

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
  zadd(key: string, flag: 'NX' | 'INCR', score: number, member: string): RedisPresencePipeline;
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

/**
 * Counts the places handed out, as a member of the lease set so that it expires
 * with the claims it numbered. It counts in twos and places take the odd
 * numbers between, so dropping a place by its order never drops the count.
 */
const PLACED = 'placed';

function queued(flat: unknown): StoredClaim[] {
  return scored(flat as string[])
    .filter(([member]) => member !== PLACED)
    .map(([member, order]) => ({ member, order }));
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
  async touch(member: string, now: number, retentionMs: number): Promise<number | undefined> {
    const results = settled(
      await this.client
        .pipeline()
        .zrangebyscore(this.key, '-inf', '+inf', 'WITHSCORES')
        .zadd(this.key, now, member)
        .pexpire(this.key, retentionMs)
        .zremrangebyscore(this.key, '-inf', now - retentionMs)
        .exec(),
    );
    return scored(results[0][1] as string[]).find(([stored]) => stored === member)?.[1];
  }

  async read(since: number): Promise<StoredPresence[]> {
    const flat = await this.client.zrangebyscore(this.key, since, '+inf', 'WITHSCORES');
    return scored(flat).map(([member, ts]) => ({ member, ts }));
  }

  async remove(member: string): Promise<void> {
    await Promise.all([
      this.client.zrem(this.key, member),
      this.client.zrem(this.leaseKey, member),
    ]);
  }

  /**
   * ZADD INCR is atomic, which is what makes a place first come, first served:
   * every new place gets a number of its own, higher than any before it.
   */
  async claim(
    member: string,
    retentionMs: number,
    { front = false, move = false }: ClaimPlace = {},
  ): Promise<StoredClaim[]> {
    if (!move) {
      const kept = settled(
        await this.client
          .pipeline()
          .pexpire(this.leaseKey, retentionMs)
          .zrangebyscore(this.leaseKey, '-inf', '+inf', 'WITHSCORES')
          .exec(),
      );
      const claims = queued(kept[1][1]);
      if (claims.some((claim) => claim.member === member)) {
        return claims;
      }
    }
    const counted = settled(
      await this.client
        .pipeline()
        .zadd(this.leaseKey, 'INCR', 2, PLACED)
        .pexpire(this.leaseKey, retentionMs)
        .exec(),
    );
    const place = Number(counted[0][1]) - 1;
    const order = front ? -place : place;
    const pipeline = this.client.pipeline();
    const placed = move
      ? pipeline.zadd(this.leaseKey, order, member)
      : pipeline.zadd(this.leaseKey, 'NX', order, member);
    const results = settled(
      await placed
        .pexpire(this.leaseKey, retentionMs)
        .zrangebyscore(this.leaseKey, '-inf', '+inf', 'WITHSCORES')
        .exec(),
    );
    return queued(results[2][1]);
  }

  async claims(): Promise<StoredClaim[]> {
    return queued(await this.client.zrangebyscore(this.leaseKey, '-inf', '+inf', 'WITHSCORES'));
  }

  async release(member: string): Promise<void> {
    await this.client.zrem(this.leaseKey, member);
  }

  /** By score, not by member: a claim its member has since renewed has another order and stays. */
  async prune(claims: StoredClaim[]): Promise<void> {
    if (claims.length === 0) {
      return;
    }
    const pipeline = this.client.pipeline();
    for (const { order } of claims) {
      pipeline.zremrangebyscore(this.leaseKey, order, order);
    }
    settled(await pipeline.exec());
  }
}
