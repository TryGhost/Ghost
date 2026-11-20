const logging = require('@tryghost/logging');
const DatabaseInfo = require('@tryghost/database-info');
const { commands } = require('../../../schema');
const { createNonTransactionalMigration } = require('../../utils');

const TABLE = 'members_metafield_values';

// Rebuilt rather than altered, both ways, discarding the values it holds. The feature is
// behind the private `membersCustomFields` flag, so only a site that opted into it can hold
// any, and SQLite can only change a primary key by rebuilding the table anyway. Not the
// `recreateTable` helper: it skips a missing table, so a crash between its drop and its
// create would leave the table gone for good.
//
// Both shapes are pinned as they stand in schema.js, per the migration rules: this file must
// keep building them however schema.js moves on.
const KEYED_BY_FIELD = {
  lastIndex: 'members_metafield_values_member_id_index',
  spec: {
    metafield_key: {
      type: 'string',
      maxlength: 191,
      nullable: false,
      references: 'members_metafields.key',
      cascadeDelete: true,
    },
    member_id: {
      type: 'string',
      maxlength: 24,
      nullable: false,
      references: 'members.id',
      cascadeDelete: true,
    },
    path: { type: 'string', maxlength: 191, nullable: false, defaultTo: '' },
    value_text: { type: 'text', maxlength: 65535, nullable: false },
    written_by_type: { type: 'string', maxlength: 50, nullable: false },
    written_by_id: { type: 'string', maxlength: 24, nullable: true },
    created_at: { type: 'dateTime', nullable: false },
    updated_at: { type: 'dateTime', nullable: true },
    '@@PRIMARY_KEY@@': ['metafield_key', 'path', 'member_id'],
    '@@INDEXES@@': [['member_id']],
  },
};

const KEYED_BY_ID = {
  lastIndex: 'members_metafield_values_leaf_unique',
  spec: {
    id: { type: 'string', maxlength: 24, nullable: false, primary: true },
    metafield_key: {
      type: 'string',
      maxlength: 191,
      nullable: false,
      references: 'members_metafields.key',
      cascadeDelete: true,
    },
    member_id: {
      type: 'string',
      maxlength: 24,
      nullable: false,
      references: 'members.id',
      cascadeDelete: true,
    },
    path: { type: 'string', maxlength: 191, nullable: false, defaultTo: '' },
    value_text: { type: 'text', maxlength: 65535, nullable: true },
    written_by_type: { type: 'string', maxlength: 50, nullable: false },
    written_by_id: { type: 'string', maxlength: 24, nullable: true },
    created_at: { type: 'dateTime', nullable: false },
    updated_at: { type: 'dateTime', nullable: true },
    '@@UNIQUE_CONSTRAINTS@@': [
      {
        columns: ['member_id', 'metafield_key', 'path'],
        indexName: 'members_metafield_values_leaf_unique',
      },
    ],
    '@@INDEXES@@': [['metafield_key', 'path']],
  },
};

async function hasMemberForeignKey(connection) {
  if (DatabaseInfo.isSQLite(connection)) {
    const foreignKeys = await connection.raw(`PRAGMA foreign_key_list('${TABLE}')`);
    return foreignKeys.some((key) => key.from === 'member_id' && key.table === 'members');
  }
  const [rows] = await connection.raw(
    `SELECT 1 FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = 'member_id'
      AND REFERENCED_TABLE_NAME = 'members'`,
    [TABLE],
  );
  return rows.length > 0;
}

/**
 * Whether the table is fully built in `shape`. A table counts only once the statement
 * `createTable` sends last has run, so one a crash left half-built is rebuilt.
 */
async function isBuilt(connection, shape) {
  if (!(await connection.schema.hasTable(TABLE))) {
    return false;
  }
  const hasId = await connection.schema.hasColumn(TABLE, 'id');
  if (hasId !== Object.hasOwn(shape.spec, 'id')) {
    return false;
  }
  // SQLite creates foreign keys with the table and sends the indexes after it, so the
  // shape's last index comes last; MySQL adds the foreign keys after the indexes, the
  // member's last.
  return (
    (await commands.getIndexes(TABLE, connection)).includes(shape.lastIndex) &&
    hasMemberForeignKey(connection)
  );
}

async function rebuild(connection, shape, description) {
  if (await connection.schema.hasTable(TABLE)) {
    const { count } = await connection(TABLE).count('* as count').first();
    logging.warn(`Discarding ${count} member metafield values to rebuild ${TABLE} ${description}`);
    logging.info(`Dropping table: ${TABLE}`);
    await commands.deleteTable(TABLE, connection);
  } else {
    logging.warn(`Skipping dropping table: ${TABLE} - table does not exist`);
  }

  logging.info(`Adding table: ${TABLE}`);
  await commands.createTable(TABLE, connection, shape.spec);
}

module.exports = createNonTransactionalMigration(
  async function up(connection) {
    // Also what the replay suite finds, running this against the final schema.
    if (await isBuilt(connection, KEYED_BY_FIELD)) {
      logging.warn(`Skipping rebuilding table: ${TABLE} - it is already keyed by field`);
      return;
    }
    await rebuild(connection, KEYED_BY_FIELD, 'keyed by field');
  },
  async function down(connection) {
    if (await isBuilt(connection, KEYED_BY_ID)) {
      logging.warn(`Skipping rebuilding table: ${TABLE} - it is already keyed by id`);
      return;
    }
    await rebuild(connection, KEYED_BY_ID, 'keyed by id');
  },
);
