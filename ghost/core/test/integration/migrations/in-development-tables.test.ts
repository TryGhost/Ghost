import assert from 'node:assert/strict';
import sinon from 'sinon';

// require, not import: these must be the same CommonJS instances that
// in-development.ts loads, so the tables added to the schema, the config set
// here and the spies on commands are the ones it sees
const testUtils = require('../../utils');
const configUtils = require('../../utils/config-utils');
const db = require('../../../core/server/data/db');
const commands = require('../../../core/server/data/schema/commands');
const schema = require('../../../core/server/data/schema/schema');
const { addTable } = require('../../../core/server/data/migrations/utils');
const inDevelopment: typeof import('../../../core/server/data/schema/in-development') = require('../../../core/server/data/schema/in-development');

const PARENT = 'in_dev_test_parents';
const CHILD = 'in_dev_test_children';

const TEST_TABLES = {
  [PARENT]: {
    id: { type: 'string', maxlength: 24, nullable: false, primary: true },
  },
  [CHILD]: {
    id: { type: 'string', maxlength: 24, nullable: false, primary: true },
    parent_id: { type: 'string', maxlength: 24, nullable: false, references: `${PARENT}.id` },
  },
};

async function hasTable(tableName: string): Promise<boolean> {
  return db.knex.schema.hasTable(tableName);
}

async function dropTestTables() {
  await db.knex.schema.dropTableIfExists(CHILD);
  await db.knex.schema.dropTableIfExists(PARENT);
}

describe('In-development tables', function () {
  let originalTables: string[];

  beforeAll(async function () {
    await testUtils.startGhost();
  });

  beforeEach(async function () {
    Object.assign(schema, TEST_TABLES);
    originalTables = [...inDevelopment.IN_DEVELOPMENT_TABLES];
    inDevelopment.IN_DEVELOPMENT_TABLES.splice(0, Infinity, PARENT, CHILD);
    await dropTestTables();
  });

  afterEach(async function () {
    sinon.restore();
    await dropTestTables();
    inDevelopment.IN_DEVELOPMENT_TABLES.splice(0, Infinity, ...originalTables);
    delete schema[PARENT];
    delete schema[CHILD];
    await configUtils.restore();
  });

  describe('createMissingInDevelopmentTables', function () {
    it('creates missing tables and leaves existing ones alone', async function () {
      await commands.createTable(PARENT, db.knex);
      await db.knex(PARENT).insert({ id: 'parent' });

      await inDevelopment.createMissingInDevelopmentTables(db.knex);

      assert.equal(await hasTable(CHILD), true);
      assert.deepEqual(await db.knex(PARENT).pluck('id'), ['parent']);
    });

    it('creates nothing when disabled', async function () {
      configUtils.set('createInDevelopmentTables', false);

      await inDevelopment.createMissingInDevelopmentTables(db.knex);

      assert.equal(await hasTable(PARENT), false);
      assert.equal(await hasTable(CHILD), false);
    });
  });

  describe('rebuildInDevelopmentTables', function () {
    it('drops referencing tables first, then recreates them empty', async function () {
      await commands.createTable(PARENT, db.knex);
      await commands.createTable(CHILD, db.knex);
      await db.knex(PARENT).insert({ id: 'parent' });
      await db.knex(CHILD).insert({ id: 'child', parent_id: 'parent' });

      const deleteTable = sinon.spy(commands, 'deleteTable');
      const createTable = sinon.spy(commands, 'createTable');

      await inDevelopment.rebuildInDevelopmentTables(db.knex);

      assert.deepEqual(
        deleteTable.getCalls().map((call) => call.args[0]),
        [CHILD, PARENT],
      );
      assert.deepEqual(
        createTable.getCalls().map((call) => call.args[0]),
        [PARENT, CHILD],
      );
      assert.equal((await db.knex(PARENT).pluck('id')).length, 0);
      assert.equal((await db.knex(CHILD).pluck('id')).length, 0);
    });

    it('leaves the tables alone when disabled', async function () {
      await commands.createTable(PARENT, db.knex);
      await db.knex(PARENT).insert({ id: 'parent' });
      configUtils.set('createInDevelopmentTables', false);

      await inDevelopment.rebuildInDevelopmentTables(db.knex);

      assert.deepEqual(await db.knex(PARENT).pluck('id'), ['parent']);
    });
  });

  describe('addTable with replaceDevelopmentCopy', function () {
    const finalParentSpec = {
      ...TEST_TABLES[PARENT],
      name: { type: 'string', maxlength: 191, nullable: true },
    };

    async function columns(tableName: string): Promise<string[]> {
      return Object.keys(await db.knex(tableName).columnInfo()).sort();
    }

    it('creates the table when there is no copy', async function () {
      await addTable(PARENT, finalParentSpec, { replaceDevelopmentCopy: true }).up({
        connection: db.knex,
      });

      assert.deepEqual(await columns(PARENT), ['id', 'name']);
    });

    it('replaces an existing copy, dropping the tables that reference it', async function () {
      await commands.createTable(PARENT, db.knex);
      await commands.createTable(CHILD, db.knex);
      await db.knex(PARENT).insert({ id: 'parent' });
      await db.knex(CHILD).insert({ id: 'child', parent_id: 'parent' });

      await addTable(PARENT, finalParentSpec, { replaceDevelopmentCopy: true }).up({
        connection: db.knex,
      });

      assert.deepEqual(await columns(PARENT), ['id', 'name']);
      assert.equal((await db.knex(PARENT).pluck('id')).length, 0);
      assert.equal(await hasTable(CHILD), false);

      await inDevelopment.createMissingInDevelopmentTables(db.knex);
      assert.equal(await hasTable(CHILD), true);
    });

    it('rolls back while other tables reference it', async function () {
      const migration = addTable(PARENT, finalParentSpec, { replaceDevelopmentCopy: true });
      await migration.up({ connection: db.knex });
      await commands.createTable(CHILD, db.knex);

      await migration.down({ connection: db.knex });

      assert.equal(await hasTable(PARENT), false);
      assert.equal(await hasTable(CHILD), false);
    });

    it('leaves an existing table alone outside development and testing', async function () {
      await commands.createTable(PARENT, db.knex);
      configUtils.set('env', 'production');

      await addTable(PARENT, finalParentSpec, { replaceDevelopmentCopy: true }).up({
        connection: db.knex,
      });

      assert.deepEqual(await columns(PARENT), ['id']);
    });
  });
});
