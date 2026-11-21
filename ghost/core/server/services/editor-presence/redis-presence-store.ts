import { randomInt } from 'node:crypto';
import { InternalServerError } from '@tryghost/errors';
import {
  documentOf,
  type LeaseTime,
  type PresenceStore,
  type StoredPresence,
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
  zadd(key: string, flag: 'NX' | 'XX', score: number, member: string): RedisPresencePipeline;
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

/** Above any timestamp, and below 2^53 so every number is one a score holds exactly. */
const NUMBER_BASE = 2 ** 52;

/** A tab asking for its document: the element `<member>:<number>`, scored by when it last asked. */
interface Claim {
  element: string;
  member: string;
  document: string;
  number: number;
}

/**
 * The lease set holds claims and locks. A lock is the element
 * `<type>:<resourceId>`, scored by the number of the claim that holds the
 * document. A document is held by the claim its lock names, while that claim
 * is one that was read.
 */
interface Leases {
  locks: Map<string, number>;
  claims: Claim[];
}

function leases(flat: unknown): Leases {
  const found: Leases = { locks: new Map(), claims: [] };
  for (const [element, score] of scored(flat as string[])) {
    const parts = element.split(':').length;
    if (parts === 2) {
      found.locks.set(element, score);
    } else if (parts === 5) {
      const cut = element.lastIndexOf(':');
      const member = element.slice(0, cut);
      found.claims.push({
        element,
        member,
        document: documentOf(member),
        number: Number(element.slice(cut + 1)),
      });
    }
  }
  return found;
}

function holding(found: Leases): Claim[] {
  return found.claims.filter((claim) => found.locks.get(claim.document) === claim.number);
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

  /**
   * Nothing here decides who holds a document from what it read. A free
   * document goes to whichever ZADD NX on its lock Redis runs first, and a
   * lock or claim that lapsed is dropped by its own score, so a write that
   * lands late changes nothing made since it read.
   */
  async hold(
    member: string,
    { now, since, retentionMs }: LeaseTime,
    take = false,
  ): Promise<string[]> {
    const document = documentOf(member);
    let found = await this.live(since);
    // Twice at most: a claim dropped just as it was renewed is made again.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const holder = holding(found).find((claim) => claim.document === document);
      if (holder && holder.member !== member && !take) {
        break;
      }
      const pipeline = this.client.pipeline();
      if (holder?.member === member) {
        // XX: a claim dropped since it was read stays dropped.
        pipeline.zadd(this.leaseKey, 'XX', now, holder.element);
        pipeline.pexpire(this.leaseKey, retentionMs);
      } else {
        const number = NUMBER_BASE + randomInt(2 ** 48 - 1);
        pipeline.zadd(this.leaseKey, now, `${member}:${number}`);
        pipeline.pexpire(this.leaseKey, retentionMs);
        const lapsed = found.locks.get(document);
        if (take) {
          pipeline.zadd(this.leaseKey, number, document);
        } else {
          if (lapsed !== undefined) {
            pipeline.zremrangebyscore(this.leaseKey, lapsed, lapsed);
          }
          pipeline.zadd(this.leaseKey, 'NX', number, document);
        }
      }
      for (const [locked, number] of found.locks) {
        const kept = found.claims.some(
          (claim) => claim.document === locked && claim.number === number,
        );
        if (locked !== document && !kept) {
          pipeline.zremrangebyscore(this.leaseKey, number, number);
        }
      }
      const results = settled(
        await pipeline
          .zremrangebyscore(this.leaseKey, '-inf', since - 1)
          .zrangebyscore(this.leaseKey, since, '+inf', 'WITHSCORES')
          .exec(),
      );
      found = leases(results[results.length - 1][1]);
      if (holding(found).some((claim) => claim.document === document)) {
        break;
      }
    }
    return holding(found).map((claim) => claim.member);
  }

  async holders(since: number): Promise<string[]> {
    return holding(await this.live(since)).map((claim) => claim.member);
  }

  async release(member: string): Promise<void> {
    const flat = await this.client.zrangebyscore(this.leaseKey, '-inf', '+inf', 'WITHSCORES');
    const own = leases(flat).claims.filter((claim) => claim.member === member);
    if (own.length === 0) {
      return;
    }
    const pipeline = this.client.pipeline();
    for (const { number } of own) {
      // The lock goes only while it still names this claim.
      pipeline.zremrangebyscore(this.leaseKey, number, number);
    }
    settled(await pipeline.zrem(this.leaseKey, ...own.map((claim) => claim.element)).exec());
  }

  /** Locks, and the claims that have not lapsed. A lock's score is above every time, so it is always read. */
  private async live(since: number): Promise<Leases> {
    return leases(await this.client.zrangebyscore(this.leaseKey, since, '+inf', 'WITHSCORES'));
  }
}
