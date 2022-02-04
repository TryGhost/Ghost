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
    async function down() {
        logging.warn('Not changing emails.recipient_filter column');
    }
);
