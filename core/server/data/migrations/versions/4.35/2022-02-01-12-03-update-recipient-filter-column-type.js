const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        if (knex.client.config.client === 'sqlite3') {
            logging.warn('Skipping migration for SQLite3');
            return;
        }
        logging.info('Changing emails.recipient_filter column from VARCHAR(50) to TEXT');
        await knex.schema.alterTable('emails', function (table) {
            table.text('recipient_filter').alter();
        });
    },
    async function down(knex) {
        if (knex.client.config.client === 'sqlite3') {
            logging.warn('Skipping migration for SQLite3');
            return;
        }
        logging.info('Changing emails.recipient_filter column from TEXT to VARCHAR(50)');
        knex.schema.alterTable('emails', function (table) {
            table.string('recipient_filter', 50).alter();
        });
    }
);
