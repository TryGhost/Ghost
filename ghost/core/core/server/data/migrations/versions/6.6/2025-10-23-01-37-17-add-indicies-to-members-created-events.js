// For information on writing migrations, see https://www.notion.so/ghost/Database-migrations-eb5b78c435d741d2b34a582d57c24253

const logging = require('@tryghost/logging');
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
