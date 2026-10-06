const logging = require('@tryghost/logging');
const { commands } = require('../../../schema');
const { createNonTransactionalMigration } = require('../../utils');

// Stripe Checkout no longer asks publisher questions, so the table that held how each tier
// asked them goes. The feature is behind the private `stripeCheckoutCollection` flag, so
// nothing on a released site holds anything here.
//
// The bindings the questions hung off are left in place: nothing routes through them any
// more, because a completed checkout only reports the values Stripe collects itself.

const TABLE = 'products_checkout_fields';

// Pinned as it stands in schema.js before this migration, so `down` keeps rebuilding the
// same shape however schema.js moves on.
const SPEC = {
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
