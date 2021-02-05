const {createNonTransactionalMigration} = require('../../utils');
const logging = require('../../../../../shared/logging');

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        if (knex.client.config.client === 'mysql') {
            logging.info('Altering canonical_url type from text to string');
            await knex.schema.alterTable('posts', (table) => {
                table.string('canonical_url', 2000).nullable().alter();
            });
        } else {
            // TODO: this column creation dance should become a utility
            await knex.schema.alterTable('posts', (table) => {
                table.string('canonical_url_tmp', 2000).nullable();
            });

            await knex('posts')
                .update('canonical_url_tmp', knex.ref('canonical_url'));

            await knex.schema.table('posts', (table) => {
                table.dropColumn('canonical_url');
            });

            await knex.schema.alterTable('posts', (table) => {
                table.string('canonical_url', 2000).nullable();
            });

            await knex('posts')
                .update('canonical_url', knex.ref('canonical_url_tmp'));

            await knex.schema.table('posts', (table) => {
                table.dropColumn('canonical_url_tmp');
            });
        }
    },
    async function down() {
        // noop - we can't add a not null constraint after some of the columns have been nulled
    }
);
