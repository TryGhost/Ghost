import assert from 'node:assert/strict';
import createKnex, { type Knex } from 'knex';
import { isUniqueViolation, uniqueViolationColumn } from '../../../../core/server/lib/db-errors';

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

// The API suites cover MySQL 8's messages. This covers SQLite, and MySQL's message from before
// 8.0.19, which named an index without its table.
describe('uniqueViolationColumn', function () {
  let knex: Knex;

  const failure = (write: Promise<unknown>): Promise<unknown> =>
    write.then(
      () => assert.fail('The write was expected to fail'),
      (err: unknown) => err,
    );

  /** MySQL's error for a value that `key` already holds, as Knex reports it. */
  const duplicateEntry = (key: string) =>
    Object.assign(
      new Error(
        `insert into \`things\` (\`id\`, \`name\`) values ('b', 'it''s') - Duplicate entry 'it's' for key '${key}'`,
      ),
      { code: 'ER_DUP_ENTRY' },
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
      table.string('slug', 191).notNullable().unique();
      table.string('a', 10).nullable();
      table.string('b', 10).nullable();
      table.unique(['a', 'b']);
    });
    await knex('things').insert({ id: 'a', name: 'first', slug: 'first', a: 'x', b: 'y' });
  });

  afterEach(async function () {
    await knex.destroy();
  });

  it("names the column of the unique index SQLite's write broke", async function () {
    const name = await failure(knex('things').insert({ id: 'b', name: 'first', slug: 'second' }));
    const slug = await failure(knex('things').insert({ id: 'b', name: 'second', slug: 'first' }));

    assert.equal(uniqueViolationColumn(name, 'things'), 'name');
    assert.equal(uniqueViolationColumn(slug, 'things'), 'slug');
  });

  it('names no column for an index over several columns, or for another table', async function () {
    const pair = await failure(
      knex('things').insert({ id: 'b', name: 'second', slug: 'second', a: 'x', b: 'y' }),
    );
    const name = await failure(knex('things').insert({ id: 'b', name: 'first', slug: 'second' }));

    assert.equal(uniqueViolationColumn(pair, 'things'), undefined);
    assert.equal(uniqueViolationColumn(name, 'other_things'), undefined);
  });

  it("names the column of MySQL's index, with or without its table", function () {
    assert.equal(
      uniqueViolationColumn(duplicateEntry('things.things_name_unique'), 'things'),
      'name',
    );
    assert.equal(uniqueViolationColumn(duplicateEntry('things_slug_unique'), 'things'), 'slug');
  });

  it("names no column for MySQL's primary key, or for another error", function () {
    assert.equal(uniqueViolationColumn(duplicateEntry('things.PRIMARY'), 'things'), undefined);
    assert.equal(uniqueViolationColumn(duplicateEntry('PRIMARY'), 'things'), undefined);
    assert.equal(
      uniqueViolationColumn(new Error("for key 'things_name_unique'"), 'things'),
      undefined,
    );
  });
});
