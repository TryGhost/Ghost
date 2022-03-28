const logging = require('@tryghost/logging');

const {createTransactionalMigration} = require('../../utils');


module.exports = createTransactionalMigration(
    async function up(knex) {
        const offerRedemptions = await knex('offer_redemptions').select('*');
        const foreverOffers = await knex('offers').select('id').where({duration: 'forever'});
        const foreverOfferIds = foreverOffers.map(x => x.id);

        const redemptionsKeyedBySubscriptionID = offerRedemptions.reduce((memo, redemption) => {
            if (!foreverOfferIds.includes(redemption.offer_id)) {
                return memo;
            }

            return {
                [redemption.subscription_id]: redemption,
                ...memo
            };
        }, {});

        const mrrEvents = await knex('members_paid_subscription_events').select('*').whereIn('subscription_id', Object.keys(redemptionsKeyedBySubscriptionID));

        const eventsKeyedByID = mrrEvents.reduce((memo, event) => {
            return {
                [event.subscription_id]: memo[event.subscription_id] ? memo[event.subscription_id].concat(event) : [event],
                ...memo
            };
        }, {});

        const foreverOffersKeyedByID = foreverOffers.reduce((memo, offer) => {
            return {
                [offer.id]: offer,
                ...memo
            };
        }, {});

        for (const eventID in eventsKeyedByID) {
            const events = eventsKeyedByID[eventID];
            let diff;
            if (events[0]) {
                const event = events[0];

                if (event.from_plan !== null) {
                    logging.error('Invalid event found');
                    continue;
                }

                if (event.to_plan === null) {
                    logging.error('Invalid event found');
                    continue;
                }

                const redemption = redemptionsKeyedBySubscriptionID[event.subscription_id];
                const offer = foreverOffersKeyedByID[redemption.offer_id];

                if (offer.discount_type === 'percent') {
                    // diff = mrr * (100 - percent) / 100
                } else {
                    if (offer.interval === 'month') {
                        // diff = amount
                    } else {
                        // diff = amount / 12
                    }
                }

                // update MRR to take off "diff"
            }

            if (events[1]) {
                const event = events[1];

                if (event.from_plan !== events[0].to_plan) {
                    logging.error('Invalid event found');
                    continue;
                }

                if (event.from_plan === event.to_plan) {
                    logging.error('Invalid event found');
                    continue;
                }

                // update MRR to add on "diff"
            }
        }
    },
    async function down(knex) {
    }
);
