const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');

/**
 * Note: This doesn't use knex.alterTable as it doesn't work for down migration.
 * It tries to insert a `null` into non `nullable` column while altering column
 */
module.exports = createNonTransactionalMigration(
    async function up(knex) {
        logging.info('Dropping NOT NULL constraint for: sender_name in table: newsletters');

        await knex.schema.table('newsletters', function (table) {
            table.dropColumn('sender_name');
        });

        await knex.schema.table('newsletters', function (table) {
            table.string('sender_name', 191).nullable();
        });
    },
    async function down(knex) {
        logging.info('Adding NOT NULL constraint for: sender_name in table: newsletters');

        await knex.schema.table('newsletters', function (table) {
            table.dropColumn('sender_name');
        });

        await knex.schema.table('newsletters', function (table) {
            // SQLite doesn't allow adding a non nullable column without any default
            table.string('sender_name', 191).notNullable().defaultTo('Ghost');
        });
    }
);

