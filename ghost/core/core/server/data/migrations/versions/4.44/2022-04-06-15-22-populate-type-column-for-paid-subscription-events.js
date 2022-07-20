const logging = require('@tryghost/logging');

const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Setting "type" to "updated" for events with different to_plan & from_plan');
        await knex('members_paid_subscription_events').update('type', 'updated').whereNotNull('from_plan').whereNotNull('to_plan').whereRaw('to_plan != from_plan');

        logging.info('Setting "type" to "expired" for events with null to_plan or the same to_plan & from_plan');
        await knex('members_paid_subscription_events').update('type', 'expired').whereNull('to_plan').whereNotNull('from_plan');
        await knex('members_paid_subscription_events').update('type', 'expired').whereRaw('from_plan = to_plan');

        logging.info('Setting "type" to "created" for events with null from_plan');
        await knex('members_paid_subscription_events').update('type', 'created').whereNull('from_plan').whereNotNull('to_plan');
    },
    async function down(knex) {
        logging.info('Setting "type" to null for all rows in "members_paid_subscriptions events"');
        await knex('members_paid_subscription_events').update('type', null);
    }
);
