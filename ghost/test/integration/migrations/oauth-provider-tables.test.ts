import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { TableDefinition } from '../../../core/server/data/schema/types';
import { foreignKeysOf } from '../../../core/server/data/schema/lib/foreign-keys';

// require, not import: the migration utilities must read the config set here
const testUtils = require('../../utils');
const configUtils = require('../../utils/config-utils');
const db = require('../../../core/server/data/db');
const schema: Record<string, TableDefinition> =
  require('../../../core/server/data/schema/schema').default;

const VERSIONS = path.join(__dirname, '../../../core/server/data/migrations/versions');

// In the order the migration creates them
const TABLES = [
  'oauth_clients',
  'oauth_resources',
  'oauth_client_resources',
  'oauth_refresh_tokens',
  'oauth_access_tokens',
  'oauth_consents',
  'oauth_client_assertions',
  'oauth_jwks',
];

function loadMigration(slug: string) {
  const files = fs
    .readdirSync(VERSIONS)
    .flatMap((version) =>
      fs
        .readdirSync(path.join(VERSIONS, version))
        .map((name) => path.join(VERSIONS, version, name)),
    )
    .filter((candidate) => candidate.endsWith(`-${slug}.ts`));
  assert.equal(files.length, 1, `finds the ${slug} migration`);
  return require(files[0]).default;
}

const migration = loadMigration('add-oauth-provider-tables');
const up = () => migration.up({ connection: db.knex });
const down = () => migration.down({ connection: db.knex });

const existing = async () => {
  const found = [];
  for (const table of TABLES) {
    if (await db.knex.schema.hasTable(table)) {
      found.push(table);
    }
  }
  return found;
};

const dropAll = async () => {
  for (const table of TABLES.toReversed()) {
    await db.knex.schema.dropTableIfExists(table);
  }
};

/** Each column's nullability, as the database has it */
async function columnsOf(table: string): Promise<Record<string, boolean>> {
  const info = await db.knex(table).columnInfo();
  return Object.fromEntries(
    Object.entries<{ nullable: boolean }>(info).map(([name, column]) => [name, column.nullable]),
  );
}

function expectedColumnsOf(table: string): Record<string, boolean> {
  return Object.fromEntries(
    Object.entries(schema[table])
      .filter(([name]) => !name.startsWith('@@'))
      .map(([name, column]) => [name, (column as { nullable: boolean }).nullable]),
  );
}

async function foreignKeysInDatabase() {
  const [rows] = await db.knex.raw(
    `SELECT k.TABLE_NAME AS tableName, k.COLUMN_NAME AS columnName,
        k.REFERENCED_TABLE_NAME AS referencedTable, k.REFERENCED_COLUMN_NAME AS referencedColumn,
        r.DELETE_RULE AS onDelete
      FROM information_schema.KEY_COLUMN_USAGE k
      JOIN information_schema.REFERENTIAL_CONSTRAINTS r
        ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA AND r.TABLE_NAME = k.TABLE_NAME
          AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
      WHERE k.TABLE_SCHEMA = DATABASE() AND k.TABLE_NAME IN (?)
        AND k.REFERENCED_TABLE_NAME IS NOT NULL`,
    [TABLES],
  );
  return rows
    .map(
      (row: Record<string, string>) =>
        `${row.tableName}.${row.columnName} -> ${row.referencedTable}.${row.referencedColumn} ON DELETE ${row.onDelete}`,
    )
    .sort();
}

const schemaForeignKeys = () =>
  TABLES.flatMap((table) =>
    foreignKeysOf(table, schema[table]).map(
      ({ columns, references, onDelete }) =>
        `${table}.${columns.join(',')} -> ${references.table}.${references.columns.join(',')} ON DELETE ${onDelete}`,
    ),
  ).sort();

describe("Better Auth's OAuth provider tables migration", function () {
  beforeAll(async function () {
    await testUtils.startGhost();
  });

  afterEach(async function () {
    await configUtils.restore();
    // Back to the tables a testing database has
    await up();
  });

  it('creates every table as schema.ts defines it where none exist, as on a production site', async function () {
    configUtils.set('env', 'production');
    await dropAll();

    await up();

    assert.deepEqual(await existing(), TABLES);
    for (const table of TABLES) {
      assert.deepEqual(await columnsOf(table), expectedColumnsOf(table), table);
    }
    const foreignKeys = await foreignKeysInDatabase();
    assert.equal(foreignKeys.length, 12);
    assert.ok(foreignKeys.every((foreignKey: string) => foreignKey.endsWith('ON DELETE CASCADE')));
    assert.deepEqual(foreignKeys, schemaForeignKeys());
  });

  it('leaves existing tables and their rows alone outside development and testing', async function () {
    configUtils.set('env', 'production');
    await db.knex('oauth_jwks').del();
    await db.knex('oauth_jwks').insert({
      id: 'a'.repeat(24),
      public_key: 'public',
      private_key: 'private',
      created_at: new Date(),
    });

    await up();

    assert.equal((await db.knex('oauth_jwks').pluck('id')).length, 1);
    await db.knex('oauth_jwks').del();
  });

  it('replaces a development copy built from an older definition', async function () {
    await db.knex.schema.dropTable('oauth_jwks');
    await db.knex.schema.createTable('oauth_jwks', (table: any) => {
      table.string('id', 24).primary();
      table.text('public_key').notNullable();
      table.text('private_key').notNullable();
    });
    await db.knex('oauth_jwks').insert({ id: 'a'.repeat(24), public_key: 'p', private_key: 'p' });

    await up();

    assert.deepEqual(await columnsOf('oauth_jwks'), expectedColumnsOf('oauth_jwks'));
    assert.equal((await db.knex('oauth_jwks').pluck('id')).length, 0);
  });

  it('rolls back by dropping every table, and runs again', async function () {
    await down();
    assert.deepEqual(await existing(), []);

    await up();
    await up();
    assert.deepEqual(await existing(), TABLES);
  });
});
