// For information on writing migrations, see https://www.notion.so/ghost/Database-migrations-eb5b78c435d741d2b34a582d57c24253

const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

// old default was null but that doesn't match our existing button behaviour
// of rendering accent colored buttons. Update all `null` values to `'accent'`

module.exports = createTransactionalMigration(
    async function up(knex) {
        try {
            logging.info('Changing newsletters.button_color default to "accent"');
            await knex.schema.alterTable('newsletters', function (table) {
                table.string('button_color', 50).defaultTo('accent').alter();
            });
            await knex('newsletters')
                .whereNull('button_color')
                .update({button_color: 'accent'});
        } catch (error) {
            logging.error(`Error changing newsletters.button_color default to "accent": ${error.message}`);
        }
    },
    async function down(knex) {
        // we don't know if a button color was intentionally set to 'accent'
        // and the setting hasn't been used before so we don't change any data

        // we'll still update the default value to match previous database schema
        try {
            logging.info('Changing newsletters.button_color default to NULL');
            await knex.schema.alterTable('newsletters', function (table) {
                table.string('button_color', 50).defaultTo(null).alter();
            });
        } catch (error) {
            logging.error(`Error changing newsletters.button_color default to NULL: ${error.message}`);
        }
    }
);