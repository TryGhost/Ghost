import assert from 'node:assert/strict';
import type { NextFunction, Request, Response } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import {
  BackoffLimiter,
  backoffDelays,
} from '../../../../../../../core/server/web/shared/middleware/api/backoff-limiter';
import type {
  BackoffOptions,
  BruteRequest,
  LimiterFactory,
} from '../../../../../../../core/server/web/shared/middleware/api/backoff-limiter';

const memory: LimiterFactory = (options) => new RateLimiterMemory(options);

type Outcome = { allowed: true } | { allowed: false; waitMs: number };

function build(options: Partial<BackoffOptions> = {}, factory: LimiterFactory = memory) {
  return new BackoffLimiter('test', factory, {
    freeRetries: 2,
    minWait: 1000,
    maxWait: 10000,
    lifetime: 3600,
    failCallback() {},
    handleStoreError() {},
    ...options,
  });
}

/** Runs one request through the middleware and reports whether it got through. */
function request(
  limiter: BackoffLimiter,
  { ip = '127.0.0.1', key = 'key', req = {} as BruteRequest } = {},
): Promise<Outcome> {
  return new Promise((resolve) => {
    Object.assign(req, { ip });
    const middleware = limiter.getMiddleware({
      key,
      failCallback: (_req, _res, _next, nextValidRequestDate) =>
        resolve({ allowed: false, waitMs: nextValidRequestDate.getTime() - Date.now() }),
    });

    middleware(req as Request, {} as Response, (() => resolve({ allowed: true })) as NextFunction);
  });
}

async function run(limiter: BackoffLimiter, times: number, options = {}) {
  const outcomes = [];
  for (let i = 0; i < times; i++) {
    outcomes.push((await request(limiter, options)).allowed);
  }
  return outcomes;
}

describe('BackoffLimiter', function () {
  afterEach(function () {
    vi.useRealTimers();
  });

  it('builds express-brute delays: a Fibonacci run from minWait, capped at maxWait', function () {
    assert.deepEqual(backoffDelays(1000, 10000), [1000, 1000, 2000, 3000, 5000, 8000, 10000]);
    assert.deepEqual(backoffDelays(5, 5), [5]);
  });

  it('defaults lifetime to express-brute’s, long enough to reach maxWait', function () {
    const limiter = build({ lifetime: undefined });

    // 7 delays plus 2 free retries, each up to 10 seconds
    assert.equal(limiter.options.lifetime, 90);
  });

  it('allows freeRetries + 1 requests, then blocks for minWait', async function () {
    const limiter = build();

    assert.deepEqual(await run(limiter, 3), [true, true, true]);

    const blocked = await request(limiter);
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.allowed === false && blocked.waitMs > 900 && blocked.waitMs <= 1000);
  });

  it('grows each wait along the delays, without counting blocked requests', async function () {
    vi.useFakeTimers({ now: 0 });
    const limiter = build();
    const waits = [];

    await run(limiter, 3);
    for (let i = 0; i < 6; i++) {
      const blocked = await request(limiter);
      assert.equal(blocked.allowed, false);
      // a second blocked request must not push the wait further out
      assert.equal((await request(limiter)).allowed, false);

      const waitMs = blocked.allowed === false ? blocked.waitMs : 0;
      waits.push(waitMs);
      vi.advanceTimersByTime(waitMs);
      assert.equal((await request(limiter)).allowed, true);
    }

    assert.deepEqual(waits, [1000, 1000, 2000, 3000, 5000, 8000]);
  });

  it('lets only freeRetries + 1 of a concurrent burst through', async function () {
    const limiter = build({ freeRetries: 4 });

    const outcomes = await Promise.all(Array.from({ length: 20 }, () => request(limiter)));

    assert.equal(outcomes.filter((outcome) => outcome.allowed).length, 5);
  });

  it('keys on IP unless told to ignore it', async function () {
    const limiter = build({ freeRetries: 0 });

    assert.deepEqual(await run(limiter, 2, { ip: '10.0.0.1' }), [true, false]);
    assert.equal((await request(limiter, { ip: '10.0.0.2' })).allowed, true);

    const ignoring = (ip: string) =>
      new Promise<boolean>((resolve) => {
        limiter.getMiddleware({
          key: 'shared',
          ignoreIP: true,
          failCallback: () => resolve(false),
        })({ ip } as Request, {} as Response, (() => resolve(true)) as NextFunction);
      });
    assert.equal(await ignoring('10.0.0.3'), true);
    assert.equal(await ignoring('10.0.0.4'), false);
  });

  it('reset(ip, key) clears the count and the wait', async function () {
    const limiter = build({ freeRetries: 0 });

    await run(limiter, 2);
    await new Promise<void>((resolve) => {
      limiter.reset('127.0.0.1', 'key', () => resolve());
    });

    assert.equal((await request(limiter)).allowed, true);
  });

  it('attaches req.brute.reset, chaining any limiter attached before it', async function () {
    const first = new BackoffLimiter('first', memory, {
      freeRetries: 0,
      minWait: 1000,
      maxWait: 1000,
      failCallback() {},
      handleStoreError() {},
    });
    const second = build({ freeRetries: 0 });
    const req = {} as BruteRequest;

    await request(first, { req });
    await request(second, { req });
    await new Promise<void>((resolve) => {
      req.brute!.reset(() => resolve());
    });

    assert.equal((await request(first)).allowed, true);
    assert.equal((await request(second)).allowed, true);
  });

  it('hands store failures to handleStoreError with the request’s next', async function () {
    const failure = new Error('database gone');
    const broken: LimiterFactory = (options) => {
      const limiter = new RateLimiterMemory(options);
      limiter.consume = () => Promise.reject(failure);
      return limiter;
    };
    const next = vi.fn();

    const err = await new Promise<{ parent?: unknown; next?: unknown }>((resolve) => {
      build({ handleStoreError: resolve }, broken).prevent(
        { ip: '127.0.0.1' } as Request,
        {} as Response,
        next,
      );
    });

    assert.equal(err.parent, failure);
    assert.equal(err.next, next);
    assert.equal(next.mock.calls.length, 0);
  });
});
