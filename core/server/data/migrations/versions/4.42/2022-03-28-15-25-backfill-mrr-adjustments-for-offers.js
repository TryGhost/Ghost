const logging = require('@tryghost/logging');
const {uniq} = require('lodash');
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
            .orderByRaw('or.created_at ASC');

        const memberIds = uniq(offerRedemptions.map(redemption => redemption.member_id));

        const mrrEvents = await knex
            .select('*')
            .from('members_paid_subscription_events')
            .whereIn('member_id', memberIds);

        function storeEventOnMemberId(storage, event) {
            const parsedEvent = {
                ...event,
                datetime: DateTime.fromISO(event.created_at)
            };
            return {
                ...storage,
                [event.member_id]: storage[event.member_id] ? storage[event.member_id].concat(parsedEvent) : [parsedEvent]
            };
        }

        const mrrEventsByMemberId = mrrEvents.reduce(storeEventOnMemberId, {});

        const updatedEvents = [];

        function getMRRAdjustment(firstEvent, redemption) {
            if (redemption.discount_type === 'percentage') {
                return firstEvent.mrr_delta * (100 - redemption.discount_amount) / 100;
            } else {
                if (redemption.discount_interval === 'month') {
                    return redemption.discount_amount;
                } else {
                    return redemption.discount_amount / 12;
                }
            }
        }

        function updateEvent(event, mrrAdjustment) {
            event.used = true;

            updatedEvents.push({
                id: event.id,
                member_id: event.member_id,
                from_plan: event.from_plan,
                to_plan: event.to_plan,
                currency: event.currency,
                source: event.source,
                created_at: event.created_at,
                mrr_delta: event.mrr_delta + mrrAdjustment
            });
        }

        function getFirstEvent(events, redemption) {
            const intervals = events.map(event => Interval.fromDateTimes(event.datetime, redemption.datetime));

            // Invalid intervals would be if the end date was before the start date - e.g. offer redeemed before an MRR event
            const validIntervals = intervals.filter(interval => interval.isValid);

            if (validIntervals.length === 1) {
                return events[intervals.indexOf(validIntervals[0])];
            }

            // At this point we have multiple possible first events, so we should check which is most likely to be correct based on timestamps
            // Picking the closest one to when the redemption occured

            // This is a butters way of getting the smallest probs better to do a sort or a loop or smth
            const smallestIntervalLength = Math.min(...validIntervals.map(interval => interval.length()));
            return events[intervals.indexOf(intervals.find(interval => interval.length() === smallestIntervalLength))];
        }

        offerRedemptions.forEach((redemption) => {
            redemption.datetime = DateTime.fromISO(redemption.created_at);

            const possibleEvents = mrrEventsByMemberId[redemption.member_id];

            const firstEvents = possibleEvents.filter(event => event.from_plan === null && event.used !== true);

            // If there is a single first event, then we know for sure that we need to
            // 1. decrease MRR for it
            // 2. increase MRR for a second event if it exists
            if (firstEvents.length === 1) {
                const firstEvent = firstEvents[0];
                const mrrAdjustment = getMRRAdjustment(firstEvent, redemption);

                updateEvent(firstEvent, -mrrAdjustment);

                const secondEvent = possibleEvents.find(event => event.from_plan === firstEvent.to_plan);

                if (secondEvent) {
                    updateEvent(secondEvent, +mrrAdjustment);
                }

                return;
            }

            const firstEvent = getFirstEvent(firstEvents, redemption);
            const mrrAdjustment = getMRRAdjustment(firstEvent, redemption);

            updateEvent(firstEvent, -mrrAdjustment);

            const mustHaveSecondEvent = redemption.subscription_status === 'canceled' || firstEvent.to_plan !== redemption.subscription_price;

            const likelyDoesNotHaveSecondEvent = firstEvent.to_plan === redemption.subscription_price;

            if (likelyDoesNotHaveSecondEvent) {
                return;
            }

            const possibleSecondEvents = possibleEvents.filter((event) => {
                if (event.from_plan === null) {
                    return false;
                }

                if (event.from_plan !== firstEvent.to_plan) {
                    return false;
                }

                if (event.used) {
                    return false;
                }

                const interval = Interval.fromDateTimes(firstEvent.datetime, event.datetime);

                if (!interval.isValid) {
                    return false;
                }

                return true;
            });

            if (possibleSecondEvents.length === 0) {
                if (mustHaveSecondEvent) {
                    logging.error('Missing event, what do?');
                }
                return;
            }

            if (possibleSecondEvents.length === 1) {
                const secondEvent = possibleSecondEvents[0];
                updateEvent(secondEvent, +mrrAdjustment);
                return;
            }

            // How do we determine the most likely second event???
            // We can at least use the most likely event based on whether or not the subscription is canceled, or if we know for sure the tier/cadence has changed
            const secondEvent = possibleSecondEvents[0];
            updateEvent(secondEvent, +mrrAdjustment);
            return;
        });

        const idsToDelete = updatedEvents.map(event => event.id);

        await knex('members_paid_subscription_events').whereIn('id', idsToDelete).del();
        await knex('members_paid_subscription_events').insert(updatedEvents);
    },
    async function down() {}
);
