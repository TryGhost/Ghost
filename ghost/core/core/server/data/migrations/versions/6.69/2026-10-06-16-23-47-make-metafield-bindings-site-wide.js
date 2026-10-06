const logging = require('@tryghost/logging');
const { commands } = require('../../../schema');
const { createNonTransactionalMigration } = require('../../utils');

// Stripe Checkout now collects into the same field whichever tier was bought, so a binding
// belongs to the site rather than to a tier and `product_id` goes. The table is rebuilt
// rather than altered: SQLite cannot drop a column that holds a foreign key in place, and
// the feature is behind the private `stripeCheckoutCollection` flag, so its rows are
// discarded both ways rather than converted.

const TABLE = 'members_metafield_bindings';

// Both shapes are pinned as they stand in schema.js at the time of writing, so this keeps
// building them however schema.js moves on.
const SITE_WIDE = {
  id: { type: 'string', maxlength: 24, nullable: false, primary: true },
  port: { type: 'string', maxlength: 191, nullable: false, unique: true },
  metafield_key: {
    type: 'string',
    maxlength: 191,
    nullable: false,
    references: 'members_metafields.key',
    cascadeDelete: true,
  },
  created_at: { type: 'dateTime', nullable: false },
  updated_at: { type: 'dateTime', nullable: true },
  '@@INDEXES@@': [['metafield_key']],
};

const PER_TIER = {
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
};

async function rebuild(connection, spec, description) {
  logging.warn(`Discarding every row in ${TABLE} to make bindings ${description}`);
  await commands.deleteTable(TABLE, connection);
  await commands.createTable(TABLE, connection, spec);
}

module.exports = createNonTransactionalMigration(
  async function up(connection) {
    // Guarded on the column rather than on a record of having run: the migration suite
    // replays this against a database already in its final shape.
    if (!(await connection.schema.hasColumn(TABLE, 'product_id'))) {
      logging.warn(`Skipping rebuilding ${TABLE} - bindings are already site-wide`);
      return;
    }
    await rebuild(connection, SITE_WIDE, 'site-wide');
  },
  async function down(connection) {
    if (await connection.schema.hasColumn(TABLE, 'product_id')) {
      logging.warn(`Skipping rebuilding ${TABLE} - bindings are already per tier`);
      return;
    }
    await rebuild(connection, PER_TIER, 'per tier');
  },
);
