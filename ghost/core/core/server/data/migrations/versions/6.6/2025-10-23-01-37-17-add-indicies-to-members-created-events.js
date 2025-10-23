// For information on writing migrations, see https://www.notion.so/ghost/Database-migrations-eb5b78c435d741d2b34a582d57c24253

const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');
const {commands} = require('../../../schema');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Adding index on members_created_events.batch_id');
        await commands.addIndex('members_created_events', ['batch_id'], knex);

        logging.info('Adding index on members_created_events.source');
        await commands.addIndex('members_created_events', ['source'], knex);

        logging.info('Adding index on members_subscription_created_events.batch_id');
        await commands.addIndex('members_subscription_created_events', ['batch_id'], knex);
    },
    async function down(knex) {
        logging.info('Dropping index on members_subscription_created_events.batch_id');
        await commands.dropIndex('members_subscription_created_events', ['batch_id'], knex);

        logging.info('Dropping index on members_created_events.source');
        await commands.dropIndex('members_created_events', ['source'], knex);

        logging.info('Dropping index on members_created_events.batch_id');
        await commands.dropIndex('members_created_events', ['batch_id'], knex);
    }
);
