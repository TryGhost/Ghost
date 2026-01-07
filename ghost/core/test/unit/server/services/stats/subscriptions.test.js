const knex = require('knex').default;
const assert = require('assert/strict');
const SubscriptionStatsService = require('../../../../../core/server/services/stats/SubscriptionStatsService');

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
            let i = 1;
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
                        mrr: 100 * i
                    },
                    yearly: {
                        tier: tier,
                        cadence: 'year',
                        mrr: 80 * i
                    }
                };
                i += 1;
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
                    let last = event;
                    if (!subscriptions[event.id] || !subscriptions[event.id][0]) {
                        subscriptions[event.id] = [event];
                    } else {
                        last = subscriptions[event.id][0];
                        subscriptions[event.id] = [event].concat(subscriptions[event.id]);
                    }

                    let fromPlan = null;
                    let toPlan = null;
                    let mrr = 0;

                    switch (event.type) {
                    case 'created':
                        fromPlan = null;
                        toPlan = `stripe_price_${event.cadence}_${event.tier}`;
                        mrr = event.mrr;
                        break;
                    case 'canceled':
                        fromPlan = `stripe_price_${last.cadence}_${last.tier}`;
                        toPlan = `stripe_price_${last.cadence}_${last.tier}`;
                        mrr = -last.mrr;
                        break;
                    case 'reactivated':
                        fromPlan = `stripe_price_${last.cadence}_${last.tier}`;
                        toPlan = `stripe_price_${last.cadence}_${last.tier}`;
                        mrr = last.mrr;
                        break;
                    case 'updated':
                        fromPlan = `stripe_price_${last.cadence}_${last.tier}`;
                        toPlan = `stripe_price_${event.cadence}_${event.tier}`;
                        mrr = event.mrr - last.mrr;
                        break;
                    }

                    if (!event.tier) {
                        event.tier = last.tier;
                    }

                    if (!event.cadence) {
                        event.cadence = last.cadence;
                    }

                    if (!event.mrr) {
                        event.mrr = last.mrr;
                    }

                    return {
                        type: event.type,
                        from_plan: fromPlan,
                        to_plan: toPlan,
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
                    mrr: event.type !== 'canceled' ? event.mrr : 0
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
            assert(firstDayBasicMonthly.signups === 1);
            assert(firstDayBasicMonthly.cancellations === 0);
            assert(firstDayBasicMonthly.count === 1);

            assert(firstDayAdvancedYearly);
            assert(firstDayAdvancedYearly.positive_delta === 1);
            assert(firstDayAdvancedYearly.negative_delta === 0);
            assert(firstDayAdvancedYearly.signups === 1);
            assert(firstDayAdvancedYearly.cancellations === 0);
            assert(firstDayAdvancedYearly.count === 1);

            assert(secondDayAdvancedYearly);
            assert(secondDayAdvancedYearly.positive_delta === 0);
            assert(secondDayAdvancedYearly.negative_delta === 1);
            assert(secondDayAdvancedYearly.signups === 0);
            assert(secondDayAdvancedYearly.cancellations === 1);
            assert(secondDayAdvancedYearly.count === 0);

            assert(secondDayAdvancedMonthly);
            assert(secondDayAdvancedMonthly.positive_delta === 1);
            assert(secondDayAdvancedMonthly.negative_delta === 0);
            assert(secondDayAdvancedMonthly.signups === 1);
            assert(secondDayAdvancedMonthly.cancellations === 0);
            assert(secondDayAdvancedMonthly.count === 1);

            assert(thirdDayBasicMonthly);
            assert(thirdDayBasicMonthly.positive_delta === 1);
            assert(thirdDayBasicMonthly.negative_delta === 1);
            assert(thirdDayBasicMonthly.signups === 1);
            assert(thirdDayBasicMonthly.cancellations === 1);
            assert(thirdDayBasicMonthly.count === 1);
        });

        it('Correctly handles upgrades', async function () {
            const tiers = await createTiers(['basic', 'beyond']);

            const CREATE = createEvent('created');
            const UPDATE = createEvent('updated');
            const REACTIVATE = createEvent('reactivated');
            const CANCEL = createEvent('canceled');

            const events = [
                [
                    CREATE('A', tiers.beyond.yearly),
                    CREATE('B', tiers.basic.yearly),
                    CANCEL('B'),
                    CREATE('C', tiers.beyond.monthly),
                    UPDATE('C', tiers.basic.monthly),
                    REACTIVATE('B'),
                    UPDATE('B', tiers.beyond.yearly)
                ],
                [
                    CREATE('D', tiers.beyond.monthly),
                    CREATE('E', tiers.basic.yearly),
                    CREATE('F', tiers.beyond.yearly)
                ]
            ];

            await insertEvents(events);

            const stats = new SubscriptionStatsService({knex: db});

            const result = await stats.getSubscriptionHistory();

            // Check totals
            assert(result.meta.totals.find(item => item.tier === 'basic' && item.cadence === 'month').count = 1);
            assert(result.meta.totals.find(item => item.tier === 'basic' && item.cadence === 'year').count = 1);
            assert(result.meta.totals.find(item => item.tier === 'beyond' && item.cadence === 'month').count = 1);
            assert(result.meta.totals.find(item => item.tier === 'beyond' && item.cadence === 'year').count = 3);

            /**
             * @param {string} tier
             * @param {string} cadence
             * @param {string} date
             *
             * @returns {(result: import('../../lib/subscriptions').SubscriptionHistoryEntry) => boolean}
             **/
            const finder = (tier, cadence, date) => (resultItem) => {
                return resultItem.tier === tier && resultItem.cadence === cadence && resultItem.date === date;
            };

            const days = [{
                basic: {
                    monthly: result.data.find(finder('basic', 'month', '1970-01-01')),
                    yearly: result.data.find(finder('basic', 'year', '1970-01-01'))
                },
                beyond: {
                    monthly: result.data.find(finder('beyond', 'month', '1970-01-01')),
                    yearly: result.data.find(finder('beyond', 'year', '1970-01-01'))
                }
            }, {
                basic: {
                    monthly: result.data.find(finder('basic', 'month', '1970-01-02')),
                    yearly: result.data.find(finder('basic', 'year', '1970-01-02'))
                },
                beyond: {
                    monthly: result.data.find(finder('beyond', 'month', '1970-01-02')),
                    yearly: result.data.find(finder('beyond', 'year', '1970-01-02'))
                }
            }];

            // First day
            assert.equal(days[0].basic.monthly.positive_delta, 1);
            assert.equal(days[0].basic.monthly.negative_delta, 0);
            assert.equal(days[0].basic.monthly.signups, 0); // We only have a subscription that switched tier
            assert.equal(days[0].basic.monthly.cancellations, 0);

            assert.equal(days[0].basic.yearly.positive_delta, 2);
            assert.equal(days[0].basic.yearly.negative_delta, 2);
            assert.equal(days[0].basic.yearly.signups, 2);
            assert.equal(days[0].basic.yearly.cancellations, 1);

            assert.equal(days[0].beyond.monthly.positive_delta, 1);
            assert.equal(days[0].beyond.monthly.negative_delta, 1);
            assert.equal(days[0].beyond.monthly.signups, 1);
            assert.equal(days[0].beyond.monthly.cancellations, 0);

            assert.equal(days[0].beyond.yearly.positive_delta, 2);
            assert.equal(days[0].beyond.yearly.negative_delta, 0);
            assert.equal(days[0].beyond.yearly.signups, 1);
            assert.equal(days[0].beyond.yearly.cancellations, 0);

            // Second day
            assert.equal(days[1].basic.yearly.positive_delta, 1);
            assert.equal(days[1].basic.yearly.negative_delta, 0);
            assert.equal(days[1].basic.yearly.signups, 1);
            assert.equal(days[1].basic.yearly.cancellations, 0);

            assert.equal(days[1].beyond.monthly.positive_delta, 1);
            assert.equal(days[1].beyond.monthly.negative_delta, 0);
            assert.equal(days[1].beyond.monthly.signups, 1);
            assert.equal(days[1].beyond.monthly.cancellations, 0);

            assert.equal(days[1].beyond.yearly.positive_delta, 1);
            assert.equal(days[1].beyond.yearly.negative_delta, 0);
            assert.equal(days[1].beyond.yearly.signups, 1);
            assert.equal(days[1].beyond.yearly.cancellations, 0);
        });
    });
});
