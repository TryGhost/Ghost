const logging = require('@tryghost/logging');

const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        const subscriptionsToUpdate = await knex('members_stripe_customers_subscriptions AS s')
            .join('offers AS o', 's.offer_id', '=', 'o.id')
            .where('o.duration', '=', 'forever')
            .andWhere('s.mrr', '!=', 0)
            .select('s.*', 'o.discount_type AS offer_type', 'o.discount_amount AS offer_amount');

        if (!subscriptionsToUpdate.length) {
            logging.info('No subscriptions found needing updating');
            return;
        }

        const toInsert = subscriptionsToUpdate.map((subscription) => {
            let discountedAmount;
            if (subscription.offer_type === 'percent') {
                discountedAmount = subscription.plan_amount * (100 - subscription.offer_amount) / 100;
            } else {
                discountedAmount = subscription.plan_amount - subscription.offer_amount;
            }

            const newSubscription = {
                ...subscription,
                mrr: subscription.plan_interval === 'year' ? discountedAmount / 12 : discountedAmount
            };

            delete newSubscription.offer_type;
            delete newSubscription.offer_amount;

            return newSubscription;
        });

        const toDelete = toInsert.map(sub => sub.id);

        logging.info(`Replacing ${toDelete.length} subscriptions with updated MRR based on Offers`);
        await knex('members_stripe_customers_subscriptions').whereIn('id', toDelete).del();
        await knex.batchInsert('members_stripe_customers_subscriptions', toInsert);
    },
    async function down() {}
);
