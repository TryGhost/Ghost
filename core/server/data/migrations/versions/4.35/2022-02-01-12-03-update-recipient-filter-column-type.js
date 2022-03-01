const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');
const DatabaseInfo = require('@tryghost/database-info');

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        if (DatabaseInfo.isSQLite(knex)) {
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
