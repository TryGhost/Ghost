const logging = require('@tryghost/logging');
const { commands } = require('../../../schema');
const { createNonTransactionalMigration } = require('../../utils');

// Dropped and rebuilt rather than altered, discarding what the tables hold. The feature
// is behind the private `membersCustomFields` flag, so no released site holds anything,
// and SQLite can only change a foreign key or a primary key by rebuilding the table anyway.
// `products_checkout_fields` is rebuilt too: its foreign key points at the bindings table.
const DROP_ORDER = [
  'products_checkout_fields',
  'members_metafield_bindings',
  'members_metafield_values',
  'members_metafields',
];

// Specs pinned as they stand in schema.js at the time of writing, per the migration rules:
// this file must keep building the same shape however schema.js moves on.
const CREATE_ORDER = [
  [
    'members_metafields',
    {
      id: { type: 'string', maxlength: 24, nullable: false, primary: true },
      namespace: { type: 'string', maxlength: 191, nullable: false, pattern: '^[a-z0-9_]+$' },
      key: { type: 'string', maxlength: 191, nullable: false, pattern: '^[a-z0-9_]+$' },
      name: { type: 'string', maxlength: 191, nullable: false },
      type: {
        type: 'string',
        maxlength: 50,
        nullable: false,
        validations: { isIn: [['short_text', 'long_text', 'address']] },
      },
      status: {
        type: 'string',
        maxlength: 50,
        nullable: false,
        defaultTo: 'active',
        validations: { isIn: [['active', 'archived']] },
      },
      member_access: {
        type: 'string',
        maxlength: 50,
        nullable: false,
        defaultTo: 'none',
        validations: { isIn: [['none', 'read', 'write']] },
      },
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
    'members_metafield_values',
    {
      metafield_namespace: { type: 'string', maxlength: 191, nullable: false },
      metafield_key: { type: 'string', maxlength: 191, nullable: false },
      path: { type: 'string', maxlength: 191, nullable: false, defaultTo: '' },
      member_id: {
        type: 'string',
        maxlength: 24,
        nullable: false,
        references: 'members.id',
        cascadeDelete: true,
      },
      value_text: { type: 'text', maxlength: 65535, nullable: true },
      written_by_type: { type: 'string', maxlength: 50, nullable: false },
      written_by_id: { type: 'string', maxlength: 24, nullable: true },
      created_at: { type: 'dateTime', nullable: false },
      updated_at: { type: 'dateTime', nullable: true },
      '@@PRIMARY_KEY@@': ['metafield_namespace', 'metafield_key', 'path', 'member_id'],
      '@@INDEXES@@': [['member_id']],
      '@@FOREIGN_KEYS@@': [
        {
          columns: ['metafield_namespace', 'metafield_key'],
          references: { table: 'members_metafields', columns: ['namespace', 'key'] },
          constraintName: 'members_metafield_values_metafield_foreign',
          cascadeDelete: true,
        },
      ],
    },
  ],
  [
    'members_metafield_bindings',
    {
      id: { type: 'string', maxlength: 24, nullable: false, primary: true },
      product_id: {
        type: 'string',
        maxlength: 24,
        nullable: false,
        references: 'products.id',
        cascadeDelete: true,
      },
      port: { type: 'string', maxlength: 191, nullable: false },
      metafield_namespace: { type: 'string', maxlength: 191, nullable: false },
      metafield_key: { type: 'string', maxlength: 191, nullable: false },
      created_at: { type: 'dateTime', nullable: false },
      updated_at: { type: 'dateTime', nullable: true },
      '@@UNIQUE_CONSTRAINTS@@': [
        { columns: ['product_id', 'port'], indexName: 'members_metafield_bindings_unique' },
      ],
      '@@INDEXES@@': [
        {
          columns: ['metafield_namespace', 'metafield_key'],
          indexName: 'members_metafield_bindings_metafield_index',
        },
      ],
      '@@FOREIGN_KEYS@@': [
        {
          columns: ['metafield_namespace', 'metafield_key'],
          references: { table: 'members_metafields', columns: ['namespace', 'key'] },
          constraintName: 'members_metafield_bindings_metafield_foreign',
          cascadeDelete: true,
        },
      ],
    },
  ],
  [
    'products_checkout_fields',
    {
      id: { type: 'string', maxlength: 24, nullable: false, primary: true },
      binding_id: {
        type: 'string',
        maxlength: 24,
        nullable: false,
        unique: true,
        references: 'members_metafield_bindings.id',
        cascadeDelete: true,
      },
      sort_order: { type: 'integer', nullable: false, unsigned: true, defaultTo: 0 },
      label: { type: 'string', maxlength: 191, nullable: true },
      optional: { type: 'boolean', nullable: false, defaultTo: true },
      created_at: { type: 'dateTime', nullable: false },
      updated_at: { type: 'dateTime', nullable: true },
    },
  ],
];

/**
 * Whether every table already has the shape this migration builds. A fresh install builds
 * it straight from schema.js, and the replay suite runs this against that same final
 * schema, so both arrive here with nothing to do. Any other state, including one a crash
 * halfway through left behind, is rebuilt from scratch.
 */
async function isRebuilt(connection) {
  return (
    (await connection.schema.hasColumn('members_metafields', 'namespace')) &&
    (await connection.schema.hasColumn('members_metafield_values', 'metafield_namespace')) &&
    (await connection.schema.hasColumn('members_metafield_bindings', 'metafield_namespace')) &&
    (await connection.schema.hasTable('products_checkout_fields'))
  );
}

module.exports = createNonTransactionalMigration(
  async function up(connection) {
    if (await isRebuilt(connection)) {
      logging.warn('Skipping the metafield namespace rebuild - the tables already have it');
      return;
    }

    logging.warn(
      'Discarding every member metafield definition, value and binding, and every checkout question, to rebuild their tables with namespaces',
    );

    // Both loops walk a fixed list of four tables, in an order foreign keys dictate, so
    // the usual objection to looping in a migration, that it scales with the rows a site
    // happens to hold, does not apply.
    /* eslint-disable no-restricted-syntax */
    for (const name of DROP_ORDER) {
      if (await connection.schema.hasTable(name)) {
        logging.info(`Dropping table: ${name}`);
        await commands.deleteTable(name, connection);
      } else {
        logging.warn(`Skipping dropping table: ${name} - table does not exist`);
      }
    }

    for (const [name, spec] of CREATE_ORDER) {
      logging.info(`Adding table: ${name}`);
      await commands.createTable(name, connection, spec);
    }
    /* eslint-enable no-restricted-syntax */
  },
  async function down() {
    // Irreversible in the only sense that matters: the old shape could be rebuilt, but not
    // what it held, and nothing on a released site holds anything.
    logging.warn('Ignoring rollback for the metafield namespace rebuild');
  },
);
