// For information on writing migrations, see https://www.notion.so/ghost/Database-migrations-eb5b78c435d741d2b34a582d57c24253

const logging = require('@tryghost/logging');

// For DDL - schema changes
// const {createNonTransactionalMigration} = require('../../utils');

// For DML - data changes
const {createTransactionalMigration} = require('../../utils');

// Or use a specific helper
// const {addTable, createAddColumnMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        try {
            // find the existing donations_suggested_amount setting
            const existingSuggestedAmount = await knex('settings')
                .where({key: 'donations_suggested_amount'})
                .first();

            // previous default is '0', if it's been set to something else we don't want to change it
            if (existingSuggestedAmount.value !== '0') {
                logging.info('donations_suggested_amount setting does not have previous default of 0, skipping migration');
                return;
            }

            // new default is '500', update the setting
            logging.info('Updating donations_suggested_amount default setting to 500');
            await knex('settings')
                .where({key: 'donations_suggested_amount'})
                .update({value: '500'});
        } catch (error) {
            logging.error(`Error updating donations_suggested_amount setting: ${error.message}`);
        }
    },
    async function down() {
        // no-op
        // we can't guarantee that a suggested amount of 500 now isn't
        // something that was set explicitly
    }
);
