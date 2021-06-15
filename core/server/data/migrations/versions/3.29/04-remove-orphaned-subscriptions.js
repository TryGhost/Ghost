const logging = require('@tryghost/logging');

module.exports = {
    config: {
        transaction: true
    },

    async up({transacting: knex}) {
        if (knex.client.config.client !== 'mysql') {
            logging.warn('Skipping cleanup of orphaned subscriptions - database is not MySQL');
            return;
        }

        const orphanedSubscriptions = await knex('members_stripe_customers_subscriptions')
            .select('id')
            .whereNotIn(
                'customer_id',
                knex('members_stripe_customers')
                    .select('customer_id')
            );

        if (!orphanedSubscriptions || !orphanedSubscriptions.length) {
            logging.info('No orphaned subscription records found');
            return;
        }

        logging.info(`Deleting ${orphanedSubscriptions.length} orphaned subscriptions`);
        await knex('members_stripe_customers_subscriptions')
            .whereIn('id', orphanedSubscriptions.map(subscription => subscription.id))
            .del();
    },

    async down() {}
};
