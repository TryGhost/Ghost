// For information on writing migrations, see https://www.notion.so/ghost/Database-migrations-eb5b78c435d741d2b34a582d57c24253

// For DML - data changes
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        await knex.raw(`
            DELETE FROM jobs
            WHERE name = 'email-analytics-latest-opened' OR name = 'email-analytics-latest-others' OR name = 'email-analytics-missing';
        `);
    },
    // down is a no-op
    async function down() {}
);