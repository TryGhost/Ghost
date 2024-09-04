// For information on writing migrations, see https://www.notion.so/ghost/Database-migrations-eb5b78c435d741d2b34a582d57c24253

const logging = require('@tryghost/logging');

// For DML - data changes
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        try {
            await knex.raw(`
                DELETE FROM jobs
                WHERE name = 'email-analytics-latest-opened' OR name = 'email-analytics-latest-others' OR name = 'email-analytics-missing';
            `);
        } catch (error) {
            logging.info(`Failed to delete email analytics jobs: ${error.message}`);
        }
    },
    // down is a no-op
    async function down() {}
);