import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { InFlightImports } from '../../../../../../../core/server/services/members/import-export/import/in-flight';

// Resolves to whether the promise settled within a few event-loop turns.
async function settles(promise: Promise<void>): Promise<boolean> {
  let settled = false;
  void promise.then(() => {
    settled = true;
  });
  for (let i = 0; i < 5; i += 1) {
    await new Promise((resolve) => {
      setImmediate(resolve);
    });
  }
  return settled;
}

describe('in-flight members imports', function () {
  it('is settled when nothing is in flight', async function () {
    assert.equal(await settles(new InFlightImports().allSettled()), true);
  });

  it('waits until every tracked import is released', async function () {
    const inFlight = new InFlightImports();
    inFlight.track('first');
    inFlight.track('second');

    const settled = inFlight.allSettled();
    inFlight.release('first');
    assert.equal(await settles(settled), false);

    inFlight.release('second');
    assert.equal(await settles(settled), true);
  });

  it('ignores the release of an import it was never tracking', async function () {
    const inFlight = new InFlightImports();
    inFlight.track('tracked');

    const settled = inFlight.allSettled();
    inFlight.release('untracked');
    assert.equal(await settles(settled), false);

    inFlight.release('tracked');
    assert.equal(await settles(settled), true);
  });

  it('settles every waiter at once', async function () {
    const inFlight = new InFlightImports();
    inFlight.track('only');

    const first = inFlight.allSettled();
    const second = inFlight.allSettled();
    inFlight.release('only');

    assert.equal(await settles(first), true);
    assert.equal(await settles(second), true);
  });
});
