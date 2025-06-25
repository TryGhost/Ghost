const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');

async function dropUpdatedBy(knex, table) {
    const hasUpdatedBy = await knex.schema.hasColumn(table, 'updated_by');

    if (hasUpdatedBy) {
        logging.info(`Dropping updated_by from ${table}`);

        await knex.schema.alterTable(table, function (t) {
            t.dropColumn('updated_by');
        });
    } else {
        logging.info(`${table} does not have updated_by - skipping`);
    }
}

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        logging.info('Dropping updated_by from all tables');

        await dropUpdatedBy(knex, 'posts');
        await dropUpdatedBy(knex, 'users');
        await dropUpdatedBy(knex, 'roles');
        await dropUpdatedBy(knex, 'permissions');
        await dropUpdatedBy(knex, 'settings');
        await dropUpdatedBy(knex, 'tags');
        await dropUpdatedBy(knex, 'invites');
        await dropUpdatedBy(knex, 'integrations');
        await dropUpdatedBy(knex, 'webhooks');
        await dropUpdatedBy(knex, 'api_keys');
        await dropUpdatedBy(knex, 'members');
        await dropUpdatedBy(knex, 'labels');
        await dropUpdatedBy(knex, 'members_stripe_customers');
        await dropUpdatedBy(knex, 'members_stripe_customers_subscriptions');
        await dropUpdatedBy(knex, 'emails');
        await dropUpdatedBy(knex, 'snippets');

        logging.info('updated_by dropped from all tables');
    },

    async function down() {
        // Major version migrations are not reversible
        logging.warn('Reverting removal of updated_by is not supported');
    }
);
