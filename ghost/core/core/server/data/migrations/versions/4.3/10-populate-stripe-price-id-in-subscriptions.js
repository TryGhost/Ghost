const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Populating stripe_price_id from plan id in stripe customer subscriptions table');
        await knex('members_stripe_customers_subscriptions')
            .update({
                stripe_price_id: knex.ref('plan_id')
            });
    },

    async function down(knex) {
        logging.info('Resetting stripe_price_id column to empty in stripe customer subscriptions table');
        await knex('members_stripe_customers_subscriptions')
            .update({
                stripe_price_id: ''
            });
    }
);
