import assert from 'node:assert/strict';
import { describe, it, afterEach } from 'vitest';
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

  function startRelay(scripted: ReturnType<typeof makeStore>) {
    store = scripted;
    relay = new OutboxRelay({
      outbox: scripted,
      backend: { enqueue: async () => {} },
      logging: silentLogger,
      pollIntervalMs: 60_000,
      submissionTimeoutMs: 1000,
      retryDelayMs: 1000,
    });
    relay.start();
    return relay;
  }

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
});
