const knex = require('knex').default;
const assert = require('assert');
const SubscriptionStatsService = require('../../lib/subscriptions');

describe('SubscriptionStatsService', function () {
    describe('getSubscriptionHistory', function () {
        /** @type {import('knex').Knex} */
        let db;

        beforeEach(async function () {
            db = knex({
                client: 'sqlite3',
                useNullAsDefault: true,
                connection: {
                    filename: ':memory:'
                }
            });
            await db.schema.createTable('products', function (table) {
                table.string('id');
            });
            await db.schema.createTable('stripe_products', function (table) {
                table.string('stripe_product_id');
                table.string('product_id');
            });
            await db.schema.createTable('stripe_prices', function (table) {
                table.string('id');
                table.string('stripe_price_id');
                table.string('stripe_product_id');
                table.string('interval');
            });
            await db.schema.createTable('members_paid_subscription_events', function (table) {
                table.string('type');
                table.string('from_plan');
                table.string('to_plan');
                table.integer('mrr_delta');
                table.date('created_at');
            });
            await db.schema.createTable('members_stripe_customers_subscriptions', function (table) {
                table.string('id');
                table.string('stripe_price_id');
                table.integer('mrr');
            });
        });

        afterEach(async function () {
            await db.destroy();
        });

        /**
         * @typedef {object} TierCadence
         * @prop {string} tier
         * @prop {string} cadence
         * @prop {number} mrr
         */

        /**
         * @typedef {object} MockedTier
         * @prop {TierCadence} monthly
         * @prop {TierCadence} yearly
         **/

        /**
         * @param {string[]} tiers
         * @returns {Promise<Object<string, MockedTier>>}
         **/
        async function createTiers(tiers) {
            /** @type {Object<string, MockedTier>} */
            const results = {};
            for (const tier of tiers) {
                await db('products').insert({id: tier});
                await db('stripe_products').insert({
                    product_id: tier,
                    stripe_product_id: `stripe_product_${tier}`
                });
                await db('stripe_prices').insert({
                    id: `stripe_price_month_${tier}`,
                    stripe_price_id: `stripe_price_month_${tier}`,
                    stripe_product_id: `stripe_product_${tier}`,
                    interval: 'month'
                });
                await db('stripe_prices').insert({
                    id: `stripe_price_year_${tier}`,
                    stripe_price_id: `stripe_price_year_${tier}`,
                    stripe_product_id: `stripe_product_${tier}`,
                    interval: 'year'
                });
                results[tier] = {
                    monthly: {
                        tier: tier,
                        cadence: 'month',
                        mrr: 100
                    },
                    yearly: {
                        tier: tier,
                        cadence: 'year',
                        mrr: 80
                    }
                };
            }
            return results;
        }

        /**
         * @typedef {object} FakeEvent
         * @prop {string} id
         * @prop {string} type
         * @prop {string|null} tier
         * @prop {string|null} cadence
         * @prop {number|null} mrr
         **/

        /**
         * @param {string} type
         * @returns {(id: string, attr?: any) => FakeEvent}
         **/
        const createEvent = type => (id, attr = {}) => Object.assign({tier: null, cadence: null, mrr: null}, attr, {id, type});

        /**
         * @param {FakeEvent[][]} days
         **/
        async function insertEvents(days) {
            const {DateTime} = require('luxon');
            /** @type {Object<string, FakeEvent[]>}*/
            const subscriptions = {};
            const toInsert = [];
            for (let index = 0; index < days.length; index++) {
                const events = days[index];
                const day = DateTime.fromISO('1970-01-01').plus({days: index}).toISODate();
                toInsert.push(...events.map(function (event) {
                    let last = null;
                    if (!subscriptions[event.id]) {
                        subscriptions[event.id] = [event];
                    } else {
                        last = subscriptions[event.id][0];
                        subscriptions[event.id] = [event].concat(subscriptions[event.id]);
                    }

                    let cadence = event.cadence || last && last.cadence;
                    let tier = event.tier || last && last.tier;
                    let mrr = (event.type === 'created' && event.mrr) || (last && last.mrr && -last.mrr);

                    return {
                        type: event.type,
                        from_plan: event.type === 'created' ? null : `stripe_price_${cadence}_${tier}`,
                        to_plan: `stripe_price_${cadence}_${tier}`,
                        mrr_delta: mrr,
                        created_at: day
                    };
                }));
            }
            await db('members_paid_subscription_events').insert(toInsert);

            const subscriptionsToInsert = Object.keys(subscriptions).map((id) => {
                const event = subscriptions[id][0];
                let cadence = event.cadence;
                let tier = event.tier;
                if (!event.tier) {
                    cadence = subscriptions[id][1].cadence;
                    tier = subscriptions[id][1].tier;
                }
                return {
                    id,
                    stripe_price_id: `stripe_price_${cadence}_${tier}`,
                    mrr: event.type === 'created' ? event.mrr : 0
                };
            });

            await db('members_stripe_customers_subscriptions').insert(subscriptionsToInsert);
        }

        it('Responds with correct data', async function () {
            const tiers = await createTiers(['basic', 'advanced']);

            const NEW = createEvent('created');
            const CANCEL = createEvent('canceled');

            const events = [
                [NEW('A', tiers.basic.monthly), NEW('B', tiers.advanced.yearly)],
                [CANCEL('B'), NEW('C', tiers.advanced.monthly)],
                [CANCEL('A'), NEW('D', tiers.basic.monthly)]
            ];

            await insertEvents(events);

            const stats = new SubscriptionStatsService({knex: db});

            const results = await stats.getSubscriptionHistory();

            /**
             * @param {string} tier
             * @param {string} cadence
             * @param {string} date
             *
             * @returns {(result: import('../../lib/subscriptions').SubscriptionHistoryEntry) => boolean}
             **/
            const finder = (tier, cadence, date) => (result) => {
                return result.tier === tier && result.cadence === cadence && result.date === date;
            };

            const firstDayBasicMonthly = results.data.find(finder('basic', 'month', '1970-01-01'));
            const firstDayAdvancedYearly = results.data.find(finder('advanced', 'year', '1970-01-01'));
            const secondDayAdvancedYearly = results.data.find(finder('advanced', 'year', '1970-01-02'));
            const secondDayAdvancedMonthly = results.data.find(finder('advanced', 'month', '1970-01-02'));
            const thirdDayBasicMonthly = results.data.find(finder('basic', 'month', '1970-01-03'));

            assert(firstDayBasicMonthly);
            assert(firstDayBasicMonthly.positive_delta === 1);
            assert(firstDayBasicMonthly.negative_delta === 0);
            assert(firstDayBasicMonthly.count === 1);

            assert(firstDayAdvancedYearly);
            assert(firstDayAdvancedYearly.positive_delta === 1);
            assert(firstDayAdvancedYearly.negative_delta === 0);
            assert(firstDayAdvancedYearly.count === 1);

            assert(secondDayAdvancedYearly);
            assert(secondDayAdvancedYearly.positive_delta === 0);
            assert(secondDayAdvancedYearly.negative_delta === 1);
            assert(secondDayAdvancedYearly.count === 0);

            assert(secondDayAdvancedMonthly);
            assert(secondDayAdvancedMonthly.positive_delta === 1);
            assert(secondDayAdvancedMonthly.negative_delta === 0);
            assert(secondDayAdvancedMonthly.count === 1);

            assert(thirdDayBasicMonthly);
            assert(thirdDayBasicMonthly.positive_delta === 1);
            assert(thirdDayBasicMonthly.negative_delta === 1);
            assert(thirdDayBasicMonthly.count === 1);
        });
    });
});
