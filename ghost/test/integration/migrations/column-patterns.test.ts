import assert from 'node:assert/strict';
import type { Knex } from 'knex';
// @ts-expect-error This module lacks type definitions.
import * as commands from '../../../core/server/data/schema/commands';
import { patternChecksOf } from '../../../core/server/data/schema/lib/column-patterns';
import { readPatternChecks } from '../../utils/pattern-checks';

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

    assert.deepEqual((await readPatternChecks(knex))[TABLE], patternChecksOf(TABLE, tableSpec));
  });

  it('holds a pattern with a question mark in it', async function () {
    await commands.createTable(TABLE, knex, { slug: { ...slug, pattern: '^[a-z]+(_[a-z]+)?$' } });

    await knex(TABLE).insert({ slug: 'first_name' });
    await refused({ slug: 'first_' });
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
