import { times } from 'lodash';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import * as sinon from 'sinon';
import { promisePool } from '../../../../core/server/lib/promise-pool';

describe('promisePool', function () {
  it('rejects with invalid concurrency', async function () {
    for (const maxConcurrency of [-1, 0, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity]) {
      await assert.rejects(promisePool([], maxConcurrency), {
        message: 'Concurrency must be a positive integer',
      });
    }
  });

  it('limits concurrency', async function () {
    let running = 0;
    let maxRunning = 0;

    await promisePool(
      times(100, () => async () => {
        running += 1;
        maxRunning = Math.max(maxRunning, running);
        await setImmediate();
        running -= 1;
      }),
      3,
    );

    assert.equal(maxRunning, 3);
  });

  it('rejects if a task fails', async function () {
    const finalTask = sinon.stub().resolves();
    const tasks = [
      () => Promise.resolve(),
      () => Promise.reject(new Error('Task failed')),
      finalTask,
    ];

    await assert.rejects(promisePool(tasks, 1), { message: 'Task failed' });
    sinon.assert.notCalled(finalTask);
  });
});
