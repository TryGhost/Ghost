import assert from 'node:assert/strict';
import type { Knex } from 'knex';
// @ts-expect-error This module lacks type definitions.
import * as commands from '../../../core/server/data/schema/commands';

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

  it('holds a pattern with a question mark in it', async function () {
    await commands.createTable(TABLE, knex, { slug: { ...slug, pattern: '^[a-z]+(_[a-z]+)?$' } });

    await knex(TABLE).insert({ slug: 'first_name' });
    await refused({ slug: 'first_' });
  });

  it('holds on a column added to an existing table', async function () {
    await commands.createTable(TABLE, knex, { id: { type: 'integer', nullable: true } });
    await commands.addColumn(TABLE, 'slug', knex, slug);

    await knex(TABLE).insert({ id: 1, slug: 'company' });
    await refused({ id: 2, slug: 'Company' });
  });

  it('holds after the column is renamed', async function () {
    await commands.createTable(TABLE, knex, { slug });
    await commands.renameColumn(TABLE, 'slug', 'handle', knex, { pattern: slug.pattern });

    await knex(TABLE).insert({ handle: 'company' });
    await refused({ handle: 'Company' });
  });
});
