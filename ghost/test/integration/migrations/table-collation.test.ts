import assert from 'node:assert/strict';
import type { Knex } from 'knex';
// @ts-expect-error This module lacks type definitions.
import * as commands from '../../../core/server/data/schema/commands';

const testUtils = require('../../utils');
const { knex }: { knex: Knex } = require('../../../core/server/data/db');

const PARENT = 'test_collation_parents';
const CHILD = 'test_collation_children';

// A collation the server is unlikely to default to for `utf8mb4`, as a database upgraded in
// place holds its tables in the one they were created with.
const PARENT_COLLATION = 'utf8mb4_unicode_ci';

const id = { type: 'string', maxlength: 24, nullable: false };

describe('A table created on a database whose tables use another collation', function () {
  const collationOf = async (table: string, column: string) => {
    const [rows] = await knex.raw(
      `SELECT COLLATION_NAME AS collation FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column],
    );
    return rows[0].collation;
  };

  beforeAll(async function () {
    await testUtils.startGhost();
  });

  beforeEach(async function () {
    await knex.schema.dropTableIfExists(CHILD);
    await knex.schema.dropTableIfExists(PARENT);
    await knex.raw(
      `CREATE TABLE ?? (id varchar(24) NOT NULL PRIMARY KEY)
       DEFAULT CHARACTER SET utf8mb4 COLLATE ${PARENT_COLLATION}`,
      [PARENT],
    );
  });

  afterAll(async function () {
    await knex.schema.dropTableIfExists(CHILD);
    await knex.schema.dropTableIfExists(PARENT);
  });

  it('can reference the tables that are there', async function () {
    await commands.createTable(CHILD, knex, {
      id,
      parent_id: { ...id, references: `${PARENT}.id`, cascadeDelete: true },
    });

    assert.equal(await collationOf(CHILD, 'parent_id'), PARENT_COLLATION);

    await knex(PARENT).insert({ id: 'a' });
    await knex(CHILD).insert({ id: 'b', parent_id: 'a' });
    await assert.rejects(knex(CHILD).insert({ id: 'c', parent_id: 'missing' }), /foreign key/i);
  });
});
