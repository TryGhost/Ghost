const logging = require('@tryghost/logging');
const DatabaseInfo = require('@tryghost/database-info');
const { commands } = require('../../../schema');
const { createNonTransactionalMigration } = require('../../utils');

const FIELDS = 'members_metafields';
const VALUES = 'members_metafield_values';
const BINDINGS = 'members_metafield_bindings';

// Rebuilt rather than altered, both ways, discarding what the tables hold. The feature is
// behind the private `membersCustomFields` flag, so only a site that opted into it can hold
// anything, and SQLite can only change a primary or foreign key by rebuilding a table
// anyway. Values and bindings point at fields, so they are dropped first and built last.
//
// Both shapes are pinned as they stand in schema.js, per the migration rules: this file must
// keep building them however schema.js moves on.
const TYPE = {
  type: 'string',
  maxlength: 50,
  nullable: false,
  validations: { isIn: [['short_text', 'long_text', 'address']] },
};
const STATUS = {
  type: 'string',
  maxlength: 50,
  nullable: false,
  defaultTo: 'active',
  validations: { isIn: [['active', 'archived']] },
};
const MEMBER_ACCESS = {
  type: 'string',
  maxlength: 50,
  nullable: false,
  defaultTo: 'none',
  validations: { isIn: [['none', 'read', 'write']] },
};
const MEMBER_ID = {
  type: 'string',
  maxlength: 24,
  nullable: false,
  references: 'members.id',
  cascadeDelete: true,
};
const KEY_BY_KEY = {
  type: 'string',
  maxlength: 191,
  nullable: false,
  references: 'members_metafields.key',
  cascadeDelete: true,
};
const BY_FIELD = {
  columns: ['metafield_namespace', 'metafield_key'],
  references: { table: FIELDS, columns: ['namespace', 'key'] },
  cascadeDelete: true,
};

const NAMESPACED = {
  description: 'with namespaces',
  // What `createTable` sends last for the bindings, the last table built: their foreign key
  // on MySQL, and their index on the field on SQLite, which creates foreign keys with the
  // table.
  bindingsHaveNamespace: true,
  bindingsLastIndex: 'members_metafield_bindings_metafield_index',
  tables: [
    [
      FIELDS,
      {
        id: { type: 'string', maxlength: 24, nullable: false, primary: true },
        namespace: { type: 'string', maxlength: 191, nullable: false, pattern: '^[a-z0-9_]+$' },
        key: { type: 'string', maxlength: 191, nullable: false, pattern: '^[a-z0-9_]+$' },
        name: { type: 'string', maxlength: 191, nullable: false },
        type: TYPE,
        status: STATUS,
        member_access: MEMBER_ACCESS,
        sort_order: { type: 'integer', nullable: false, unsigned: true, defaultTo: 0 },
        created_at: { type: 'dateTime', nullable: false },
        updated_at: { type: 'dateTime', nullable: true },
        '@@UNIQUE_CONSTRAINTS@@': [
          ['namespace', 'key'],
          ['namespace', 'name'],
        ],
      },
    ],
    [
      VALUES,
      {
        metafield_namespace: { type: 'string', maxlength: 191, nullable: false },
        metafield_key: { type: 'string', maxlength: 191, nullable: false },
        member_id: MEMBER_ID,
        path: { type: 'string', maxlength: 191, nullable: false, defaultTo: '' },
        value_text: { type: 'text', maxlength: 65535, nullable: false },
        written_by_type: { type: 'string', maxlength: 50, nullable: false },
        written_by_id: { type: 'string', maxlength: 24, nullable: true },
        created_at: { type: 'dateTime', nullable: false },
        updated_at: { type: 'dateTime', nullable: true },
        '@@PRIMARY_KEY@@': ['metafield_namespace', 'metafield_key', 'path', 'member_id'],
        '@@INDEXES@@': [['member_id']],
        '@@FOREIGN_KEYS@@': [
          { ...BY_FIELD, constraintName: 'members_metafield_values_metafield_foreign' },
        ],
      },
    ],
    [
      BINDINGS,
      {
        id: { type: 'string', maxlength: 24, nullable: false, primary: true },
        port: { type: 'string', maxlength: 191, nullable: false, unique: true },
        metafield_namespace: { type: 'string', maxlength: 191, nullable: false },
        metafield_key: { type: 'string', maxlength: 191, nullable: false },
        created_at: { type: 'dateTime', nullable: false },
        updated_at: { type: 'dateTime', nullable: true },
        '@@INDEXES@@': [
          {
            columns: ['metafield_namespace', 'metafield_key'],
            indexName: 'members_metafield_bindings_metafield_index',
          },
        ],
        '@@FOREIGN_KEYS@@': [
          { ...BY_FIELD, constraintName: 'members_metafield_bindings_metafield_foreign' },
        ],
      },
    ],
  ],
};

const KEYED_BY_KEY = {
  description: 'without namespaces',
  bindingsHaveNamespace: false,
  bindingsLastIndex: 'members_metafield_bindings_metafield_key_index',
  tables: [
    [
      FIELDS,
      {
        id: { type: 'string', maxlength: 24, nullable: false, primary: true },
        key: { type: 'string', maxlength: 191, nullable: false, unique: true },
        name: { type: 'string', maxlength: 191, nullable: false, unique: true },
        type: TYPE,
        status: STATUS,
        member_access: MEMBER_ACCESS,
        sort_order: { type: 'integer', nullable: false, unsigned: true, defaultTo: 0 },
        created_at: { type: 'dateTime', nullable: false },
        updated_at: { type: 'dateTime', nullable: true },
      },
    ],
    [
      VALUES,
      {
        metafield_key: KEY_BY_KEY,
        member_id: MEMBER_ID,
        path: { type: 'string', maxlength: 191, nullable: false, defaultTo: '' },
        value_text: { type: 'text', maxlength: 65535, nullable: false },
        written_by_type: { type: 'string', maxlength: 50, nullable: false },
        written_by_id: { type: 'string', maxlength: 24, nullable: true },
        created_at: { type: 'dateTime', nullable: false },
        updated_at: { type: 'dateTime', nullable: true },
        '@@PRIMARY_KEY@@': ['metafield_key', 'path', 'member_id'],
        '@@INDEXES@@': [['member_id']],
      },
    ],
    [
      BINDINGS,
      {
        id: { type: 'string', maxlength: 24, nullable: false, primary: true },
        port: { type: 'string', maxlength: 191, nullable: false, unique: true },
        metafield_key: KEY_BY_KEY,
        created_at: { type: 'dateTime', nullable: false },
        updated_at: { type: 'dateTime', nullable: true },
        '@@INDEXES@@': [['metafield_key']],
      },
    ],
  ],
};

async function bindingsPointAtFields(connection) {
  if (DatabaseInfo.isSQLite(connection)) {
    const foreignKeys = await connection.raw(`PRAGMA foreign_key_list('${BINDINGS}')`);
    return foreignKeys.some((key) => key.table === FIELDS);
  }
  const [rows] = await connection.raw(
    `SELECT 1 FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND REFERENCED_TABLE_NAME = ?`,
    [BINDINGS, FIELDS],
  );
  return rows.length > 0;
}

/**
 * Whether every table is fully built in `shape`. The tables are built in order and each
 * one's statements in turn, so that holds once the statement sent last for the bindings,
 * the last table, has run. A set a crash left half-built is rebuilt.
 */
async function isBuilt(connection, shape) {
  if (!(await connection.schema.hasTable(BINDINGS))) {
    return false;
  }
  const hasNamespace = await connection.schema.hasColumn(BINDINGS, 'metafield_namespace');
  if (hasNamespace !== shape.bindingsHaveNamespace) {
    return false;
  }
  return (
    (await commands.getIndexes(BINDINGS, connection)).includes(shape.bindingsLastIndex) &&
    bindingsPointAtFields(connection)
  );
}

async function rebuild(connection, shape) {
  /* eslint-disable no-restricted-syntax */
  for (const [table] of [...shape.tables].reverse()) {
    if (await connection.schema.hasTable(table)) {
      const { count } = await connection(table).count('* as count').first();
      logging.warn(`Discarding ${count} rows from ${table} to rebuild it ${shape.description}`);
      logging.info(`Dropping table: ${table}`);
      await commands.deleteTable(table, connection);
    } else {
      logging.warn(`Skipping dropping table: ${table} - table does not exist`);
    }
  }

  for (const [table, spec] of shape.tables) {
    logging.info(`Adding table: ${table}`);
    await commands.createTable(table, connection, spec);
  }
  /* eslint-enable no-restricted-syntax */
}

module.exports = createNonTransactionalMigration(
  async function up(connection) {
    // Also what the replay suite finds, running this against the final schema.
    if (await isBuilt(connection, NAMESPACED)) {
      logging.warn('Skipping rebuilding the member metafield tables - they have namespaces');
      return;
    }
    await rebuild(connection, NAMESPACED);
  },
  async function down(connection) {
    if (await isBuilt(connection, KEYED_BY_KEY)) {
      logging.warn('Skipping rebuilding the member metafield tables - they have no namespaces');
      return;
    }
    await rebuild(connection, KEYED_BY_KEY);
  },
);
