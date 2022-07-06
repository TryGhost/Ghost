const {chunk} = require('lodash');
const ObjectID = require('bson-objectid');
const {createTransactionalMigration} = require('../../utils');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const messages = {
    unknownSubscriptionIntervalError: 'Unknown Subscription interval "{interval}" found.'
};

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Populating members_paid_subscription_events from members_stripe_customers_subscriptions');
        const allSubscriptions = await knex
            .select(
                'c.member_id',
                's.status',
                's.start_date',
                's.updated_at',
                's.created_at',
                's.plan_id',
                's.plan_amount',
                's.plan_currency',
                's.plan_interval'
            )
            .from('members_stripe_customers_subscriptions as s')
            .join('members_stripe_customers as c', 'c.customer_id', '=', 's.customer_id');

        function calculateMrrDelta({interval, amount}) {
            if (interval === 'year') {
                return Math.floor(amount / 12);
            }

            if (interval === 'month') {
                return amount;
            }

            if (interval === 'week') {
                return amount * 4;
            }

            if (interval === 'day') {
                return amount * 30;
            }

            throw new errors.InternalServerError({
                message: tpl(messages.unknownSubscriptionIntervalError , {
                    interval
                })
            });
        }

        const allEvents = allSubscriptions.reduce((allEventsAcc, subscription) => {
            if (['incomplete', 'incomplete_expired'].includes(subscription.status)) {
                return allEventsAcc;
            }

            if (!['year', 'month', 'week', 'day'].includes(subscription.plan_interval)) {
                return allEventsAcc;
            }

            const events = [];

            if (subscription.status === 'trialing') {
                const subscriptionCreatedEvent = {
                    id: ObjectID().toHexString(),
                    member_id: subscription.member_id,
                    from_plan: null,
                    to_plan: subscription.plan_id,
                    currency: subscription.plan_currency,
                    source: 'stripe',
                    mrr_delta: 0,
                    created_at: subscription.start_date
                };
                events.push(subscriptionCreatedEvent);
            } else {
                const subscriptionCreatedEvent = {
                    id: ObjectID().toHexString(),
                    member_id: subscription.member_id,
                    from_plan: null,
                    to_plan: subscription.plan_id,
                    currency: subscription.plan_currency,
                    source: 'stripe',
                    mrr_delta: calculateMrrDelta({
                        amount: subscription.plan_amount,
                        interval: subscription.plan_interval
                    }),
                    created_at: subscription.start_date
                };
                events.push(subscriptionCreatedEvent);
            }

            if (subscription.status === 'canceled') {
                const subscriptionCancelledEvent = {
                    id: ObjectID().toHexString(),
                    member_id: subscription.member_id,
                    from_plan: subscription.plan_id,
                    to_plan: null,
                    currency: subscription.plan_currency,
                    source: 'stripe',
                    mrr_delta: -1 * calculateMrrDelta({
                        amount: subscription.plan_amount,
                        interval: subscription.plan_interval
                    }),
                    created_at: subscription.updated_at
                };
                events.push(subscriptionCancelledEvent);
            }

            return allEventsAcc.concat(events);
        }, []);

        // SQLite3 supports 999 variables max, each row uses 8 variables so ⌊999/8⌋ = 124
        const chunkSize = 124;

        const eventChunks = chunk(allEvents, chunkSize);

        // eslint-disable-next-line no-restricted-syntax
        for (const events of eventChunks) {
            await knex.insert(events).into('members_paid_subscription_events');
        }
    },
    async function down(knex) {
        logging.info('Deleting all members_paid_subscription_events');
        return knex('members_paid_subscription_events').del();
    }
);

