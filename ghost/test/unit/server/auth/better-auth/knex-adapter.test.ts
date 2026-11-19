import assert from 'node:assert/strict';
import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import { createKnexAdapter } from '../../../../../core/server/auth/better-auth/knex-adapter';

// Creating the adapter runs no queries
const fakeKnex = () => ({}) as Knex;

describe('createKnexAdapter', function () {
  it('rejects native joins, which the adapter does not implement', function () {
    assert.throws(
      () => createKnexAdapter({ db: fakeKnex() })({ advanced: { database: { joins: true } } }),
      errors.IncorrectUsageError,
    );
  });

  it('accepts options with native joins off', function () {
    assert.doesNotThrow(() =>
      createKnexAdapter({ db: fakeKnex() })({ advanced: { database: { joins: false } } }),
    );
  });
});
