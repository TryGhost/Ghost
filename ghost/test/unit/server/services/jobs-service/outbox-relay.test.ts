import assert from 'node:assert/strict';
import { describe, it, afterEach, beforeEach, vi } from 'vitest';
import { OutboxRelay } from '../../../../../core/server/services/jobs-service/outbox-relay';
import type { ProcessOutcome } from '../../../../../core/server/services/jobs-service/jobs-outbox';

const silentLogger = { error() {}, info() {}, warn() {} };

// A store that never has rows and holds each claim open until the test lets
// it finish, so a test can choose when a wake-up lands relative to a drain.
function makeStore() {
  const claims: PromiseWithResolvers<ProcessOutcome>[] = [];
  let claimed = Promise.withResolvers<void>();
  return {
    claims,
    async nextClaim(): Promise<PromiseWithResolvers<ProcessOutcome>> {
      await claimed.promise;
      claimed = Promise.withResolvers<void>();
      return claims[claims.length - 1];
    },
    processNext(): Promise<ProcessOutcome> {
      const claim = Promise.withResolvers<ProcessOutcome>();
      claims.push(claim);
      claimed.resolve();
      return claim.promise;
    },
  };
}

function within<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_resolve, reject) => {
      setTimeout(() => reject(new Error(`timed out waiting for ${what}`)), ms);
    }),
  ]);
}

describe('OutboxRelay', function () {
  let relay: OutboxRelay | undefined;
  let store: ReturnType<typeof makeStore> | undefined;

  afterEach(async function () {
    const stopped = relay?.stop();
    // stop() waits out the drain, so let the claim it is held on finish
    for (const claim of store?.claims ?? []) {
      claim.resolve({ status: 'idle' });
    }
    await stopped;
    relay = undefined;
    store = undefined;
  });

  function startRelay(scripted: ReturnType<typeof makeStore>, { retryDelayMs = 1000 } = {}) {
    store = scripted;
    relay = new OutboxRelay({
      outbox: scripted,
      backend: { enqueue: async () => {} },
      logging: silentLogger,
      pollIntervalMs: 60_000,
      submissionTimeoutMs: 1000,
      retryDelayMs,
    });
    relay.start();
    return relay;
  }

  it('leaves a job type this process has no handler for in the outbox', async function () {
    const enqueued: string[] = [];
    const refused = Promise.withResolvers<unknown>();
    let claimed = false;
    relay = new OutboxRelay({
      outbox: {
        async processNext(submit): Promise<ProcessOutcome> {
          if (claimed) {
            return { status: 'idle' };
          }
          claimed = true;
          try {
            await submit('dispatch-1', {
              version: 1,
              payload: { job: { type: 'from-a-newer-version', payload: '{}' } },
            });
          } catch (error) {
            refused.resolve(error);
            return { status: 'failed', id: 'dispatch-1', error };
          }
          refused.resolve(undefined);
          return { status: 'idle' };
        },
      },
      backend: {
        enqueue: async (id) => {
          enqueued.push(id);
        },
      },
      handles: (type) => type === 'greet',
      logging: silentLogger,
      pollIntervalMs: 60_000,
      submissionTimeoutMs: 1000,
      retryDelayMs: 1000,
    });
    relay.start();

    const error = await within(refused.promise, 500, 'the hand-off to be refused');

    assert.match(String((error as Error)?.message), /No handler registered/);
    assert.deepEqual(enqueued, [], 'the backend never sees the job');
  });

  it('drains again at once when woken while it sleeps', async function () {
    const scripted = makeStore();
    const started = startRelay(scripted);
    (await scripted.nextClaim()).resolve({ status: 'idle' });

    started.wake();

    await within(scripted.nextClaim(), 500, 'a drain after the wake-up');
  });

  it('does not lose a wake-up that lands while it drains', async function () {
    const scripted = makeStore();
    const started = startRelay(scripted);
    const claim = await scripted.nextClaim();

    started.wake();
    claim.resolve({ status: 'idle' });

    await within(scripted.nextClaim(), 500, 'a drain after the wake-up');
  });

  it('goes back to waiting for the poll after a wake-up', async function () {
    const scripted = makeStore();
    const started = startRelay(scripted);
    (await scripted.nextClaim()).resolve({ status: 'idle' });
    started.wake();
    (await scripted.nextClaim()).resolve({ status: 'idle' });

    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });

    assert.equal(scripted.claims.length, 2);
  });

  it('waits for the poll when nothing wakes it', async function () {
    const scripted = makeStore();
    startRelay(scripted);
    (await scripted.nextClaim()).resolve({ status: 'idle' });

    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });

    assert.equal(scripted.claims.length, 1);
  });

  describe('retries', function () {
    const RETRY_MS = 1000;
    const failed = (id: string): ProcessOutcome => ({
      status: 'failed',
      id,
      error: new Error('refused'),
    });

    beforeEach(function () {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    });

    afterEach(function () {
      vi.useRealTimers();
    });

    // Moves the clock on and says how many claims the relay has made by then
    async function claimsAfter(scripted: ReturnType<typeof makeStore>, ms: number) {
      await vi.advanceTimersByTimeAsync(ms);
      return scripted.claims.length;
    }

    it('drains again once a failed hand-off is due for its retry, not at the next poll', async function () {
      const scripted = makeStore();
      startRelay(scripted, { retryDelayMs: RETRY_MS });
      (await scripted.nextClaim()).resolve(failed('x'));
      (await scripted.nextClaim()).resolve({ status: 'idle' });

      assert.equal(await claimsAfter(scripted, RETRY_MS - 1), 2);
      assert.equal(await claimsAfter(scripted, 1), 3);
    });

    it('drains again after a retry delay when a claim fails', async function () {
      const scripted = makeStore();
      startRelay(scripted, { retryDelayMs: RETRY_MS });
      (await scripted.nextClaim()).reject(new Error('db gone'));

      assert.equal(await claimsAfter(scripted, RETRY_MS - 1), 1);
      assert.equal(await claimsAfter(scripted, 1), 2);
    });

    it('keeps a pending retry when a wake-up drains before it is due', async function () {
      const scripted = makeStore();
      const started = startRelay(scripted, { retryDelayMs: RETRY_MS });
      (await scripted.nextClaim()).resolve(failed('x'));
      (await scripted.nextClaim()).resolve({ status: 'idle' });
      await vi.advanceTimersByTimeAsync(RETRY_MS / 2);

      started.wake();
      (await scripted.nextClaim()).resolve({ status: 'idle' });

      assert.equal(await claimsAfter(scripted, RETRY_MS / 2 - 1), 3);
      assert.equal(await claimsAfter(scripted, 1), 4);
    });

    it('goes back to waiting for the poll once the retry has run', async function () {
      const scripted = makeStore();
      startRelay(scripted, { retryDelayMs: RETRY_MS });
      (await scripted.nextClaim()).resolve(failed('x'));
      (await scripted.nextClaim()).resolve({ status: 'idle' });
      await vi.advanceTimersByTimeAsync(RETRY_MS);
      (await scripted.nextClaim()).resolve({ status: 'idle' });

      assert.equal(await claimsAfter(scripted, 60_000 - 1), 3);
    });

    it('retries every row that failed, not only the first', async function () {
      const scripted = makeStore();
      const started = startRelay(scripted, { retryDelayMs: RETRY_MS });
      (await scripted.nextClaim()).resolve(failed('a'));
      (await scripted.nextClaim()).resolve({ status: 'idle' });
      await vi.advanceTimersByTimeAsync(RETRY_MS / 2);

      started.wake();
      (await scripted.nextClaim()).resolve(failed('b'));
      (await scripted.nextClaim()).resolve({ status: 'idle' });

      assert.equal(await claimsAfter(scripted, RETRY_MS - 1), 4, 'nothing before b is due');
      assert.equal(await claimsAfter(scripted, 1), 5, 'one drain once b is due');
    });
  });
});
