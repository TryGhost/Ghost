const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info(`Updating posts with invalid statuses to 'draft'`);

        const affectedRows = await knex('posts')
            .update('status', 'draft')
            .whereNotIn('status', ['published', 'draft', 'scheduled', 'sent']);

        logging.info(`Updated ${affectedRows} posts with invalid statuses to 'draft'`);
    },
    async function down() {
        // no-op: we don't want to set posts back to invalid statuses
    }
);