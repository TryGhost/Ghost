import { InternalServerError } from '@tryghost/errors';
import type { PresenceStore, StoredClaim, StoredPresence } from './presence-store';

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
  zadd(key: string, flag: 'NX', score: number, member: string): RedisPresencePipeline;
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
    await Promise.all([
      this.client.zrem(this.key, member),
      this.client.zrem(this.leaseKey, member),
    ]);
  }

  /** ZADD NX is what makes a place first come, first served: a queued member's score is left alone. */
  async claim(
    member: string,
    order: number,
    retentionMs: number,
    replace = false,
  ): Promise<StoredClaim[]> {
    const pipeline = this.client.pipeline();
    const queued = replace
      ? pipeline.zadd(this.leaseKey, order, member)
      : pipeline.zadd(this.leaseKey, 'NX', order, member);
    const results = settled(
      await queued
        .pexpire(this.leaseKey, retentionMs)
        .zrangebyscore(this.leaseKey, '-inf', '+inf', 'WITHSCORES')
        .exec(),
    );
    return scored(results[2][1] as string[]).map(([queuedMember, queuedOrder]) => ({
      member: queuedMember,
      order: queuedOrder,
    }));
  }

  async claims(): Promise<StoredClaim[]> {
    const flat = await this.client.zrangebyscore(this.leaseKey, '-inf', '+inf', 'WITHSCORES');
    return scored(flat).map(([member, order]) => ({ member, order }));
  }

  async release(members: string[]): Promise<void> {
    if (members.length > 0) {
      await this.client.zrem(this.leaseKey, ...members);
    }
  }
}
