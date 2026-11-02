import type {
  RedisPresenceClient,
  RedisPresencePipeline,
} from '../../../../../core/server/services/editor-presence/redis-presence-store';

/** In-memory stand-in for the sorted-set commands the store uses. */
export class FakeRedisClient implements RedisPresenceClient {
  readonly sets = new Map<string, Map<string, number>>();
  /** Expiry per key in milliseconds; absent means no expiry, as Redis reports with TTL -1. */
  readonly ttls = new Map<string, number>();
  readonly commands: string[] = [];
  failNext: Error | null = null;

  private set(key: string): Map<string, number> {
    let set = this.sets.get(key);
    if (!set) {
      set = new Map();
      this.sets.set(key, set);
    }
    return set;
  }

  private range(key: string, min: number | string, max: number | string): string[] {
    const lower = min === '-inf' ? -Infinity : Number(min);
    const upper = max === '+inf' ? Infinity : Number(max);
    const flat: string[] = [];
    for (const [member, score] of [...this.set(key)].sort((a, b) => a[1] - b[1])) {
      if (score >= lower && score <= upper) {
        flat.push(member, String(score));
      }
    }
    return flat;
  }

  pipeline(): RedisPresencePipeline {
    const queue: Array<() => unknown> = [];
    const pipeline: RedisPresencePipeline = {
      zadd: (key, score, member) => {
        this.commands.push('zadd');
        queue.push(() => this.set(key).set(member, score));
        return pipeline;
      },
      pexpire: (key, milliseconds) => {
        this.commands.push('pexpire');
        queue.push(() => this.ttls.set(key, milliseconds));
        return pipeline;
      },
      zremrangebyscore: (key, min, max) => {
        this.commands.push('zremrangebyscore');
        queue.push(() => {
          const set = this.set(key);
          const lower = min === '-inf' ? -Infinity : Number(min);
          const upper = max === '+inf' ? Infinity : Number(max);
          for (const [member, score] of set) {
            if (score >= lower && score <= upper) {
              set.delete(member);
            }
          }
        });
        return pipeline;
      },
      zrangebyscore: (key, min, max) => {
        this.commands.push('zrangebyscore');
        queue.push(() => this.range(key, min, max));
        return pipeline;
      },
      ttl: (key) => {
        this.commands.push('ttl');
        queue.push(() => {
          if (this.set(key).size === 0) {
            return -2;
          }
          const ms = this.ttls.get(key);
          return ms === undefined ? -1 : Math.ceil(ms / 1000);
        });
        return pipeline;
      },
      exec: async () => {
        if (this.failNext) {
          const error = this.failNext;
          this.failNext = null;
          return [[error, null]];
        }
        return queue.map((command) => [null, command()] as [Error | null, unknown]);
      },
    };
    return pipeline;
  }

  async zrem(key: string, ...members: string[]): Promise<number> {
    const set = this.set(key);
    let removed = 0;
    for (const member of members) {
      if (set.delete(member)) {
        removed += 1;
      }
    }
    return removed;
  }
}
