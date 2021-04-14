const logging = require('../../../../../shared/logging');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Populating stripe price id from plan id in stripe customer subscriptions table');
        await knex('members_stripe_customers_subscriptions')
            .update({
                price_id: knex.ref('plan_id')
            });
    },

    async function down() {
        // noop: no need to reset price_id to empty string
    }
);
