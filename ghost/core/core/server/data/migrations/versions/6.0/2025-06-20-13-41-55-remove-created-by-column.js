const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');

async function dropCreatedBy(knex, table) {
    const hasCreatedBy = await knex.schema.hasColumn(table, 'created_by');

    if (hasCreatedBy) {
        logging.info(`Dropping created_by from ${table}`);

        await knex.schema.alterTable(table, function (t) {
            t.dropColumn('created_by');
        });
    } else {
        logging.info(`${table} does not have created_by - skipping`);
    }
}

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        logging.info('Dropping created_by from all tables');

        await dropCreatedBy(knex, 'posts');
        await dropCreatedBy(knex, 'users');
        await dropCreatedBy(knex, 'roles');
        await dropCreatedBy(knex, 'permissions');
        await dropCreatedBy(knex, 'settings');
        await dropCreatedBy(knex, 'tags');
        await dropCreatedBy(knex, 'invites');
        await dropCreatedBy(knex, 'integrations');
        await dropCreatedBy(knex, 'webhooks');
        await dropCreatedBy(knex, 'api_keys');
        await dropCreatedBy(knex, 'members');
        await dropCreatedBy(knex, 'labels');
        await dropCreatedBy(knex, 'members_stripe_customers');
        await dropCreatedBy(knex, 'members_stripe_customers_subscriptions');
        await dropCreatedBy(knex, 'emails');
        await dropCreatedBy(knex, 'tokens');
        await dropCreatedBy(knex, 'snippets');

        logging.info('created_by dropped from all tables');
    },

    async function down() {
        // Major version migrations are not reversible
        logging.warn('Reverting removal of created_by is not supported');
    }
);
