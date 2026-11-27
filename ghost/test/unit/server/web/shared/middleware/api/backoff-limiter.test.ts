import { setTimeout as sleep } from 'node:timers/promises';
import assert from 'node:assert/strict';
import type { NextFunction, Request, Response } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import {
  BackoffLimiter,
  backoffDelays,
  normalizeIP,
} from '../../../../../../../core/server/web/shared/middleware/api/backoff-limiter';
import type {
  BackoffOptions,
  LimiterFactory,
} from '../../../../../../../core/server/web/shared/middleware/api/backoff-limiter';

const memory: LimiterFactory = (options) => new RateLimiterMemory(options);

class Blocked extends Error {
  readonly waitMs: number;

  constructor(waitMs: number) {
    super('blocked');
    this.waitMs = waitMs;
  }
}

type Outcome = { allowed: true } | { allowed: false; waitMs: number };

function build(options: Partial<BackoffOptions> = {}, factory: LimiterFactory = memory) {
  return new BackoffLimiter('test', factory, {
    freeRetries: 2,
    minWait: 1000,
    maxWait: 10000,
    lifetime: 3600,
    key: (req) => req.body?.key,
    onBlocked: (waitMs) => new Blocked(waitMs),
    ...options,
  });
}

/** Runs one request through the middleware and reports whether it got through. */
function request(
  limiter: BackoffLimiter,
  { ip = '127.0.0.1', key = 'key' } = {},
): Promise<Outcome> {
  return new Promise((resolve, reject) => {
    const req = { ip, body: { key } } as Request;

    limiter.middleware(
      req,
      {} as Response,
      ((err?: unknown) => {
        if (!err) {
          return resolve({ allowed: true });
        }
        return err instanceof Blocked
          ? resolve({ allowed: false, waitMs: err.waitMs })
          : reject(err);
      }) as NextFunction,
    );
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

  it('builds delays as a Fibonacci run from minWait, capped at maxWait', function () {
    assert.deepEqual(backoffDelays(1000, 10000), [1000, 1000, 2000, 3000, 5000, 8000, 10000]);
    assert.deepEqual(backoffDelays(5, 5), [5]);
  });

  it('defaults lifetime to the sum of every wait', function () {
    const limiter = build({ lifetime: undefined });

    // 1 + 1 + 2 + 3 + 5 + 8 + 10 seconds
    assert.equal(limiter.options.lifetime, 30);
  });

  it('keeps the default count window open long enough to reach maxWait', async function () {
    vi.useFakeTimers({ now: 0 });
    const limiter = build({ freeRetries: 0, lifetime: undefined });

    // climb each wait as soon as the last ends; the last one opened should be maxWait
    let lastWait = 0;
    for (let i = 0; i < 7; i++) {
      assert.equal((await request(limiter)).allowed, true);
      const blocked = await request(limiter);
      assert.ok(blocked.allowed === false);
      lastWait = blocked.waitMs;
      vi.advanceTimersByTime(lastWait);
    }
    assert.equal(lastWait, 10000);
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

  it('keeps blocking through a wait that outlasts the count window', async function () {
    vi.useFakeTimers({ now: 0 });
    const limiter = build({ freeRetries: 2, minWait: 10000, maxWait: 10000, lifetime: 1 });

    assert.deepEqual(await run(limiter, 3), [true, true, true]);
    assert.equal((await request(limiter)).allowed, false);

    vi.advanceTimersByTime(2000);
    const blocked = await request(limiter);
    assert.ok(blocked.allowed === false && blocked.waitMs <= 8000, JSON.stringify(blocked));

    vi.advanceTimersByTime(8000);
    assert.equal((await request(limiter)).allowed, true);
  });

  it('starts each count window back at minWait', async function () {
    vi.useFakeTimers({ now: 0 });
    const limiter = build({ freeRetries: 1, minWait: 1000, maxWait: 10000, lifetime: 30 });
    const firstWait = async () => {
      await run(limiter, 2);
      const blocked = await request(limiter);
      return blocked.allowed === false ? blocked.waitMs : 0;
    };

    // open the first wait 20s into the window, then climb the backoff
    await run(limiter, 1);
    vi.advanceTimersByTime(20000);
    await run(limiter, 1);
    assert.equal((await request(limiter)).allowed, false);
    for (const wait of [1000, 1000, 2000]) {
      vi.advanceTimersByTime(wait);
      await run(limiter, 1);
    }

    // the window ended at 30s; the steps must not carry into the next one
    vi.advanceTimersByTime(30000 - vi.getMockedSystemTime()!.getTime() + 3000);
    assert.equal(await firstWait(), 1000);
  });

  it('lets only freeRetries + 1 of a concurrent burst through', async function () {
    const limiter = build({ freeRetries: 4 });

    const outcomes = await Promise.all(Array.from({ length: 20 }, () => request(limiter)));

    assert.equal(outcomes.filter((outcome) => outcome.allowed).length, 5);
  });

  it('opens the first wait at minWait when a burst reaches the store out of order', async function () {
    // the later a request arrives, the sooner its wait is checked
    let calls = 0;
    const reordered: LimiterFactory = (options) => {
      const limiter = new RateLimiterMemory(options);
      if (options.keyPrefix?.endsWith(':wait')) {
        const consume = limiter.consume.bind(limiter);
        limiter.consume = async (...args) => {
          calls += 1;
          await sleep(50 - calls);
          return consume(...args);
        };
      }
      return limiter;
    };
    const limiter = build({ freeRetries: 4, minWait: 1000, maxWait: 60000 }, reordered);

    const outcomes = await Promise.all(Array.from({ length: 50 }, () => request(limiter)));

    for (const outcome of outcomes) {
      assert.ok(outcome.allowed || outcome.waitMs <= 1000, `waited ${JSON.stringify(outcome)}`);
    }
  });

  it('clamps a maxWait of 0 so waits still expire', function () {
    const limiter = build({ minWait: 0, maxWait: 0 });

    assert.equal(limiter.options.maxWait, 1);
    assert.ok(limiter.options.lifetime >= 1);
  });

  it('keys on the request key and IP', async function () {
    const limiter = build({ freeRetries: 0 });

    assert.deepEqual(await run(limiter, 2, { ip: '10.0.0.1' }), [true, false]);
    assert.equal((await request(limiter, { ip: '10.0.0.2' })).allowed, true);
    assert.equal((await request(limiter, { ip: '10.0.0.1', key: 'other' })).allowed, true);
  });

  it('keys on the request key alone when told to ignore IP', async function () {
    const limiter = build({ freeRetries: 0, ignoreIP: true });

    assert.equal((await request(limiter, { ip: '10.0.0.1' })).allowed, true);
    assert.equal((await request(limiter, { ip: '10.0.0.2' })).allowed, false);
  });

  it('reset({ip, key}) clears the count and the wait', async function () {
    const limiter = build({ freeRetries: 0 });

    await run(limiter, 2);
    await limiter.reset({ ip: '127.0.0.1', key: 'key' });

    assert.equal((await request(limiter)).allowed, true);
  });

  it('reset ignores ip on a limiter that ignores IP', async function () {
    const limiter = build({ freeRetries: 0, ignoreIP: true });

    await run(limiter, 2);
    await limiter.reset({ ip: '10.9.9.9', key: 'key' });

    assert.equal((await request(limiter)).allowed, true);
  });

  it('resetRequest(req) clears the key the request counted against', async function () {
    const limiter = build({ freeRetries: 0 });

    await run(limiter, 2);
    await limiter.resetRequest({ ip: '127.0.0.1', body: { key: 'key' } } as Request);

    assert.equal((await request(limiter)).allowed, true);
  });

  it('consume({ip, key}) allows freeRetries + 1 requests, then reports the wait', async function () {
    vi.useFakeTimers({ now: 0 });
    const limiter = build();
    const outcomes = [];

    for (let i = 0; i < 4; i++) {
      outcomes.push(await limiter.consume({ ip: '127.0.0.1', key: 'key' }));
    }

    assert.deepEqual(outcomes, [
      { allowed: true },
      { allowed: true },
      { allowed: true },
      { allowed: false, retryAfterMs: 1000 },
    ]);
  });

  it('consume shares counters with middleware for the same IP and key', async function () {
    const limiter = build({ freeRetries: 1 });

    assert.deepEqual(await run(limiter, 2), [true, true]);
    assert.equal((await limiter.consume({ ip: '127.0.0.1', key: 'key' })).allowed, false);

    const other = build({ freeRetries: 1 });
    await other.consume({ ip: '127.0.0.1', key: 'key' });
    await other.consume({ ip: '127.0.0.1', key: 'key' });
    assert.equal((await request(other)).allowed, false);
  });

  it('consume ignores ip on a limiter that ignores IP', async function () {
    const limiter = build({ freeRetries: 0, ignoreIP: true });

    assert.equal((await limiter.consume({ ip: '10.0.0.1', key: 'key' })).allowed, true);
    assert.equal((await limiter.consume({ ip: '10.0.0.2', key: 'key' })).allowed, false);
  });

  it('counts every spelling of an IP against one key', async function () {
    const limiter = build({ freeRetries: 1 });

    await request(limiter, { ip: '2001:DB8::1' });
    await limiter.consume({ ip: '2001:0db8:0000:0000:0000:0000:0000:0001', key: 'key' });
    assert.equal((await request(limiter, { ip: '2001:db8:0:0:0:0:0:1' })).allowed, false);

    await request(limiter, { ip: '::ffff:10.0.0.1' });
    await limiter.consume({ ip: '10.0.0.1', key: 'key' });
    assert.equal((await request(limiter, { ip: '::ffff:a00:1' })).allowed, false);
  });

  it('counts an IPv6 /64 as one client', async function () {
    const limiter = build({ freeRetries: 0 });

    assert.equal((await request(limiter, { ip: '2001:db8:1:2::1' })).allowed, true);
    assert.equal((await request(limiter, { ip: '2001:db8:1:2:ffff::9' })).allowed, false);
    assert.equal((await request(limiter, { ip: '2001:db8:1:3::1' })).allowed, true);
  });

  it('normalizes IPs the way Better Auth does with a /64 IPv6 subnet', function () {
    assert.equal(normalizeIP('203.0.113.7'), '203.0.113.7');
    assert.equal(normalizeIP('2001:DB8::1'), '2001:0db8:0000:0000:0000:0000:0000:0000');
    assert.equal(normalizeIP('::1'), '0000:0000:0000:0000:0000:0000:0000:0000');
    assert.equal(normalizeIP('::'), '0000:0000:0000:0000:0000:0000:0000:0000');
    assert.equal(normalizeIP('2001:db8:1:2:3:4:5:6'), '2001:0db8:0001:0002:0000:0000:0000:0000');
    assert.equal(normalizeIP('::ffff:203.0.113.7'), '203.0.113.7');
    assert.equal(normalizeIP('0:0:0:0:0:ffff:203.0.113.7'), '203.0.113.7');
    assert.equal(normalizeIP('::ffff:cb00:7107'), '203.0.113.7');
    assert.equal(normalizeIP('64:ff9b::203.0.113.7'), '0064:ff9b:0000:0000:0000:0000:0000:0000');
    assert.equal(normalizeIP('not an ip'), 'not an ip');
  });

  it('fails the request with an InternalServerError when the store fails', async function () {
    const failure = new Error('database gone');
    const broken: LimiterFactory = (options) => {
      const limiter = new RateLimiterMemory(options);
      limiter.consume = () => Promise.reject(failure);
      return limiter;
    };

    const err = await new Promise<{ errorType?: string; stack?: string }>((resolve) => {
      build({}, broken).middleware(
        { ip: '127.0.0.1' } as Request,
        {} as Response,
        resolve as NextFunction,
      );
    });

    assert.equal(err.errorType, 'InternalServerError');
    // GhostError keeps the cause's stack
    assert.match(err.stack ?? '', /database gone/);
  });

  it('retries a store call once when MySQL picks it as a deadlock victim', async function () {
    let deadlocks = 0;
    const deadlocking: LimiterFactory = (options) => {
      const limiter = new RateLimiterMemory(options);
      const consume = limiter.consume.bind(limiter);
      limiter.consume = (...args) => {
        if (deadlocks < 1) {
          deadlocks += 1;
          return Promise.reject(
            Object.assign(new Error('Deadlock found'), { code: 'ER_LOCK_DEADLOCK' }),
          );
        }
        return consume(...args);
      };
      return limiter;
    };
    const limiter = build({ freeRetries: 0 }, deadlocking);

    assert.deepEqual(await request(limiter), { allowed: true });
    assert.equal(deadlocks, 1);
    // the retried consume counted, so the next request opens a wait
    assert.equal((await request(limiter)).allowed, false);
  });

  it('fails the request when the retry deadlocks too', async function () {
    const deadlock = Object.assign(new Error('Deadlock found'), { code: 'ER_LOCK_DEADLOCK' });
    let calls = 0;
    const deadlocking: LimiterFactory = (options) => {
      const limiter = new RateLimiterMemory(options);
      limiter.consume = () => {
        calls += 1;
        return Promise.reject(deadlock);
      };
      return limiter;
    };

    const err = await new Promise<{ errorType?: string }>((resolve) => {
      build({}, deadlocking).middleware(
        { ip: '127.0.0.1' } as Request,
        {} as Response,
        resolve as NextFunction,
      );
    });

    assert.equal(err.errorType, 'InternalServerError');
    assert.equal(calls, 2);
  });

  it('passes an error thrown by onBlocked to next', async function () {
    const failure = new Error('onBlocked failed');
    const limiter = build({
      freeRetries: 0,
      onBlocked: () => {
        throw failure;
      },
    });

    await request(limiter);
    await assert.rejects(request(limiter), (thrown) => thrown === failure);
  });

  it('treats a lifetime of 0 as 1 second rather than never expiring', function () {
    assert.equal(build({ lifetime: 0 }).options.lifetime, 1);
  });
});
