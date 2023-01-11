const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        logging.info('Clearing suppressions table');
        await knex('suppressions').truncate();
    },
    async function down() {
        logging.info('Not doing anything - table has been truncated');
    }
);
