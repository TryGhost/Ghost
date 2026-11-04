import assert from 'node:assert/strict';
import type { Knex } from 'knex';
// @ts-expect-error This module lacks type definitions.
import * as commands from '../../../core/server/data/schema/commands';
import { exactlyOneCheck, tableChecksOf } from '../../../core/server/data/schema/lib/table-checks';
import { readTableChecks } from '../../utils/table-checks';

const testUtils = require('../../utils');
const { knex }: { knex: Knex } = require('../../../core/server/data/db');

const TABLE = 'test_column_patterns';
const slug = { type: 'string', maxlength: 191, nullable: false, pattern: '^[a-z0-9_]+$' };

describe('A column pattern on MySQL', function () {
  const refused = (row: Record<string, unknown>) =>
    assert.rejects(knex(TABLE).insert(row), /Check constraint/);

  beforeAll(async function () {
    await testUtils.startGhost();
  });

  beforeEach(async function () {
    await knex.schema.dropTableIfExists(TABLE);
  });

  afterAll(async function () {
    await knex.schema.dropTableIfExists(TABLE);
  });

  it('refuses any value outside it, one ending in a line break included', async function () {
    await commands.createTable(TABLE, knex, { slug });

    await knex(TABLE).insert({ slug: 'company' });
    await refused({ slug: 'Company' });
    await refused({ slug: 'com.pany' });
    await refused({ slug: 'company\n' });
  });

  // The check that compares a migrated database with schema.js reads checks back this way.
  it('reads back from MySQL as it was declared', async function () {
    const tableSpec = { slug: { ...slug, pattern: '^[a-z]+(_[a-z]+)?$' } };
    await commands.createTable(TABLE, knex, tableSpec);

    assert.deepEqual((await readTableChecks(knex))[TABLE], tableChecksOf(TABLE, tableSpec));
  });

  it('holds a pattern with a question mark in it', async function () {
    await commands.createTable(TABLE, knex, { slug: { ...slug, pattern: '^[a-z]+(_[a-z]+)?$' } });

    await knex(TABLE).insert({ slug: 'first_name' });
    await refused({ slug: 'first_' });
  });

  it('holds an escaped question mark as a literal one', async function () {
    await commands.createTable(TABLE, knex, { slug: { ...slug, pattern: '^why\\?$' } });

    await knex(TABLE).insert({ slug: 'why?' });
    await refused({ slug: 'wh' });
  });

  it('refuses a line break after any end of the value, not only the last', async function () {
    await commands.createTable(TABLE, knex, { slug: { ...slug, pattern: '^company$|^team$' } });

    await knex(TABLE).insert([{ slug: 'company' }, { slug: 'team' }]);
    await refused({ slug: 'company\n' });
    await refused({ slug: 'team\n' });
  });

  it('holds on a column added to an existing table, and goes with it when it is dropped', async function () {
    const handle = { ...slug, pattern: '^[a-z]+(_[a-z]+)?$' };
    await commands.createTable(TABLE, knex, { id: { type: 'integer', nullable: true } });
    await commands.addColumn(TABLE, 'slug', knex, handle);

    await knex(TABLE).insert({ id: 1, slug: 'first_name' });
    await refused({ id: 2, slug: 'first_' });

    await commands.dropColumn(TABLE, 'slug', knex, handle);
    assert.equal(await knex.schema.hasColumn(TABLE, 'slug'), false);
  });

  it('is not added at all when rows already in the table break it', async function () {
    await commands.createTable(TABLE, knex, { id: { type: 'integer', nullable: true } });
    await knex(TABLE).insert({ id: 1 });

    // The existing row gets an empty slug, which the pattern refuses.
    await assert.rejects(commands.addColumn(TABLE, 'slug', knex, slug), /Check constraint/);
    assert.equal(await knex.schema.hasColumn(TABLE, 'slug'), false);
  });
});

describe('An exactly-one check on MySQL', function () {
  const utils = require('../../../core/server/data/migrations/utils');
  const values = {
    value_text: { type: 'text', nullable: true },
    value_number: { type: 'double', nullable: true },
  };
  const exactlyOne = { '@@CHECKS@@': [{ exactlyOneOf: ['value_text', 'value_number'] }] };
  const refused = (row: Record<string, unknown>) =>
    assert.rejects(knex(TABLE).insert(row), /Check constraint/);

  beforeAll(async function () {
    await testUtils.startGhost();
  });

  beforeEach(async function () {
    await knex.schema.dropTableIfExists(TABLE);
  });

  afterAll(async function () {
    await knex.schema.dropTableIfExists(TABLE);
  });

  it('refuses a row holding its value in both columns or in neither', async function () {
    await commands.createTable(TABLE, knex, { ...values, ...exactlyOne });

    await knex(TABLE).insert([
      { value_text: 'Bex', value_number: null },
      { value_text: null, value_number: 9.95 },
    ]);
    await refused({ value_text: '9.95', value_number: 9.95 });
    await refused({ value_text: null, value_number: null });
  });

  it('reads back from MySQL as it was declared', async function () {
    const tableSpec = { ...values, ...exactlyOne };
    await commands.createTable(TABLE, knex, tableSpec);

    assert.deepEqual((await readTableChecks(knex))[TABLE], tableChecksOf(TABLE, tableSpec));
  });

  it('is added to a table that exists, and dropped again, by its migration', async function () {
    await commands.createTable(TABLE, knex, values);
    await knex(TABLE).insert({ value_text: 'Bex', value_number: null });
    const migration = utils.createAddCheckMigration(
      TABLE,
      exactlyOneCheck(TABLE, ['value_text', 'value_number']),
    );

    await migration.up({ connection: knex });
    await migration.up({ connection: knex });
    await refused({ value_text: null, value_number: null });

    await migration.down({ connection: knex });
    await knex(TABLE).insert({ value_text: null, value_number: null });
  });

  it('is not added when a row already in the table breaks it', async function () {
    await commands.createTable(TABLE, knex, values);
    await knex(TABLE).insert({ value_text: null, value_number: null });
    const migration = utils.createAddCheckMigration(
      TABLE,
      exactlyOneCheck(TABLE, ['value_text', 'value_number']),
    );

    await assert.rejects(migration.up({ connection: knex }), /Check constraint/);
    assert.equal((await readTableChecks(knex))[TABLE], undefined);
  });

  // MySQL reads a sum of more than two terms back nested, which is how a group grows.
  it('reads back from MySQL as it was declared over any number of columns', async function () {
    const tableSpec = {
      ...values,
      value_boolean: { type: 'boolean', nullable: true },
      '@@CHECKS@@': [{ exactlyOneOf: ['value_text', 'value_number', 'value_boolean'] }],
    };
    await commands.createTable(TABLE, knex, tableSpec);

    assert.deepEqual((await readTableChecks(knex))[TABLE], tableChecksOf(TABLE, tableSpec));
  });

  it('is replaced by one over a grown group, and put back, by its migration', async function () {
    await commands.createTable(TABLE, knex, {
      ...values,
      value_boolean: { type: 'boolean', nullable: true },
      ...exactlyOne,
    });
    const migration = utils.createReplaceCheckMigration(
      TABLE,
      exactlyOneCheck(TABLE, ['value_text', 'value_number']),
      exactlyOneCheck(TABLE, ['value_text', 'value_number', 'value_boolean']),
    );

    await migration.up({ connection: knex });
    await knex(TABLE).insert({ value_text: null, value_number: null, value_boolean: true });
    await refused({ value_text: 'Bex', value_number: null, value_boolean: true });

    // A row held only in the new column breaks the old check, so going down refuses while one is
    // there, rather than deleting it.
    await assert.rejects(migration.down({ connection: knex }), /Check constraint/);
    await knex(TABLE).where({ value_boolean: true }).del();
    await migration.down({ connection: knex });
    await refused({ value_text: null, value_number: null, value_boolean: false });
  });

  it('can only be declared over nullable columns of the table', function () {
    assert.throws(
      () =>
        tableChecksOf(TABLE, {
          value_text: { type: 'text', nullable: false },
          value_number: { type: 'double', nullable: true },
          ...exactlyOne,
        }),
      /value_text isn't/,
    );
  });
});
