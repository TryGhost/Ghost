const logging = require('@tryghost/logging');
const {uniq} = require('lodash');

const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Adjusting MRR based on Offer Redemptions');
        const offerRedemptions = await knex
            .select('or.*', 'o.discount_type', 'o.discount_amount', 'o.interval AS discount_interval', 's.mrr AS mrr', 's.id AS subscription_id', 'p.amount AS amount', 'p.interval AS interval')
            .from('offer_redemptions AS or')
            .join('offers AS o', 'or.offer_id', '=', 'o.id')
            .join('members_stripe_customers_subscriptions AS s', 'or.subscription_id', '=', 's.id')
            .join('stripe_prices AS p', 'p.stripe_price_id', '=', 's.stripe_price_id')
            .where('o.duration', '=', 'forever')
            .whereNotNull('s.offer_id')
            .where('s.mrr', '!=', 0)
            .orderBy('or.created_at', 'asc');

        if (offerRedemptions.length === 0) {
            logging.info('No Offers redeemed, skipping migration');
            return;
        } else {
            logging.info(`Adjusting MRR for ${offerRedemptions.length} Offer Redemptions`);
        }

        const memberIds = uniq(offerRedemptions.map(redemption => redemption.member_id));

        const mrrCreatedEvents = await knex
            .select('*')
            .from('members_paid_subscription_events')
            .where('type', 'created')
            .whereIn('member_id', memberIds);

        function storeEventOnMemberId(storage, event) {
            return {
                ...storage,
                [event.member_id]: storage[event.member_id] ? storage[event.member_id].concat(event) : [event]
            };
        }

        const mrrCreatedEventsByMemberId = mrrCreatedEvents.reduce(storeEventOnMemberId, {});

        const updatedEvents = [];

        function calculateMRR(subscription, redemption) {
            if (redemption && subscription.interval !== redemption.discount_interval) {
                logging.error('Found invalid price & redemption pair');
                return calculateMRR(subscription);
            }

            if (!redemption) {
                return subscription.interval === 'year' ? subscription.amount / 12 : subscription.amount;
            }

            if (redemption.discount_type === 'percent') {
                return calculateMRR({
                    interval: subscription.interval,
                    amount: subscription.amount * (100 - redemption.discount_amount) / 100
                });
            }

            return calculateMRR({
                interval: subscription.interval,
                amount: subscription.amount - redemption.discount_amount
            });
        }

        // eslint-disable-next-line no-restricted-syntax
        offerRedemptions.forEach((redemption) => {
            const memberEvents = mrrCreatedEventsByMemberId[redemption.member_id];

            // If a member has had multiple subscriptions we ignore because we cannot easily work out which event is correct.
            if (memberEvents.length !== 1) {
                return;
            }

            const firstEvent = memberEvents[0];

            const mrr = calculateMRR({
                interval: redemption.interval,
                amount: redemption.amount
            }, redemption);
            updatedEvents.push({
                id: firstEvent.id,
                type: 'created',
                subscription_id: redemption.subscription_id,
                member_id: firstEvent.member_id,
                from_plan: firstEvent.from_plan,
                to_plan: firstEvent.to_plan,
                currency: firstEvent.currency,
                source: firstEvent.source,
                created_at: firstEvent.created_at,
                mrr_delta: mrr
            });
        });

        if (updatedEvents.length === 0) {
            return;
        }

        const idsToDelete = updatedEvents.map(event => event.id);

        await knex('members_paid_subscription_events').whereIn('id', idsToDelete).del();
        await knex.batchInsert('members_paid_subscription_events', updatedEvents);
    },
    async function down() {}
);
