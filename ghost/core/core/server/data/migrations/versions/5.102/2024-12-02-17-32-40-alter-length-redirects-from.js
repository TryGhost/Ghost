// For information on writing migrations, see https://www.notion.so/ghost/Database-migrations-eb5b78c435d741d2b34a582d57c24253

const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        logging.info('Altering length of redirects.from');
        await knex.schema.alterTable('redirects', function (table) {
            table.string('from', 191).notNullable().alter();
        });
    },
    async function down(knex) {
        logging.info('Reverting length of redirects.from');
        await knex.schema.alterTable('redirects', function (table) {
            table.string('from', 191).notNullable().alter();
        });
    }
);
