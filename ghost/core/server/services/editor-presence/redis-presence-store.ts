import { InternalServerError } from '@tryghost/errors';
import type { PresenceStore, StoredPresence } from './presence-store';

type ExecResult = Array<[Error | null, unknown]> | null;

/** The slice of an ioredis client the store uses; ioredis is not a direct dependency here. */
export interface RedisPresenceClient {
  pipeline(): RedisPresencePipeline;
  zrem(key: string, ...members: string[]): Promise<number>;
}

export interface RedisPresencePipeline {
  zadd(key: string, score: number, member: string): RedisPresencePipeline;
  pexpire(key: string, milliseconds: number): RedisPresencePipeline;
  zremrangebyscore(key: string, min: number | string, max: number | string): RedisPresencePipeline;
  zrangebyscore(
    key: string,
    min: number | string,
    max: number | string,
    withScores: 'WITHSCORES',
  ): RedisPresencePipeline;
  ttl(key: string): RedisPresencePipeline;
  exec(): Promise<ExecResult>;
}

export interface RedisPresenceStoreOptions {
  client: RedisPresenceClient;
  key: string;
  /** Called when a read found the key without an expiry and set one. */
  onTtlRepaired?: () => void;
}

function unwrap(results: ExecResult): unknown[] {
  if (results === null) {
    throw new InternalServerError({ message: 'Presence pipeline returned no results' });
  }
  return results.map(([error, value]) => {
    if (error) {
      throw error;
    }
    return value;
  });
}

export class RedisPresenceStore implements PresenceStore {
  readonly kind = 'redis';
  readonly key: string;
  private readonly client: RedisPresenceClient;
  private readonly onTtlRepaired?: () => void;

  constructor(options: RedisPresenceStoreOptions) {
    this.client = options.client;
    this.key = options.key;
    this.onTtlRepaired = options.onTtlRepaired;
  }

  /** PEXPIRE must directly follow ZADD so a new key never lacks a TTL; no MULTI, the commands commute. */
  async touch(member: string, now: number, retentionMs: number): Promise<void> {
    unwrap(
      await this.client
        .pipeline()
        .zadd(this.key, now, member)
        .pexpire(this.key, retentionMs)
        .zremrangebyscore(this.key, '-inf', now - retentionMs)
        .exec(),
    );
  }

  /** Under volatile-lru a key without an expiry is never evicted, so a read repairs one it finds. */
  async read(since: number, retentionMs: number): Promise<StoredPresence[]> {
    const [flat, ttl] = unwrap(
      await this.client
        .pipeline()
        .zrangebyscore(this.key, since, '+inf', 'WITHSCORES')
        .ttl(this.key)
        .exec(),
    ) as [string[], number];
    if (ttl === -1) {
      unwrap(await this.client.pipeline().pexpire(this.key, retentionMs).exec());
      this.onTtlRepaired?.();
    }
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
