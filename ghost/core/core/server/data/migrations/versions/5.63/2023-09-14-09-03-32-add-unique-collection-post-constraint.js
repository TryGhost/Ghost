const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');
const {addUnique} = require('../../../schema/commands');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Adding unique constraints to collections_posts table for collection_id and post_id');

        await addUnique('collections_posts', ['collection_id', 'post_id'], knex);
    },
    async function down() {
        // no-op because we'd need to drop FK in MySQL to drop the unique key constraint
    }
);
