const logging = require('@tryghost/logging');
const {uniq, each} = require('lodash');
const {DateTime, Interval} = require('luxon');

const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        const offerRedemptions = await knex
            .select('or.*', 'o.discount_type', 'o.discount_amount', 'o.interval AS discount_interval', 's.status AS subscription_status', 's.stripe_price_id AS subscription_price')
            .from('offer_redemptions AS or')
            .join('offers AS o', 'or.offer_id', '=', 'o.id')
            .join('members_stripe_customers_subscriptions AS s', 'or.subscription_id', '=', 's.id')
            .where('o.duration', '=', 'forever')
            .orderBy('or.created_at ASC');

        const memberIds = uniq(offerRedemptions.map(redemption => redemption.member_id));

        const mrrEvents = await knex
            .select('*')
            .from('members_paid_subscription_events')
            .whereIn('member_id', memberIds);

        function storeEventOnMemberId(storage, event) {
            const parsedEvent = {
                ...event,
                created_at: DateTime.fromISO(event.created_at)
            };
            return {
                ...storage,
                [event.member_id]: storage[event.member_id] ? storage[event.member_id].concat(parsedEvent) : [parsedEvent]
            };
        }

        const mrrEventsByMemberId = mrrEvents.reduce(storeEventOnMemberId, {});

        function getFirstEvent(events, redemption) {
            const firstEvents = events.filter(event => event.from_plan === null && event.used !== true);

            if (firstEvents.length === 1) {
                return firstEvents[0];
            }

            const intervals = firstEvents.map(event => Interval.fromDateTimes(event.created_at, redemption.created_at));

            // Invalid intervals would be if the end date was before the start date - e.g. offer redeemed before an MRR event
            const validIntervals = intervals.filter(interval => interval.isValid);

            if (validIntervals.length === 1) {
                return firstEvents[intervals.indexOf(validIntervals[0])];
            }

            // At this point we have multiple possible first events, so we should check which is most likely to be correct based on timestamps
            // Picking the closest one to when the redemption occured

            // This is a butters way of getting the smallest probs better to do a sort or a loop or smth
            const smallestIntervalLength = Math.min(...validIntervals.map(interval => interval.length()));
            return firstEvents[intervals.indexOf(intervals.find(interval => interval.length() === smallestIntervalLength))];
        }

        const updatedEvents = [];

        for (const redemption of offerRedemptions) {
            redemption.created_at = DateTime.fromISO(redemption.created_at);

            const possibleEvents = mrrEventsByMemberId[redemption.member_id];

            const firstEvent = getFirstEvent(possibleEvents);
            firstEvent.used = true;

            let mrrAdjustment;
            if (redemption.discount_type === 'percentage') {
                mrrAdjustment = firstEvent.mrr_delta * (100 - redemption.discount_amount) / 100;
            } else {
                if (redemption.discount_interval === 'month') {
                    mrrAdjustment = redemption.discount_amount;
                } else {
                    mrrAdjustment = redemption.discount_amount / 12;
                }
            }

            updatedEvents.push({
                id: firstEvent.id,
                member_id: firstEvent.member_id,
                from_plan: firstEvent.from_plan,
                to_plan: firstEvent.to_plan,
                currency: firstEvent.currency,
                source: firstEvent.source,
                created_at: firstEvent.created_at,
                mrr_delta: firstEvent.mrr_delta - mrrAdjustment
            });

            const possibleSecondEvents = possibleEvents.filter((event) => {
                if (event.from_plan !== firstEvent.to_plan) {
                    return false;
                }

                if (event.used) {
                    return false;
                }

                const interval = Interval.fromDateTimes(firstEvent.created_at, event.created_at);

                if (!interval.isValid) {
                    return false;
                }

                if (redemption.subscription_status === 'canceled') {
                    return event.from_plan === event.to_plan || event.to_plan === null;
                }
            });

            const mustHaveSecondEvent = redemption.subscription_status === 'canceled';
            const likelyDoesNotHaveSecondEvent = firstEvent.to_plan === redemption.subscription_price;

            if (possibleSecondEvents.length === 0) {
                if (mustHaveSecondEvent) {
                    logging.error('Missing event, what do?');
                }
                continue;
            }

            if (likelyDoesNotHaveSecondEvent) {
                continue;
            }

            if (possibleSecondEvents.length === 1) {
                const secondEvent = possibleSecondEvents[0];
                secondEvent.used = true;
                updatedEvents.push({
                    id: secondEvent.id,
                    member_id: secondEvent.member_id,
                    from_plan: secondEvent.from_plan,
                    to_plan: secondEvent.to_plan,
                    currency: secondEvent.currency,
                    source: secondEvent.source,
                    created_at: secondEvent.created_at,
                    mrr_delta: secondEvent.mrr_delta + mrrAdjustment
                });
                continue;
            }

            const secondEvent = possibleSecondEvents[0];
            secondEvent.used = true;
            updatedEvents.push({
                id: secondEvent.id,
                member_id: secondEvent.member_id,
                from_plan: secondEvent.from_plan,
                to_plan: secondEvent.to_plan,
                currency: secondEvent.currency,
                source: secondEvent.source,
                created_at: secondEvent.created_at,
                mrr_delta: secondEvent.mrr_delta + mrrAdjustment
            });
            continue;
        }

        const idsToDelete = updatedEvents.map(event => event.id);

        await knex('member_paid_subscription_events').whereIn('id', idsToDelete).del();
        await knex('members_paid_subscription_events').insert(updatedEvents);
    },
    async function down() {}
);
