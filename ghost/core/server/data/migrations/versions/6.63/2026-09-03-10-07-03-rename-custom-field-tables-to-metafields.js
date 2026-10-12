const logging = require('@tryghost/logging');
const { commands } = require('../../../schema');
const { createNonTransactionalMigration } = require('../../utils');

// The tables that held member custom fields are renamed to metafields, the name the API
// and the rest of the domain already use. Dropped and recreated rather than renamed in
// place: the feature is behind the `membersCustomFields` flag with no released data, so
// there is nothing to carry across, and rebuilding gives every foreign key and index the
// new name without a per-dialect rename dance.
//
// `products_checkout_fields` keeps its name but is rebuilt too, because its foreign key
// points at the bindings table and would otherwise reference a table that no longer
// exists.
const DROP_ORDER = [
  'products_checkout_fields',
  'members_custom_field_bindings',
  'members_custom_field_values',
  'members_custom_fields',
];

// Specs pinned as they stand in schema.js at the time of writing, per the migration rules:
// this file must keep building the same shape however schema.js moves on.
const CREATE_ORDER = [
  [
    'members_metafields',
    {
      id: { type: 'string', maxlength: 24, nullable: false, primary: true },
      key: { type: 'string', maxlength: 191, nullable: false, unique: true },
      name: { type: 'string', maxlength: 191, nullable: false, unique: true },
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
      sort_order: { type: 'integer', nullable: false, unsigned: true, defaultTo: 0 },
      created_at: { type: 'dateTime', nullable: false },
      updated_at: { type: 'dateTime', nullable: true },
    },
  ],
  [
    'members_metafield_values',
    {
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
      metafield_key: {
        type: 'string',
        maxlength: 191,
        nullable: false,
        references: 'members_metafields.key',
        cascadeDelete: true,
      },
      created_at: { type: 'dateTime', nullable: false },
      updated_at: { type: 'dateTime', nullable: true },
      '@@UNIQUE_CONSTRAINTS@@': [
        { columns: ['product_id', 'port'], indexName: 'members_metafield_bindings_unique' },
      ],
      '@@INDEXES@@': [['metafield_key']],
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

module.exports = createNonTransactionalMigration(
  async function up(connection) {
    // The whole migration hangs on the old definitions table being there. A fresh install
    // builds the new names straight from schema.js, and the replay suite runs this against
    // that same final schema, so both reach here with nothing to rename — and must not
    // drop `products_checkout_fields`, which by then is already pointing at the new
    // bindings table.
    if (!(await connection.schema.hasTable('members_custom_fields'))) {
      logging.warn('Skipping the metafield table rename - members_custom_fields does not exist');
      return;
    }

    // Both loops walk a fixed list of four tables, in an order foreign keys dictate, so
    // the usual objection to looping in a migration — that it scales with the rows a site
    // happens to hold — does not apply.
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
      if (await connection.schema.hasTable(name)) {
        logging.warn(`Skipping adding table: ${name} - table already exists`);
      } else {
        logging.info(`Adding table: ${name}`);
        await commands.createTable(name, connection, spec);
      }
    }
    /* eslint-enable no-restricted-syntax */
  },
  async function down() {
    // Irreversible in the only sense that matters: the old tables can be rebuilt, but
    // whatever they held cannot, and nothing on a released site holds anything.
    logging.warn('Ignoring rollback for the custom field to metafield table rename');
  },
);
