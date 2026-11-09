import { createHash } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { RateLimiterRes } from 'rate-limiter-flexible';
import type { RateLimiterAbstract } from 'rate-limiter-flexible';

export type FailCallback = (
  req: Request,
  res: Response,
  next: NextFunction,
  nextValidRequestDate: Date,
) => void;

/** What a store failure hands handleStoreError, as express-brute did. */
export type StoreError = {
  message: string;
  req?: Request;
  res?: Response;
  next?: NextFunction;
  parent?: unknown;
};

export interface BackoffOptions {
  freeRetries: number;
  minWait: number;
  maxWait: number;
  /** Seconds. Defaults to express-brute's: long enough to reach maxWait. */
  lifetime?: number;
  attachResetToRequest?: boolean;
  failCallback: FailCallback;
  handleStoreError: (err: StoreError) => void;
}

/** Builds one rate-limiter-flexible limiter over the shared store. */
export type LimiterFactory = (options: {
  keyPrefix: string;
  points: number;
  duration: number;
}) => RateLimiterAbstract;

type KeyCallback = (key?: string) => void;

export interface MiddlewareOptions {
  key?: string | ((req: Request, res: Response, done: KeyCallback) => void);
  ignoreIP?: boolean;
  failCallback?: FailCallback;
}

type Reset = (callback?: (err?: unknown) => void) => void;

/** Express request with the `req.brute.reset` express-brute attached, kept for callers. */
export type BruteRequest = Request & { brute?: { reset: Reset } };

/** express-brute's waits: minWait, minWait, then each the sum of the two before, capped. */
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
 * express-brute's backoff on rate-limiter-flexible's atomic counters.
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
 * under a limit, which express-brute's read-then-write store allowed.
 */
export class BackoffLimiter {
  readonly name: string;
  readonly options: Required<Omit<BackoffOptions, 'lifetime'>> & { lifetime: number };
  readonly prevent: (req: Request, res: Response, next: NextFunction) => void;

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
    this.options = { attachResetToRequest: true, ...options, minWait, maxWait, lifetime };

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

    this.prevent = this.getMiddleware();
  }

  getMiddleware({ key, ignoreIP = false, failCallback }: MiddlewareOptions = {}) {
    const keyFunc =
      typeof key === 'function'
        ? key
        : (_req: Request, _res: Response, done: KeyCallback) => done(key);

    return (req: Request, res: Response, next: NextFunction) => {
      keyFunc(req, res, (requestKey) => {
        const limiterKey = hashKey([ignoreIP ? undefined : req.ip, requestKey]);

        if (this.options.attachResetToRequest) {
          this.attachReset(req, limiterKey);
        }

        this.attempt(limiterKey)
          .then(
            (blockedFor) => {
              if (blockedFor === null) {
                return next();
              }

              (failCallback ?? this.options.failCallback)(
                req,
                res,
                next,
                new Date(Date.now() + blockedFor),
              );
            },
            (err: unknown) => {
              this.options.handleStoreError({
                message: 'Cannot increment request count',
                req,
                res,
                next,
                parent: err,
              });
            },
          )
          .catch((err: unknown) => next(err));
      });
    };
  }

  /** Clears a key's count and wait. `ip` is ignored by limiters that ignore IP. */
  reset(ip: string | undefined | null, key?: string, callback?: (err?: unknown) => void) {
    this.clear(hashKey([ip ?? undefined, key])).then(
      () => callback?.(),
      (err: unknown) => {
        this.options.handleStoreError({ message: 'Cannot reset request count', parent: err });
        callback?.(err);
      },
    );
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

  /** Sets req.brute.reset, chained after any limiter that set it earlier. */
  private attachReset(req: BruteRequest, key: string) {
    const reset: Reset = (callback) => {
      this.clear(key).then(
        () => process.nextTick(() => callback?.()),
        (err: unknown) => process.nextTick(() => callback?.(err)),
      );
    };
    const previous = req.brute?.reset;

    req.brute = {
      reset: previous
        ? (callback?: (err?: unknown) => void) => previous(() => reset(callback))
        : reset,
    };
  }
}
