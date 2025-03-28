// For information on writing migrations, see https://www.notion.so/ghost/Database-migrations-eb5b78c435d741d2b34a582d57c24253

const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

// For DDL - schema changes
// const {createNonTransactionalMigration} = require('../../utils');

// For DML - data changes
// const {createTransactionalMigration} = require('../../utils');

// Or use a specific helper
// const {addTable, createAddColumnMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up() {
        // don't do anything
        // we don't want to change the active theme automatically
    },
    async function down(knex) {
        // If the active theme is `source`, we want to revert the active theme to `casper`
        // `source` is introduced in 5.67, so it does not exist in < 5.67
        // Without this change, rolling back from 5.67 to < 5.67 results in an error:
        // The currently active theme "source" is missing.
        const rows = await knex
            .select('value')
            .from('settings')
            .where({key: 'active_theme', value: 'source'});
        
        if (rows.length === 0) {
            logging.info(`Currently installed theme is not source - skipping migration`);
            return;
        }

        logging.info(`Resetting the active theme to casper`);
        await knex('settings')
            .where('key', 'active_theme')
            .update({value: 'casper'});
    }
);