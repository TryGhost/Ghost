const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info(`Updating users with invalid statuses to 'inactive'`);

        const affectedRows = await knex('users')
            .update('status', 'inactive')
            .whereNotIn('status', ['active', 'inactive', 'locked', 'warn-1', 'warn-2', 'warn-3', 'warn-4']);

        logging.info(`Updated ${affectedRows} users with invalid statuses to 'inactive'`);
    },
    async function down() {
        // no-op: we don't want to revert users back to an invalid status
    }
);