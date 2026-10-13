const logging = require('@tryghost/logging');
const { createNonTransactionalMigration } = require('../../utils');
const DatabaseInfo = require('@tryghost/database-info');

// Stripe allows a price nickname of up to 255 characters, but the column that
// snapshots it on the subscription row only held 50. Widening it matches the
// stripe_prices.nickname column, which was widened the same way in 5.93.
module.exports = createNonTransactionalMigration(
  async function up(knex) {
    if (DatabaseInfo.isSQLite(knex)) {
      logging.warn(
        'Skipping migration for SQLite3 (fixed-length VARCHAR columns are not enforced)',
      );
      return;
    }

    logging.info(
      'Changing members_stripe_customers_subscriptions.plan_nickname column from VARCHAR(50) to VARCHAR(255)',
    );
    await knex.schema.alterTable('members_stripe_customers_subscriptions', function (table) {
      // .alter() rebuilds the whole column definition, so NOT NULL must be restated
      table.string('plan_nickname', 255).notNullable().alter();
    });
  },
  async function down() {
    logging.warn(
      'Not shrinking members_stripe_customers_subscriptions.plan_nickname column back to VARCHAR(50) as that could truncate stored nicknames',
    );
  },
);
