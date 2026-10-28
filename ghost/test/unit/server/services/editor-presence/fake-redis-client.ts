import type {
  RedisPresenceClient,
  RedisPresenceTransaction,
} from '../../../../../core/server/services/editor-presence/redis-presence-store';

/** In-memory stand-in for the sorted-set commands the store uses. */
export class FakeRedisClient implements RedisPresenceClient {
  readonly sets = new Map<string, Map<string, number>>();
  readonly ttls = new Map<string, number>();
  failNext: Error | null = null;

  private set(key: string): Map<string, number> {
    let set = this.sets.get(key);
    if (!set) {
      set = new Map();
      this.sets.set(key, set);
    }
    return set;
  }

  multi(): RedisPresenceTransaction {
    const queue: Array<() => unknown> = [];
    const transaction: RedisPresenceTransaction = {
      zadd: (key, score, member) => {
        queue.push(() => this.set(key).set(member, score));
        return transaction;
      },
      zremrangebyscore: (key, min, max) => {
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
        return transaction;
      },
      pexpire: (key, milliseconds) => {
        queue.push(() => this.ttls.set(key, milliseconds));
        return transaction;
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
    return transaction;
  }

  async zrangebyscore(
    key: string,
    min: number | string,
    max: number | string,
    _withScores: 'WITHSCORES',
  ): Promise<string[]> {
    if (this.failNext) {
      const error = this.failNext;
      this.failNext = null;
      throw error;
    }
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
