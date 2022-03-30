const logging = require('@tryghost/logging');

const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        const offerRedemptions = await knex('offer_redemptions').select('*');
        const foreverOffers = await knex('offers').select('*').where({duration: 'forever'});
        const foreverOfferIds = foreverOffers.map(x => x.id);

        const foreverOfferRedemptions = offerRedemptions.filter(redemption => foreverOfferIds.includes(redemption.offer_id));

        const redemptionsKeyedByMemberID = foreverOfferRedemptions.reduce((memo, redemption) => {
            return {
                [redemption.member_id]: memo[redemption.member_id] ? memo[redemption.member_id].concat(redemption) : [redemption],
                ...memo
            };
        }, {});

        const mrrEvents = await knex('members_paid_subscription_events').select('*').whereIn('member_id', Object.keys(redemptionsKeyedByMemberID));

        const eventsKeyedByMemberID = mrrEvents.reduce((memo, event) => {
            return {
                [event.member_id]: memo[event.member_id] ? memo[event.member_id].concat(event) : [event],
                ...memo
            };
        }, {});

        const foreverOffersKeyedByID = foreverOffers.reduce((memo, offer) => {
            return {
                [offer.id]: offer,
                ...memo
            };
        }, {});

        function findNextEvent(events, current) {
            if (current.to_plan === null || current.to_plan === current.from_plan) {
                return null;
            }
            const candidates = events.filter(event => event.from_plan === event.to_plan);
            if (candidates.length === 0) {
                return null;
            }
            return candidates[0];
        }

        function buildSequence(events, sequence) {
            const next = findNextEvent(events, sequence[sequence.length - 1]);

            if (!next) {
                return sequence;
            }

            return buildSequence(events.filter(event => event.id !== next.id), sequence.concat(next));
        }

        const mrrEventSequences = Object.keys(eventsKeyedByMemberID).reduce((memo, memberID) => {
            const initialEvents = eventsKeyedByMemberID[memberID].filter(event => event.from_plan === null);
            const nonInitialEvents = eventsKeyedByMemberID[memberID].filter(event => event.from_plan !== null);

            const sequences = initialEvents.map(event => {
                return buildSequence(nonInitialEvents, [event]);
            });

            return memo.concat(sequences);
        }, []);

        for (const events of mrrEventSequences) {
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

                const redemptions = redemptionsKeyedByMemberID[event.member_id];
                let redemption;

                if (redemptions.length === 1) {
                    redemption = redemptions[0];
                } else {
                    redemption = redemptions.find(r => {
                        // find closest one to the created_at date
                    });
                    redemption = redemptions[0];
                }

                const offer = foreverOffersKeyedByID[redemption.offer_id];

                if (offer.discount_type === 'percent') {
                    diff = event.mrr_delta * (100 - offer.discount_amount) / 100;
                } else {
                    if (offer.interval === 'month') {
                        diff = offer.discount_amount;
                    } else {
                        diff = offer.discount_amount / 12;
                    }
                }

                console.log(`About to update mrr_delta from ${event.mrr_delta} to ${event.mrr_delta - diff}`);
                // await knex('members_paid_subscription_events')
                //     .update({mrr_delta: event.mrr_delta - diff})
                //     .where({id: event.id});
            }

            if (events[1]) {
                const event = events[1];

                if (event.from_plan !== events[0].to_plan) {
                    logging.error('Invalid event found');
                    continue;
                }

                console.log(`About to update mrr_delta from ${event.mrr_delta} to ${event.mrr_delta + diff}`);
                // await knex('members_paid_subscription_events')
                //     .update({mrr_delta: event.mrr_delta + diff})
                //     .where({id: event.id});
            }
        }
    },
    async function down(knex) {
    }
);
