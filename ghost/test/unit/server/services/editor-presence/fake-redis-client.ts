import type {
  RedisPresenceClient,
  RedisPresencePipeline,
} from '../../../../../core/server/services/editor-presence/redis-presence-store';

/** In-memory stand-in for the sorted-set commands the store uses. */
export class FakeRedisClient implements RedisPresenceClient {
  readonly sets = new Map<string, Map<string, number>>();
  readonly ttls = new Map<string, number>();
  readonly commands: string[] = [];
  failNext: Error | null = null;
  /** Called when a pipeline is about to run; a test awaits here to hold it back while others run. */
  beforeExec: ((nth: number) => Promise<void> | void) | null = null;
  private pipelines = 0;

  private set(key: string): Map<string, number> {
    let set = this.sets.get(key);
    if (!set) {
      set = new Map();
      this.sets.set(key, set);
    }
    return set;
  }

  pipeline(): RedisPresencePipeline {
    const queue: Array<() => unknown> = [];
    const pipeline: RedisPresencePipeline = {
      zadd: (key: string, ...rest: [number, string] | ['XX', number, string]) => {
        const onlyIfPresent = rest[0] === 'XX';
        const [score, member] = (onlyIfPresent ? rest.slice(1) : rest) as [number, string];
        this.commands.push(onlyIfPresent ? 'zadd xx' : 'zadd');
        queue.push(() => {
          const set = this.set(key);
          if (!onlyIfPresent || set.has(member)) {
            set.set(member, score);
          }
        });
        return pipeline;
      },
      zrem: (key, ...members) => {
        this.commands.push('zrem');
        queue.push(() => {
          const set = this.set(key);
          for (const member of members) {
            set.delete(member);
          }
        });
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
      exec: async () => {
        this.pipelines += 1;
        await this.beforeExec?.(this.pipelines);
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
    return this.range(key, min, max);
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
