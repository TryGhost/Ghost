const {createTransactionalMigration} = require('../../utils');
const {commands} = require('../../../schema');

module.exports = createTransactionalMigration(
    async function up(knex) {
        await commands.addIndex('members_created_events', ['batch_id'], knex);
        await commands.addIndex('members_created_events', ['source'], knex);
        await commands.addIndex('members_subscription_created_events', ['batch_id'], knex);
    },
    async function down(knex) {
        await commands.dropIndex('members_subscription_created_events', ['batch_id'], knex);
        await commands.dropIndex('members_created_events', ['source'], knex);
        await commands.dropIndex('members_created_events', ['batch_id'], knex);
    }
);
