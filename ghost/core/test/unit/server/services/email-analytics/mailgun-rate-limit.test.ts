import assert from 'node:assert/strict';
import sinon from 'sinon';
import {
  MailgunRateLimit,
  parseMailgunRateLimit,
} from '../../../../../core/server/services/email-analytics/mailgun-rate-limit';

describe('Mailgun polling rate limits', () => {
  afterEach(() => sinon.restore());

  it('retains the final reset after retry exhaustion for later polling cycles', async () => {
    const clock = sinon.useFakeTimers({ now: 0 });
    sinon.stub(Math, 'random').returns(0);
    const limiter = new MailgunRateLimit();
    let calls = 0;
    const failed = assert.rejects(
      limiter.run(async () => {
        calls += 1;
        throw Object.assign(new Error('Rate limited'), {
          status: 429,
          rateLimit: calls === 4 ? { resetAt: 60000 } : undefined,
        });
      }),
      /Rate limited/,
    );
    await clock.tickAsync(7000);
    await failed;
    const nextRead = sinon.stub().resolves({ value: 'next' });
    await assert.rejects(limiter.run(nextRead), /polling budget/);
    sinon.assert.notCalled(nextRead);
    await clock.tickAsync(53000);
    assert.equal(await limiter.run(nextRead), 'next');
  });

  it('rechecks a shared reset extended by another in-flight response while waiting', async () => {
    const clock = sinon.useFakeTimers({ now: 0 });
    sinon.stub(Math, 'random').returns(0);
    const limiter = new MailgunRateLimit();
    let finish!: (value: {
      value: string;
      rateLimit: { remaining: number; resetAt: number };
    }) => void;
    const inFlight = limiter.run<string>(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await limiter.run(async () => ({ value: 'quota', rateLimit: { remaining: 0, resetAt: 5000 } }));
    const requestedAt: number[] = [];
    const waiting = limiter.run(async () => {
      requestedAt.push(Date.now());
      return { value: 'next' };
    });
    await clock.tickAsync(1000);
    finish({ value: 'late response', rateLimit: { remaining: 0, resetAt: 10000 } });
    await inFlight;
    await clock.tickAsync(8999);
    assert.deepEqual(requestedAt, []);
    await clock.tickAsync(1);
    assert.equal(await waiting, 'next');
    assert.deepEqual(requestedAt, [10000]);
  });

  it('does not retry errors other than HTTP 429', async () => {
    const limiter = new MailgunRateLimit();
    const failure = Object.assign(new Error('Unavailable'), { status: 503 });
    let calls = 0;
    await assert.rejects(
      limiter.run(async () => {
        calls += 1;
        throw failure;
      }),
      (error) => error === failure,
    );
    assert.equal(calls, 1);
  });

  it('honors the later of Retry-After and the quota reset', async () => {
    const clock = sinon.useFakeTimers({ now: 0 });
    sinon.stub(Math, 'random').returns(0);
    const limiter = new MailgunRateLimit();
    let calls = 0;
    const result = limiter.run(async () => {
      calls += 1;
      if (calls === 1) {
        throw Object.assign(new Error('Rate limited'), {
          status: 429,
          rateLimit: { resetAt: 3000, retryAt: 7000 },
        });
      }
      return { value: 'page' };
    });
    await clock.tickAsync(6999);
    assert.equal(calls, 1);
    await clock.tickAsync(1);
    assert.equal(await result, 'page');
  });

  it.each(['before', 'during'])(
    'cancels %s a backoff without another request or a live timer',
    async (when) => {
      const clock = sinon.useFakeTimers({ now: 0 });
      const controller = new AbortController();
      const limiter = new MailgunRateLimit();
      if (when === 'before') {
        controller.abort();
      }
      let calls = 0;
      let failure: unknown;
      const result = limiter
        .run(async () => {
          calls += 1;
          throw Object.assign(new Error('Rate limited'), {
            status: 429,
            rateLimit: { resetAt: 20000 },
          });
        }, controller.signal)
        .catch((error) => {
          failure = error;
        });
      await clock.tickAsync(0);
      controller.abort();
      await clock.tickAsync(0);
      assert.ok(failure instanceof Error);
      assert.equal(failure.message, 'Fetching canceled');
      assert.equal(calls, when === 'before' ? 0 : 1);
      assert.equal(clock.countTimers(), 0);
      await result;
    },
  );

  it('stops instead of retrying early when provider waits exceed the total backoff budget', async () => {
    const clock = sinon.useFakeTimers({ now: 0 });
    sinon.stub(Math, 'random').returns(0);
    const limiter = new MailgunRateLimit();
    const requestedAt: number[] = [];
    let failure: unknown;
    const result = limiter
      .run(async () => {
        requestedAt.push(Date.now());
        throw Object.assign(new Error('Rate limited'), {
          status: 429,
          rateLimit: { resetAt: Date.now() + 20000 },
        });
      })
      .catch((error) => {
        failure = error;
      });
    await clock.tickAsync(30000);
    assert.deepEqual(requestedAt, [0, 20000]);
    assert.ok(failure instanceof Error && 'code' in failure);
    assert.equal(failure.code, 'MAILGUN_RATE_LIMIT_WAIT_EXCEEDED');
    await result;
  });

  it('applies exhausted-quota headers from a successful response to the next page', async () => {
    const clock = sinon.useFakeTimers({ now: 0 });
    sinon.stub(Math, 'random').returns(0);
    const limiter = new MailgunRateLimit();
    await limiter.run(async () => ({ value: 'first', rateLimit: { remaining: 0, resetAt: 5000 } }));
    const requestedAt: number[] = [];
    const next = limiter.run(async () => {
      requestedAt.push(Date.now());
      return { value: 'next' };
    });
    await clock.tickAsync(4999);
    assert.deepEqual(requestedAt, []);
    await clock.tickAsync(1);
    assert.equal(await next, 'next');
    assert.deepEqual(requestedAt, [5000]);
  });

  it('bounds retries with exponential backoff and preserves the final error', async () => {
    const clock = sinon.useFakeTimers({ now: 0 });
    sinon.stub(Math, 'random').returns(0);
    const limiter = new MailgunRateLimit();
    const requestedAt: number[] = [];
    const failure = Object.assign(new Error('Rate limited'), { status: 429 });
    const result = limiter.run(async () => {
      requestedAt.push(Date.now());
      throw failure;
    });
    const rejected = assert.rejects(result, (error) => error === failure);
    await clock.tickAsync(7000);
    assert.deepEqual(requestedAt, [0, 1000, 3000, 7000]);
    await rejected;
  });

  it('spreads readers waking from a shared cooldown with up to one second of jitter', async () => {
    const clock = sinon.useFakeTimers({ now: 0 });
    sinon.stub(Math, 'random').returns(1);
    const limiter = new MailgunRateLimit();
    await limiter.run(async () => ({ value: 'first', rateLimit: { remaining: 0, resetAt: 5000 } }));
    const requestedAt: number[] = [];
    const next = limiter.run(async () => {
      requestedAt.push(Date.now());
      return { value: 'next' };
    });
    await clock.tickAsync(5999);
    assert.deepEqual(requestedAt, []);
    await clock.tickAsync(1);
    assert.equal(await next, 'next');
    assert.deepEqual(requestedAt, [6000]);
  });

  it('bounds a provider hint far in the future to one hour of cooldown', async () => {
    const clock = sinon.useFakeTimers({ now: 0 });
    sinon.stub(Math, 'random').returns(0);
    const limiter = new MailgunRateLimit();
    const failed = assert.rejects(
      limiter.run(async () => {
        throw Object.assign(new Error('Rate limited'), {
          status: 429,
          rateLimit: { retryAt: 7 * 24 * 60 * 60 * 1000 },
        });
      }),
      /polling budget/,
    );
    await clock.tickAsync(0);
    await failed;
    const nextRead = sinon.stub().resolves({ value: 'next' });
    // A minute before the bounded cooldown ends the wait still exceeds the budget
    await clock.tickAsync(59 * 60 * 1000);
    await assert.rejects(limiter.run(nextRead), /polling budget/);
    sinon.assert.notCalled(nextRead);
    await clock.tickAsync(60 * 1000);
    assert.equal(await limiter.run(nextRead), 'next');
  });

  it('reads a quota reset expressed in seconds as well as milliseconds', () => {
    assert.deepEqual(parseMailgunRateLimit({ 'x-ratelimit-reset': '1700000000' }), {
      resetAt: 1700000000000,
    });
    assert.deepEqual(parseMailgunRateLimit({ 'x-ratelimit-reset': '1700000000000' }), {
      resetAt: 1700000000000,
    });
  });

  it('waits until the provider reset before retrying a rate-limited page', async () => {
    const clock = sinon.useFakeTimers({ now: new Date('2026-09-01T12:00:00Z') });
    sinon.stub(Math, 'random').returns(0);
    const limiter = new MailgunRateLimit();
    const requestedAt: number[] = [];
    const start = Date.now();
    const result = limiter.run(async () => {
      requestedAt.push(Date.now());
      if (requestedAt.length === 1) {
        throw Object.assign(new Error('Rate limited'), {
          status: 429,
          rateLimit: { resetAt: start + 5000 },
        });
      }
      return { value: 'page' };
    });
    await clock.tickAsync(4999);
    assert.deepEqual(requestedAt, [start]);
    await clock.tickAsync(1);
    assert.equal(await result, 'page');
    assert.deepEqual(requestedAt, [start, start + 5000]);
  });
});
