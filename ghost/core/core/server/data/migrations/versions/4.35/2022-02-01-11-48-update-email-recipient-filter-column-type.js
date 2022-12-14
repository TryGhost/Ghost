const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');
const DatabaseInfo = require('@tryghost/database-info');

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        if (DatabaseInfo.isSQLite(knex)) {
            logging.warn('Skipping migration for SQLite3');
            return;
        }
        logging.info('Changing posts.email_recipient_filter column from VARCHAR(50) to TEXT');
        await knex.schema.alterTable('posts', function (table) {
            table.text('email_recipient_filter').alter();
        });
    },
    async function down() {
        logging.warn('Not changing posts.email_recipient_filter column');
    }
);
