const logging = require('@tryghost/logging');
const { commands } = require('../../../schema');
const { createNonTransactionalMigration } = require('../../utils');

// A tier's checkout options are replaced by the site-wide `stripe_checkout_config` row.
// The feature is behind the private `stripeCheckoutCollection` flag, so nothing here is
// carried across.

const TABLE = 'products_checkout_config';

// Pinned as it stands in schema.js before this migration, so `down` keeps rebuilding the
// same shape however schema.js moves on.
const SPEC = {
  id: { type: 'string', maxlength: 24, nullable: false, primary: true },
  product_id: {
    type: 'string',
    maxlength: 24,
    nullable: false,
    unique: true,
    references: 'products.id',
    cascadeDelete: true,
  },
  shipping_allowed_countries: { type: 'string', maxlength: 2000, nullable: true },
  tax_number_collect: { type: 'boolean', nullable: false, defaultTo: false },
  created_at: { type: 'dateTime', nullable: false },
  updated_at: { type: 'dateTime', nullable: true },
};

module.exports = createNonTransactionalMigration(
  async function up(connection) {
    if (!(await connection.schema.hasTable(TABLE))) {
      logging.warn(`Skipping dropping table: ${TABLE} - table does not exist`);
      return;
    }

    logging.info(`Dropping table: ${TABLE}`);
    await commands.deleteTable(TABLE, connection);
  },
  async function down(connection) {
    if (await connection.schema.hasTable(TABLE)) {
      logging.warn(`Skipping adding table: ${TABLE} - table already exists`);
      return;
    }

    logging.info(`Adding table: ${TABLE}`);
    await commands.createTable(TABLE, connection, SPEC);
  },
);
