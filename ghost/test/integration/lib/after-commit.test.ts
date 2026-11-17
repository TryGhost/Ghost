import assert from 'node:assert/strict';
import { describe, it, beforeAll } from 'vitest';
import type { Knex } from 'knex';
import { afterCommit } from '../../../core/server/lib/after-commit';

const testUtils = require('../../utils');
const knex: Knex = require('../../../core/server/data/db').knex;

// Records which of afterCommit's callbacks ran, and settles `done` when one has.
function track() {
  const calls: string[] = [];
  const done = Promise.withResolvers<void>();
  return {
    calls,
    done: done.promise,
    fn: () => {
      calls.push('ran');
      done.resolve();
    },
    onFailure: () => {
      calls.push('rolled back');
      done.resolve();
    },
  };
}

// Lets every callback already due run: promise reactions first, then this.
function nextTurn(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}

describe('afterCommit', function () {
  beforeAll(testUtils.setup());

  it('runs at once without a transaction', function () {
    const tracked = track();

    afterCommit(undefined, tracked.fn, tracked.onFailure);

    assert.deepEqual(tracked.calls, ['ran']);
  });

  it('runs once the transaction commits', async function () {
    const tracked = track();

    await knex.transaction(async (trx) => {
      afterCommit(trx, tracked.fn, tracked.onFailure);
      await nextTurn();
      assert.deepEqual(tracked.calls, [], 'not before the commit');
    });
    await tracked.done;

    assert.deepEqual(tracked.calls, ['ran']);
  });

  it('inside a savepoint, waits for the outer transaction to commit', async function () {
    const tracked = track();

    await knex.transaction(async (outer) => {
      await outer.transaction(async (savepoint) => {
        afterCommit(savepoint, tracked.fn, tracked.onFailure);
      });
      await nextTurn();
      assert.deepEqual(tracked.calls, [], 'not when the savepoint is released');
    });
    await tracked.done;

    assert.deepEqual(tracked.calls, ['ran']);
  });

  it('does not run when its savepoint rolls back, even if the outer transaction commits', async function () {
    const tracked = track();

    await knex.transaction(async (outer) => {
      await assert.rejects(
        outer.transaction(async (savepoint) => {
          afterCommit(savepoint, tracked.fn, tracked.onFailure);
          throw new Error('roll back the savepoint');
        }),
      );
    });
    await tracked.done;
    await nextTurn();

    assert.deepEqual(tracked.calls, ['rolled back']);
  });

  it('inside a savepoint, does not run when the outer transaction rolls back', async function () {
    const tracked = track();

    await assert.rejects(
      knex.transaction(async (outer) => {
        await outer.transaction(async (savepoint) => {
          afterCommit(savepoint, tracked.fn, tracked.onFailure);
        });
        throw new Error('roll back');
      }),
    );
    await tracked.done;
    await nextTurn();

    assert.deepEqual(tracked.calls, ['rolled back']);
  });
});
