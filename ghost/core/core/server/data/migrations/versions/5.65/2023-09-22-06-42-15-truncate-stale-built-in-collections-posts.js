const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        logging.info('Clearing collections_posts table');
        await knex('collections_posts').truncate();
    },
    async function down() {
        logging.info('Not doing anything - collections_posts table has been truncated');
    }
);
