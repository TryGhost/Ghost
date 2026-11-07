import { createHash } from 'node:crypto';
import errors from '@tryghost/errors';
import type { NextFunction, Request, Response } from 'express';
import { RateLimiterRes } from 'rate-limiter-flexible';
import type { RateLimiterAbstract } from 'rate-limiter-flexible';

export interface BackoffOptions {
  freeRetries: number;
  minWait: number;
  maxWait: number;
  /** Seconds. Defaults to long enough to reach maxWait. */
  lifetime?: number;
  /** What a request counts against, alongside its IP unless ignoreIP is set. */
  key?: (req: Request) => string | undefined;
  ignoreIP?: boolean;
  /** The error a blocked request fails with. */
  onBlocked: (retryAfterMs: number, res: Response) => Error;
}

/** Builds one rate-limiter-flexible limiter over the shared store. */
export type LimiterFactory = (options: {
  keyPrefix: string;
  points: number;
  duration: number;
}) => RateLimiterAbstract;

/** Waits of minWait, minWait, then each the sum of the two before, capped at maxWait. */
export function backoffDelays(minWait: number, maxWait: number): number[] {
  const delays = [minWait];

  while (delays[delays.length - 1]! < maxWait) {
    delays.push(delays[delays.length - 1]! + (delays[delays.length - 2] ?? 0));
  }
  delays[delays.length - 1] = maxWait;

  return delays;
}

const hashKey = (parts: (string | undefined)[]) =>
  createHash('sha256')
    .update(parts.map((part) => part ?? '').join('\0'))
    .digest('base64url');

/**
 * Backoff rate limiting on rate-limiter-flexible's atomic counters.
 *
 * Each key gets `freeRetries` requests per `lifetime`. After that, every
 * request opens a wait - minWait, minWait, 2x, 3x, 5x... up to maxWait - and
 * the next request is blocked until it ends. Three counters per limiter:
 *
 * - `count` counts requests over a fixed `lifetime` window
 * - `wait` holds one point for the current wait, so only one request can open
 *   it, however many arrive at once
 * - `step` counts opened waits in the current `count` window, so blocked
 *   requests never advance the backoff
 *
 * Both increment in one statement, so concurrent requests cannot both slip
 * under a limit.
 */
export class BackoffLimiter {
  readonly name: string;
  readonly options: BackoffOptions & { lifetime: number };

  private readonly delays: number[];
  private readonly count: RateLimiterAbstract;
  private readonly wait: RateLimiterAbstract;
  private readonly step: RateLimiterAbstract;

  constructor(name: string, factory: LimiterFactory, options: BackoffOptions) {
    // rate-limiter-flexible never expires a duration of 0, so no wait or lifetime may be 0
    const minWait = Math.max(options.minWait, 1);
    const maxWait = Math.max(options.maxWait, 1);
    const delays = backoffDelays(minWait, maxWait);
    const lifetime = Math.max(
      options.lifetime ?? Math.ceil((maxWait / 1000) * (delays.length + options.freeRetries)),
      1,
    );

    this.name = name;
    this.delays = delays;
    this.options = { ...options, minWait, maxWait, lifetime };

    this.count = factory({
      keyPrefix: `${name}:count`,
      points: options.freeRetries,
      duration: lifetime,
    });
    this.wait = factory({
      keyPrefix: `${name}:wait`,
      points: 1,
      duration: maxWait / 1000,
    });
    this.step = factory({
      keyPrefix: `${name}:step`,
      points: 1,
      duration: lifetime,
    });
  }

  readonly middleware = (req: Request, res: Response, next: NextFunction) => {
    this.attempt(this.keyFor(req))
      .then(
        (blockedFor) => (blockedFor === null ? undefined : this.options.onBlocked(blockedFor, res)),
        (err: unknown) =>
          new errors.InternalServerError({
            message: 'Unknown error',
            err: err instanceof Error ? err : undefined,
          }),
      )
      .then(next, next);
  };

  /** Clears the count and wait this request's key has built up. */
  resetRequest(req: Request) {
    return this.clear(this.keyFor(req));
  }

  /** Clears a key's count and wait. `ip` is ignored when the limiter ignores IP. */
  reset({ ip, key }: { ip?: string; key?: string }) {
    return this.clear(hashKey([this.options.ignoreIP ? undefined : ip, key]));
  }

  private keyFor(req: Request) {
    return hashKey([this.options.ignoreIP ? undefined : req.ip, this.options.key?.(req)]);
  }

  /** Milliseconds the request is blocked for, or null when it may continue. */
  private async attempt(key: string): Promise<number | null> {
    // a wait outlives the count window that opened it, so check it first
    const waiting = await this.wait.get(key);
    if (waiting && waiting.msBeforeNext > 0) {
      return waiting.msBeforeNext;
    }

    let windowLeft: number;

    try {
      await this.count.consume(key);
      return null;
    } catch (result) {
      if (!(result instanceof RateLimiterRes)) {
        throw result;
      }
      windowLeft = result.msBeforeNext;
    }

    const step = (await this.step.get(key))?.consumedPoints ?? 0;
    const delay = this.delays[Math.min(step, this.delays.length - 1)]!;

    try {
      await this.wait.consume(key, 1, { customDuration: delay / 1000 });
    } catch (result) {
      if (!(result instanceof RateLimiterRes)) {
        throw result;
      }
      return result.msBeforeNext;
    }

    // only the request that opened the wait advances the backoff, and the
    // steps end with the count window, so a fresh window starts at minWait
    await this.step.penalty(key, 1, { customDuration: Math.max(windowLeft, 1) / 1000 });
    return null;
  }

  private async clear(key: string) {
    await Promise.all([this.count.delete(key), this.wait.delete(key), this.step.delete(key)]);
  }
}
