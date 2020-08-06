const logging = require('../../../../../shared/logging');

module.exports = {
    config: {
        transaction: true
    },

    async up({transacting: knex}) {
        if (knex.client.config.client !== 'mysql') {
            logging.warn('Skipping cleanup of duplicate subscriptions - database is not MySQL');
            return;
        }

        const duplicates = await knex('members_stripe_customers_subscriptions')
            .select('subscription_id')
            .count('subscription_id as count')
            .groupBy('subscription_id')
            .having('count', '>', 1);

        if (!duplicates.length) {
            logging.info('No duplicate subscriptions found');
            return;
        }

        logging.info(`Found ${duplicates.length} duplicate stripe subscriptions`);
        for (const duplicate of duplicates) {
            const subscriptions = await knex('members_stripe_customers_subscriptions')
                .select()
                .where('subscription_id', duplicate.subscription_id);

            const orderedSubscriptions = subscriptions.sort((subA, subB) => {
                return subB.updated_at - subA.updated_at;
            });

            const [newestSubscription, ...olderSubscriptions] = orderedSubscriptions;

            logging.info(`Keeping newest subscription ${newestSubscription.id} - ${newestSubscription.subscription_id}, last updated at ${newestSubscription.updated_at}`);

            for (const subscriptionToDelete of olderSubscriptions) {
                logging.info(`Deleting duplicate subscription ${subscriptionToDelete.id} - ${subscriptionToDelete.subscription_id}, last updated at ${subscriptionToDelete.updated_at}`);
                await knex('members_stripe_customers_subscriptions')
                    .where({id: subscriptionToDelete.id})
                    .del();
            }
        }
    },

    // noop for down
    async down() {}
};
