import assert from 'node:assert/strict';
import createKnex, { type Knex } from 'knex';
import { isUniqueViolation } from '../../../../core/server/lib/db-errors';

// The API suites run against MySQL, where a taken value is a rejected request in every domain
// that uses this. This covers SQLite, which reports every broken constraint under one code.

describe('isUniqueViolation', function () {
  let knex: Knex;

  /** The error a write fails with. */
  const failure = (write: Promise<unknown>): Promise<unknown> =>
    write.then(
      () => assert.fail('The write was expected to fail'),
      (err: unknown) => err,
    );

  beforeEach(async function () {
    knex = createKnex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await knex.schema.createTable('things', (table) => {
      table.string('id', 24).notNullable().primary();
      table.string('name', 191).notNullable().unique();
    });
    await knex('things').insert({ id: 'a', name: 'first' });
  });

  afterEach(async function () {
    await knex.destroy();
  });

  it('is true for a value a unique index already holds', async function () {
    const err = await failure(knex('things').insert({ id: 'b', name: 'first' }));

    assert.equal(isUniqueViolation(err), true);
  });

  it('is true for a primary key that is taken', async function () {
    const err = await failure(knex('things').insert({ id: 'a', name: 'second' }));

    assert.equal(isUniqueViolation(err), true);
  });

  it('is false for another constraint the row breaks', async function () {
    const err = await failure(knex('things').insert({ id: 'b', name: null }));

    assert.equal(isUniqueViolation(err), false);
  });

  it("is true for MySQL's duplicate entry error", function () {
    const err = Object.assign(new Error("Duplicate entry 'first' for key 'things.name'"), {
      code: 'ER_DUP_ENTRY',
    });

    assert.equal(isUniqueViolation(err), true);
  });

  it('is false for an error that is not from the database', function () {
    assert.equal(isUniqueViolation(new Error('UNIQUE constraint failed')), false);
    assert.equal(isUniqueViolation(undefined), false);
  });
});
