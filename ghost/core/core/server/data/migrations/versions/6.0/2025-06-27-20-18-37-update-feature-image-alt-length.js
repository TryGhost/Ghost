const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');
const DatabaseInfo = require('@tryghost/database-info');

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        if (DatabaseInfo.isSQLite(knex)) {
            logging.warn('Skipping migration for SQLite3');
            return;
        }
        
        logging.info('Changing posts_meta.feature_image_alt column from VARCHAR(191) to VARCHAR(300)');
        await knex.schema.alterTable('posts_meta', function (table) {
            table.string('feature_image_alt', 300).alter();
        });

        logging.info('Changing post_revisions.feature_image_alt column from VARCHAR(191) to VARCHAR(300)');
        await knex.schema.alterTable('post_revisions', function (table) {
            table.string('feature_image_alt', 300).alter();
        });
    },
    async function down() {
        logging.warn('Not changing posts_meta.feature_image_alt column');
        logging.warn('Not changing post_revisions.feature_image_alt column');
    }
);
