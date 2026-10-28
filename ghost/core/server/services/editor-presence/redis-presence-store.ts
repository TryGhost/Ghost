import { InternalServerError } from '@tryghost/errors';
import type { PresenceStore, StoredPresence } from './presence-store';

type ExecResult = Array<[Error | null, unknown]> | null;

/** The slice of an ioredis client the store uses; ioredis is not a direct dependency here. */
export interface RedisPresenceClient {
  multi(): RedisPresenceTransaction;
  zrangebyscore(
    key: string,
    min: number | string,
    max: number | string,
    withScores: 'WITHSCORES',
  ): Promise<string[]>;
  zrem(key: string, ...members: string[]): Promise<number>;
}

export interface RedisPresenceTransaction {
  zadd(key: string, score: number, member: string): RedisPresenceTransaction;
  zremrangebyscore(
    key: string,
    min: number | string,
    max: number | string,
  ): RedisPresenceTransaction;
  pexpire(key: string, milliseconds: number): RedisPresenceTransaction;
  exec(): Promise<ExecResult>;
}

export class RedisPresenceStore implements PresenceStore {
  readonly kind = 'redis';
  readonly key: string;
  private readonly client: RedisPresenceClient;

  constructor(options: { client: RedisPresenceClient; key: string }) {
    this.client = options.client;
    this.key = options.key;
  }

  async touch(member: string, now: number, retentionMs: number): Promise<void> {
    const results = await this.client
      .multi()
      .zadd(this.key, now, member)
      .zremrangebyscore(this.key, '-inf', now - retentionMs)
      .pexpire(this.key, retentionMs)
      .exec();
    if (results === null) {
      throw new InternalServerError({ message: 'Presence transaction was aborted' });
    }
    for (const [error] of results) {
      if (error) {
        throw error;
      }
    }
  }

  async read(since: number): Promise<StoredPresence[]> {
    const flat = await this.client.zrangebyscore(this.key, since, '+inf', 'WITHSCORES');
    const result: StoredPresence[] = [];
    for (let i = 0; i + 1 < flat.length; i += 2) {
      result.push({ member: flat[i], ts: Number(flat[i + 1]) });
    }
    return result;
  }

  async remove(member: string): Promise<void> {
    await this.client.zrem(this.key, member);
  }
}
