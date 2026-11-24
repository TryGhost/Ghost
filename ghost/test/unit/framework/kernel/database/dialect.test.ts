import assert from 'node:assert/strict';
import knex from 'knex';
import { dialectOf, isMySQL, isSQLite } from '#kernel/database/dialect';

describe('kernel: database dialect', function () {
  it('reads the dialect knex sets, whatever the config named', function () {
    // Building a knex connects to nothing
    const sqlite = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    const mysql = knex({ client: 'mysql2', connection: {} });

    assert.equal(dialectOf(sqlite), 'sqlite');
    assert.equal(dialectOf(mysql), 'mysql');
    assert.equal(isSQLite(sqlite), true);
    assert.equal(isMySQL(mysql), true);
  });

  it('reads a test double that only names its configured client', function () {
    assert.equal(dialectOf({ client: { config: { client: 'sqlite3' } } }), 'sqlite');
    assert.equal(dialectOf({ client: { config: { client: 'mysql' } } }), 'mysql');
  });

  it('refuses a database Ghost does not support, rather than guessing', function () {
    assert.throws(
      () => dialectOf({ client: { dialect: 'postgresql' } }),
      /Unsupported database dialect/,
    );
  });
});
