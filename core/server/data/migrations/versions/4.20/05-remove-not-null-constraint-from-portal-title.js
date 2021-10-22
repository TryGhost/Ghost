const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        logging.info('Dropping NOT NULL constraint for: portal_title in table: offers');

        await knex.schema.table('offers', function (table) {
            table.dropColumn('portal_title');
        });

        await knex.schema.table('offers', function (table) {
            table.string('portal_title', 191).nullable();
        });
    },
    async function down(knex) {
        logging.info('Adding NOT NULL constraint for: portal_title in table: offers');

        await knex.schema.table('offers', function (table) {
            table.dropColumn('portal_title');
        });

        await knex.schema.table('offers', function (table) {
            table.string('portal_title', 191).notNullable();
        });
    }
);

