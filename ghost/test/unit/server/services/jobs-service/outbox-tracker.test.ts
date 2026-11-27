import assert from 'node:assert/strict';
import { OutboxTracker } from '../../../../../core/server/services/jobs-service/outbox-tracker';

function makeTracker({ failRemove = false } = {}) {
  const removed: string[] = [];
  const errors: unknown[][] = [];
  const tracker = new OutboxTracker({
    store: {
      async remove(id: string) {
        if (failRemove) {
          throw new Error('db down');
        }
        removed.push(id);
      },
    },
    logging: {
      error: (...args: unknown[]) => {
        errors.push(args);
      },
      info() {},
      warn() {},
    },
  });
  return { tracker, removed, errors };
}

describe('OutboxTracker', function () {
  it('removes the row of a job that completed', async function () {
    const { tracker, removed } = makeTracker();

    await tracker.onSettled('d1', { status: 'completed' });

    assert.deepEqual(removed, ['d1']);
  });

  it('removes the row of a job the backend gave up on', async function () {
    const { tracker, removed } = makeTracker();

    await tracker.onSettled('d1', { status: 'dead', error: new Error('boom') });

    assert.deepEqual(removed, ['d1']);
  });

  it('logs a row it could not remove instead of throwing', async function () {
    const { tracker, errors } = makeTracker({ failRemove: true });

    await tracker.onSettled('d1', { status: 'completed' });

    assert.equal(errors.length, 1);
    assert.match(String(errors[0][1]), /d1/);
  });
});
