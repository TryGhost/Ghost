import assert from 'node:assert/strict';

// require, not import: these must be the same CommonJS instances the migration
// utils load, so the connection they drop and recreate on is the one asserted on
const testUtils = require('../../utils');
const db = require('../../../core/server/data/db');
const commands = require('../../../core/server/data/schema/commands');
const { dropTables } = require('../../../core/server/data/migrations/utils');

const PARENT = 'drop_test_parents';
const CHILD = 'drop_test_children';

const SPECS = {
  [PARENT]: {
    id: { type: 'string', maxlength: 24, nullable: false, primary: true },
    name: { type: 'string', maxlength: 191, nullable: false },
  },
  [CHILD]: {
    id: { type: 'string', maxlength: 24, nullable: false, primary: true },
    parent_id: {
      type: 'string',
      maxlength: 24,
      nullable: false,
      references: `${PARENT}.id`,
      cascadeDelete: true,
    },
  },
};

async function hasTable(tableName: string): Promise<boolean> {
  return db.knex.schema.hasTable(tableName);
}

async function dropTestTables() {
  await db.knex.schema.dropTableIfExists(CHILD);
  await db.knex.schema.dropTableIfExists(PARENT);
}

describe('Dropping tables in a migration', function () {
  beforeAll(async function () {
    await testUtils.startGhost();
  });

  beforeEach(async function () {
    await dropTestTables();
    await commands.createTable(PARENT, db.knex, SPECS[PARENT]);
    await commands.createTable(CHILD, db.knex, SPECS[CHILD]);
    await db.knex(PARENT).insert({ id: 'parent', name: 'Parent' });
    await db.knex(CHILD).insert({ id: 'child', parent_id: 'parent' });
  });

  afterEach(async function () {
    await dropTestTables();
  });

  it('drops the tables and refuses a rollback when given no specs', async function () {
    const migration = dropTables([CHILD, PARENT]);

    await migration.up({ connection: db.knex });

    assert.equal(await hasTable(CHILD), false);
    assert.equal(await hasTable(PARENT), false);
    // What knex-migrator reads to refuse rolling back past this migration
    assert.equal(migration.config.irreversible, true);
  });

  it('recreates the tables empty, references included, when rolled back with specs', async function () {
    const migration = dropTables([CHILD, PARENT], SPECS);

    await migration.up({ connection: db.knex });
    assert.equal(await hasTable(CHILD), false);
    assert.equal(await hasTable(PARENT), false);

    await migration.down({ connection: db.knex });
    assert.deepEqual(await db.knex(PARENT).pluck('id'), []);
    assert.deepEqual(await db.knex(CHILD).pluck('id'), []);

    await db.knex(PARENT).insert({ id: 'parent', name: 'Parent' });
    await db.knex(CHILD).insert({ id: 'child', parent_id: 'parent' });
    await db.knex(PARENT).where('id', 'parent').del();
    assert.deepEqual(await db.knex(CHILD).pluck('id'), [], 'The reference cascades again');
  });

  it('can run again in either direction', async function () {
    const migration = dropTables([CHILD, PARENT], SPECS);

    await migration.up({ connection: db.knex });
    await migration.up({ connection: db.knex });
    assert.equal(await hasTable(PARENT), false);

    await migration.down({ connection: db.knex });
    await migration.down({ connection: db.knex });
    assert.equal(await hasTable(CHILD), true);
    assert.equal(await hasTable(PARENT), true);
  });

  it('refuses specs that leave out a table it drops', function () {
    assert.throws(() => dropTables([CHILD, PARENT], { [CHILD]: SPECS[CHILD] }), {
      message: new RegExp(PARENT),
    });
  });
});
