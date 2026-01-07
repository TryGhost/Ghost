const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');

// newsletters.link_color was supposed to have a default value of 'accent' to match pre-emailCustomization behaviour
module.exports = createNonTransactionalMigration(
    async function up(knex) {
        logging.info('Setting newsletters.link_color default to "accent"');
        await knex.schema.alterTable('newsletters', function (table) {
            table.string('link_color', 50).nullable().defaultTo('accent').alter();
        });
    },
    async function down(knex) {
        logging.info('Changing newsletters.link_color default to NULL');
        await knex.schema.alterTable('newsletters', function (table) {
            table.string('link_color', 50).nullable().defaultTo(null).alter();
        });
    }
);