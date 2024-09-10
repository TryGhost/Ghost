const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');
const DatabaseInfo = require('@tryghost/database-info');

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        if (DatabaseInfo.isSQLite(knex)) {
            logging.warn('Skipping migration for SQLite3');
            return;
        }
        logging.info('Changing stripe_prices.nickname column from VARCHAR(50) to VARCHAR(255)');
        await knex.schema.alterTable('stripe_prices', function (table) {
            table.string('nickname', 255).alter();
        });
    },
    async function down() {
        logging.warn('Not changing stripe_prices.nickname column');
    }
);
