const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        if (knex.client.config.client === 'sqlite3') {
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
