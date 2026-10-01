import ObjectId from 'bson-objectid';
import type { Knex } from 'knex';
import KnexMigrator from 'knex-migrator';
import { groupBy, kebabCase, omitBy, sortBy } from 'lodash';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import semver from 'semver';
import { knex as dbKnex } from '../../../core/server/data/db';
import { v4Schema } from '../../utils/fixtures/schema/v4';
// @ts-expect-error This module lacks type definitions.
import rawSchema from '../../../core/server/data/schema/schema';
// @ts-expect-error This module lacks type definitions.
import * as commands from '../../../core/server/data/schema/commands';
import { isInDevelopmentTable } from '../../../core/server/data/schema/in-development';
// @ts-expect-error This module lacks type definitions.
import * as dbUtils from '../../utils/db-utils';

const schema = rawSchema as SchemaTables;

type SchemaTables = Record<string, Record<string, unknown>>;

type ColumnSpec = {
  type: string;
  maxlength?: number;
  fieldtype?: string;
  nullable?: boolean;
  defaultTo?: unknown;
  unsigned?: boolean;
  primary?: boolean;
  unique?: boolean;
  index?: boolean;
  references?: string;
  constraintName?: string;
  cascadeDelete?: boolean;
  restrictDelete?: boolean;
  setNullDelete?: boolean;
};

type IndexSpec = string[] | { columns: string[] };

type DeleteRuleSpec = Pick<ColumnSpec, 'cascadeDelete' | 'restrictDelete' | 'setNullDelete'>;

type ForeignKeySpec = DeleteRuleSpec & {
  columns: string[];
  references: { table: string; columns: string[] };
  constraintName?: string;
};

type NormalizedColumn = {
  type: string;
  maxlength?: number;
  fieldtype?: string;
  nullable: boolean;
  defaultTo?: string;
  unsigned?: true;
};

// One per constraint, whether schema.js declares it on a column or on the table: the
// database knows no difference, and a constraint over two columns is one constraint.
type NormalizedForeignKey = {
  constraintName: string;
  columns: string[];
  references: { table: string; columns: string[] };
  onDelete: string;
};

type NormalizedTable = {
  columns: Record<string, NormalizedColumn>;
  primaryKey: string[];
  indexes: string[][];
  uniques: string[][];
  foreignKeys: NormalizedForeignKey[];
};

type NormalizedSchema = Record<string, NormalizedTable>;

type ColumnRow = {
  TABLE_NAME: string;
  COLUMN_NAME: string;
  DATA_TYPE: string;
  COLUMN_TYPE: string;
  CHARACTER_MAXIMUM_LENGTH: number | null;
  IS_NULLABLE: 'YES' | 'NO';
  COLUMN_DEFAULT: string | null;
};

type IndexRow = {
  TABLE_NAME: string;
  INDEX_NAME: string;
  COLUMN_NAME: string;
  NON_UNIQUE: number;
};

type ForeignKeyRow = {
  TABLE_NAME: string;
  COLUMN_NAME: string;
  CONSTRAINT_NAME: string;
  REFERENCED_TABLE_NAME: string;
  REFERENCED_COLUMN_NAME: string;
  DELETE_RULE: string;
};

function deleteRule(spec: DeleteRuleSpec): string {
  if (spec.cascadeDelete) {
    return 'CASCADE';
  }
  if (spec.restrictDelete) {
    return 'RESTRICT';
  }
  if (spec.setNullDelete) {
    return 'SET NULL';
  }
  return 'NO ACTION';
}

function sortForeignKeys(foreignKeys: NormalizedForeignKey[]): NormalizedForeignKey[] {
  return sortBy(foreignKeys, 'constraintName');
}

type FixtureEntry = Record<string, unknown>;

type Fixtures = {
  models: { name: string; entries: FixtureEntry[] }[];
  relations: { from: { model: string }; entries: Record<string, unknown> }[];
};

type ExecutedMigration = {
  name: string;
  version: string;
  currentVersion: string;
};

type FixtureId = {
  entry: FixtureEntry;
  id: string;
};

const MYSQL_TYPES = new Map<string, string>([
  ['varchar', 'string'],
  ['int', 'integer'],
  ['bigint', 'bigInteger'],
  ['datetime', 'dateTime'],
  ['text', 'text'],
  ['mediumtext', 'text'],
  ['longtext', 'text'],
  ['varbinary', 'binary'],
  ['blob', 'binary'],
]);

const MIGRATIONS_PATH = path.join(__dirname, '../../../core/server/data/migrations');

// The last v4 version with migrations. Sites must be on v4 before they can
// migrate to v5, so the versioned migrations start from a database at this
// version.
const V4_VERSION = '4.47';

// Fixtures are inserted with knex because today's models no longer match the v4
// tables. Posts and tags are left out as no migration needs them.
const V4_FIXTURE_TABLES: Record<string, keyof typeof v4Schema> = {
  Product: 'products',
  Newsletter: 'newsletters',
  Role: 'roles',
  Permission: 'permissions',
  User: 'users',
  Integration: 'integrations',
};

// Tables knex-migrator uses to track its own state; they are not in schema.js
const KNEX_MIGRATOR_TABLES = ['migrations', 'migrations_lock'];

const knexMigrator = new KnexMigrator({
  knexMigratorFilePath: path.join(__dirname, '../../../'),
});

/**
 * Reduces schema.js-style table definitions to what can be read back out of
 * the database, so that they can be compared with `readSchemaFromDatabase()`.
 */
function normalizeSchema(tables: SchemaTables): NormalizedSchema {
  const result: NormalizedSchema = {};

  for (const [tableName, tableSpec] of Object.entries(tables)) {
    const columns: Record<string, NormalizedColumn> = {};
    const indexes: string[][] = [];
    const uniques: string[][] = [];
    const foreignKeys: NormalizedForeignKey[] = [];
    let primaryKey: string[] = [];

    for (const [columnName, value] of Object.entries(tableSpec)) {
      if (columnName.startsWith('@@')) {
        continue;
      }
      const spec = value as ColumnSpec;

      const column: NormalizedColumn = { type: spec.type, nullable: spec.nullable === true };

      if (spec.type === 'string') {
        column.maxlength = spec.maxlength ?? 191;
      } else if (spec.type === 'binary' && spec.maxlength !== undefined) {
        column.maxlength = spec.maxlength;
      }
      if (spec.type === 'text' && spec.fieldtype) {
        column.fieldtype = spec.fieldtype;
      }
      if (Object.hasOwn(spec, 'defaultTo')) {
        column.defaultTo = normalizeDefault(spec.defaultTo);
      }
      if (spec.unsigned) {
        column.unsigned = true;
      }
      if (spec.references) {
        const [table, referencedColumn] = spec.references.split('.');
        foreignKeys.push({
          constraintName: spec.constraintName ?? `${tableName}_${columnName}_foreign`,
          columns: [columnName],
          references: { table, columns: [referencedColumn] },
          onDelete: deleteRule(spec),
        });
      }

      if (spec.primary) {
        primaryKey.push(columnName);
      }
      if (spec.unique) {
        uniques.push([columnName]);
      }
      if (spec.index) {
        indexes.push([columnName]);
      }

      columns[columnName] = column;
    }

    for (const index of (tableSpec['@@INDEXES@@'] ?? []) as IndexSpec[]) {
      indexes.push(Array.isArray(index) ? index : index.columns);
    }
    for (const unique of (tableSpec['@@UNIQUE_CONSTRAINTS@@'] ?? []) as IndexSpec[]) {
      uniques.push(Array.isArray(unique) ? unique : unique.columns);
    }
    if (tableSpec['@@PRIMARY_KEY@@']) {
      primaryKey = tableSpec['@@PRIMARY_KEY@@'] as string[];
    }
    for (const foreignKey of (tableSpec['@@FOREIGN_KEYS@@'] ?? []) as ForeignKeySpec[]) {
      foreignKeys.push({
        constraintName:
          foreignKey.constraintName ?? `${tableName}_${foreignKey.columns.join('_')}_foreign`,
        columns: foreignKey.columns,
        references: foreignKey.references,
        onDelete: deleteRule(foreignKey),
      });
    }

    result[tableName] = {
      columns,
      primaryKey,
      indexes: sortIndexes(indexes),
      uniques: sortIndexes(uniques),
      foreignKeys: sortForeignKeys(foreignKeys),
    };
  }

  return result;
}

function normalizeDefault(value: unknown): string {
  switch (value) {
    case true:
      return '1';
    case false:
      return '0';
    default:
      return String(value);
  }
}

function sortIndexes(indexes: string[][]): string[][] {
  return sortBy(indexes, (columns) => columns.join(','));
}

/**
 * Reads the tables in the database into the same shape as `normalizeSchema()`
 */
async function readSchemaFromDatabase(knex: Knex): Promise<NormalizedSchema> {
  const database = (knex.client.config.connection as Knex.ConnectionConfig).database;

  const columnRows: ColumnRow[] = await knex('information_schema.COLUMNS')
    .where('TABLE_SCHEMA', database)
    .whereNotIn('TABLE_NAME', KNEX_MIGRATOR_TABLES)
    .whereIn(
      'TABLE_NAME',
      knex('information_schema.TABLES')
        .select('TABLE_NAME')
        .where({ TABLE_SCHEMA: database, TABLE_TYPE: 'BASE TABLE' }),
    )
    .orderBy(['TABLE_NAME', 'ORDINAL_POSITION']);

  const indexRows: IndexRow[] = await knex('information_schema.STATISTICS')
    .where('TABLE_SCHEMA', database)
    .whereNotIn('TABLE_NAME', KNEX_MIGRATOR_TABLES)
    .orderBy(['TABLE_NAME', 'INDEX_NAME', 'SEQ_IN_INDEX']);

  const foreignKeyRows: ForeignKeyRow[] = await knex('information_schema.KEY_COLUMN_USAGE as k')
    .join('information_schema.REFERENTIAL_CONSTRAINTS as r', function () {
      this.on('k.CONSTRAINT_SCHEMA', 'r.CONSTRAINT_SCHEMA').andOn(
        'k.CONSTRAINT_NAME',
        'r.CONSTRAINT_NAME',
      );
    })
    .where('k.TABLE_SCHEMA', database)
    .orderBy(['k.TABLE_NAME', 'k.CONSTRAINT_NAME', 'k.ORDINAL_POSITION'])
    .select(
      'k.TABLE_NAME',
      'k.COLUMN_NAME',
      'k.CONSTRAINT_NAME',
      'k.REFERENCED_TABLE_NAME',
      'k.REFERENCED_COLUMN_NAME',
      'r.DELETE_RULE',
    );

  const result: NormalizedSchema = {};

  for (const row of columnRows) {
    result[row.TABLE_NAME] ??= {
      columns: {},
      primaryKey: [],
      indexes: [],
      uniques: [],
      foreignKeys: [],
    };

    const type =
      row.COLUMN_TYPE === 'tinyint(1)'
        ? 'boolean'
        : (MYSQL_TYPES.get(row.DATA_TYPE) ?? row.COLUMN_TYPE);
    const column: NormalizedColumn = { type, nullable: row.IS_NULLABLE === 'YES' };

    if (type === 'string' || type === 'binary') {
      column.maxlength = Number(row.CHARACTER_MAXIMUM_LENGTH);
    }
    if (row.DATA_TYPE === 'mediumtext') {
      column.fieldtype = 'medium';
    } else if (row.DATA_TYPE === 'longtext') {
      column.fieldtype = 'long';
    }
    if (row.COLUMN_DEFAULT !== null) {
      column.defaultTo = row.COLUMN_DEFAULT;
    }
    if (row.COLUMN_TYPE.includes('unsigned')) {
      column.unsigned = true;
    }

    result[row.TABLE_NAME].columns[row.COLUMN_NAME] = column;
  }

  const constraints = groupBy(foreignKeyRows, (row) => `${row.TABLE_NAME}.${row.CONSTRAINT_NAME}`);
  for (const rows of Object.values(constraints)) {
    const [first] = rows;
    result[first.TABLE_NAME].foreignKeys.push({
      constraintName: first.CONSTRAINT_NAME,
      columns: rows.map((row) => row.COLUMN_NAME),
      references: {
        table: first.REFERENCED_TABLE_NAME,
        columns: rows.map((row) => row.REFERENCED_COLUMN_NAME),
      },
      onDelete: first.DELETE_RULE,
    });
  }
  for (const table of Object.values(result)) {
    table.foreignKeys = sortForeignKeys(table.foreignKeys);
  }

  // MySQL implicitly creates an index for a foreign key that no other index
  // covers, and names it after the constraint. schema.js doesn't list those.
  const foreignKeyNames = new Set(foreignKeyRows.map((row) => row.CONSTRAINT_NAME));

  const indexesByTable = groupBy(indexRows, 'TABLE_NAME');
  for (const [tableName, rows] of Object.entries(indexesByTable)) {
    const table = result[tableName];
    if (!table) {
      continue;
    }
    for (const [indexName, indexColumns] of Object.entries(groupBy(rows, 'INDEX_NAME'))) {
      const columns = indexColumns.map((row) => row.COLUMN_NAME);
      if (indexName === 'PRIMARY') {
        table.primaryKey = columns;
      } else if (Number(indexColumns[0].NON_UNIQUE) === 0) {
        table.uniques.push(columns);
      } else if (!foreignKeyNames.has(indexName)) {
        table.indexes.push(columns);
      }
    }
    table.indexes = sortIndexes(table.indexes);
    table.uniques = sortIndexes(table.uniques);
  }

  return result;
}

/**
 * Builds the database as it was on the last v4 release, which is where the
 * versioned migrations start from, and tells knex-migrator that everything up
 * to then has run, then applies every later migration.
 */
async function createMigratedDatabase(knex: Knex) {
  await knexMigrator.init({ noScripts: true });

  for (const [tableName, tableSpec] of Object.entries(v4Schema)) {
    await commands.createTable(tableName, knex, tableSpec);
  }

  await knex.schema.createTable('migrations', function (table) {
    table.increments().primary();
    table.string('name');
    table.string('version');
    table.string('currentVersion');
  });

  const executed: ExecutedMigration[] = [];
  for (const name of fs.readdirSync(path.join(MIGRATIONS_PATH, 'init'))) {
    executed.push({ name, version: 'init', currentVersion: V4_VERSION });
  }
  for (const version of fs.readdirSync(path.join(MIGRATIONS_PATH, 'versions'))) {
    if (semver.lte(semver.coerce(version)!, semver.coerce(V4_VERSION)!)) {
      for (const name of fs.readdirSync(path.join(MIGRATIONS_PATH, 'versions', version))) {
        executed.push({ name, version, currentVersion: V4_VERSION });
      }
    }
  }
  await knex('migrations').insert(executed);

  await insertV4Fixtures(knex);
  await knexMigrator.migrate({ force: true });
}

async function insertV4Fixtures(knex: Knex) {
  const v4Fixtures: Fixtures = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../../utils/fixtures/schema/v4-fixtures.json'), 'utf8'),
  );
  const ids: Record<string, FixtureId[]> = {};

  for (const { name, entries } of v4Fixtures.models) {
    const tableName = V4_FIXTURE_TABLES[name];
    if (!tableName) {
      continue;
    }

    ids[name] = [];
    for (const entry of entries) {
      const row: Record<string, unknown> = { id: new ObjectId().toHexString() };
      for (const [columnName, value] of Object.entries(v4Schema[tableName])) {
        const spec = value as ColumnSpec;
        if (Object.hasOwn(entry, columnName) && columnName !== 'id') {
          row[columnName] = entry[columnName];
        } else if (spec.nullable === false && !Object.hasOwn(spec, 'defaultTo')) {
          if (spec.type === 'dateTime') {
            row[columnName] = new Date();
          } else if (columnName === 'uuid') {
            row[columnName] = crypto.randomUUID();
          } else if (columnName === 'created_by' || columnName === 'updated_by') {
            row[columnName] = '1';
          } else if (columnName === 'slug') {
            row[columnName] = kebabCase(entry.name as string);
          } else if (columnName === 'password') {
            row[columnName] = 'not-a-real-password-hash';
          }
        }
      }
      await knex(tableName).insert(row);
      ids[name].push({ entry, id: row.id as string });
    }
  }

  const findId = (model: string, predicate: (entry: FixtureEntry) => boolean) =>
    ids[model].find(({ entry }) => predicate(entry))!.id;

  const rolePermissions = v4Fixtures.relations.find((r) => r.from.model === 'Role')!;
  const roleEntries = rolePermissions.entries as Record<string, Record<string, string | string[]>>;
  for (const [roleName, objectTypes] of Object.entries(roleEntries)) {
    const roleId = findId('Role', (role) => role.name === roleName);
    for (const [objectType, actionTypes] of Object.entries(objectTypes)) {
      const permissions = ids.Permission.filter(
        ({ entry }) =>
          entry.object_type === objectType &&
          (actionTypes === 'all' || actionTypes.includes(entry.action_type as string)),
      );
      for (const { id: permissionId } of permissions) {
        await knex('permissions_roles').insert({
          id: new ObjectId().toHexString(),
          role_id: roleId,
          permission_id: permissionId,
        });
      }
    }
  }

  await knex('roles_users').insert({
    id: new ObjectId().toHexString(),
    role_id: findId('Role', (role) => role.name === 'Owner'),
    user_id: ids.User[0].id,
  });
}

describe('migrations', function () {
  beforeAll(async function () {
    await dbUtils.teardown();
    await knexMigrator.reset({ force: true });
  });

  afterAll(async function () {
    await knexMigrator.reset({ force: true });
    await knexMigrator.init();
  }, 120_000);

  it('builds the schema in schema.js when every migration runs', async function () {
    await createMigratedDatabase(dbKnex);

    const actualSchema = await readSchemaFromDatabase(dbKnex);
    const expectedSchema = normalizeSchema(
      omitBy(schema, (_tableSpec, tableName) => isInDevelopmentTable(tableName)),
    );

    // Known drift between migrations and schema.js. Sites that were created
    // with `knex-migrator init` have what's in schema.js; sites that ran these
    // migrations have what's below.
    //
    // TODO: Fix this drift. See NY-1482 and NY-1483.
    expectedSchema.members_subscribe_events.columns.newsletter_id.nullable = false;
    expectedSchema.post_revisions.columns.post_status.defaultTo = 'draft';

    assert.deepEqual(actualSchema, expectedSchema);
  }, 600_000);
});
