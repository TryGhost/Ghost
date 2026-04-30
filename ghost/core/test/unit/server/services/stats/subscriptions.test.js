const knex = require('knex').default;
const assert = require('node:assert/strict');
const SubscriptionStatsService = require('../../../../../core/server/services/stats/subscription-stats-service');

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
            await db.schema.createTable('gifts', function (table) {
                table.string('id');
                table.string('tier_id');
                table.string('cadence');
                table.string('status');
                table.dateTime('redeemed_at');
                table.dateTime('consumed_at');
                table.dateTime('expired_at');
                table.dateTime('refunded_at');
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

        it('Includes gift redemptions and end-of-life events alongside paid deltas', async function () {
            const tiers = await createTiers(['basic']);

            // One paid monthly signup on day 1
            const NEW = createEvent('created');
            await insertEvents([
                [NEW('A', tiers.basic.monthly)]
            ]);

            // Gifts covering each end-of-life branch:
            //  - g-month: redeemed day 1, still active
            //  - g-year-consumed:  redeemed day 1, consumed day 2
            //  - g-year-expired:   redeemed day 1, expired day 3
            //  - g-month-refunded: redeemed day 1, refunded day 4
            await db('gifts').insert([
                {id: 'g-month', tier_id: 'basic', cadence: 'month', status: 'redeemed', redeemed_at: '1970-01-01T00:00:00.000Z'},
                {id: 'g-year-consumed', tier_id: 'basic', cadence: 'year', status: 'consumed', redeemed_at: '1970-01-01T00:00:00.000Z', consumed_at: '1970-01-02T00:00:00.000Z'},
                {id: 'g-year-expired', tier_id: 'basic', cadence: 'year', status: 'expired', redeemed_at: '1970-01-01T00:00:00.000Z', expired_at: '1970-01-03T00:00:00.000Z'},
                {id: 'g-month-refunded', tier_id: 'basic', cadence: 'month', status: 'refunded', redeemed_at: '1970-01-01T00:00:00.000Z', refunded_at: '1970-01-04T00:00:00.000Z'}
            ]);

            const stats = new SubscriptionStatsService({knex: db});
            const result = await stats.getSubscriptionHistory();

            // Sum signups/cancellations across all rows for a given (tier, cadence, date).
            const sumWhere = (tier, cadence, date, field) => result.data
                .filter(r => r.tier === tier && r.cadence === cadence && r.date === date)
                .reduce((acc, r) => acc + r[field], 0);

            // Day 1 monthly: 1 paid + 2 gift redemptions (g-month, g-month-refunded) = 3 signups
            assert.equal(sumWhere('basic', 'month', '1970-01-01', 'signups'), 3);
            // Day 1 yearly: 2 gift redemptions (g-year-consumed, g-year-expired)
            assert.equal(sumWhere('basic', 'year', '1970-01-01', 'signups'), 2);

            // Each end-of-life branch produces a cancellation on its own date:
            //  - day 2: g-year-consumed
            assert.equal(sumWhere('basic', 'year', '1970-01-02', 'cancellations'), 1);
            //  - day 3: g-year-expired
            assert.equal(sumWhere('basic', 'year', '1970-01-03', 'cancellations'), 1);
            //  - day 4: g-month-refunded
            assert.equal(sumWhere('basic', 'month', '1970-01-04', 'cancellations'), 1);
        });

        it('Includes active gifts in the current totals so rolled-back snapshots stay accurate', async function () {
            await createTiers(['basic']);

            // Two active redeemed gifts, no paid subs.
            await db('gifts').insert([
                {id: 'g1', tier_id: 'basic', cadence: 'year', status: 'redeemed', redeemed_at: '1970-01-01T00:00:00.000Z'},
                {id: 'g2', tier_id: 'basic', cadence: 'year', status: 'redeemed', redeemed_at: '1970-01-02T00:00:00.000Z'}
            ]);

            const stats = new SubscriptionStatsService({knex: db});
            const result = await stats.getSubscriptionHistory();

            // Without including gifts in totals, the baseline would be 0 and rolled-back
            // counts would all be negative (clamped to 0), undercounting history.
            const yearlyTotal = result.meta.totals.find(t => t.tier === 'basic' && t.cadence === 'year');
            assert(yearlyTotal);
            assert.equal(yearlyTotal.count, 2);
        });

        it('Aggregates paid and gift deltas that share (date, tier, cadence) into a single row', async function () {
            const tiers = await createTiers(['basic']);

            // Paid yearly signup on day 1
            const NEW = createEvent('created');
            await insertEvents([
                [NEW('A', tiers.basic.yearly)]
            ]);

            // Gift yearly signup on the same day (basic tier)
            await db('gifts').insert({
                id: 'g-same-day',
                tier_id: 'basic',
                cadence: 'year',
                status: 'redeemed',
                redeemed_at: '1970-01-01T00:00:00.000Z'
            });

            const stats = new SubscriptionStatsService({knex: db});
            const result = await stats.getSubscriptionHistory();

            // There should be exactly one row for (basic, year, day 1) with combined deltas,
            // not two — otherwise the row's `count` snapshot is ambiguous.
            const rows = result.data.filter(r => r.tier === 'basic' && r.cadence === 'year' && r.date === '1970-01-01');
            assert.equal(rows.length, 1);
            assert.equal(rows[0].signups, 2);
            assert.equal(rows[0].positive_delta, 2);
        });

        it('Excludes unredeemed gifts (expired/refunded before redemption) from cancellations', async function () {
            await createTiers(['basic']);

            // Both branches of "ended without ever being redeemed":
            //  - refunded before redemption
            //  - expired before redemption
            // Neither produced a signup, so neither must produce a cancellation.
            await db('gifts').insert([
                {id: 'g-refunded', tier_id: 'basic', cadence: 'year', status: 'refunded', redeemed_at: null, refunded_at: '1970-01-02T00:00:00.000Z'},
                {id: 'g-expired', tier_id: 'basic', cadence: 'month', status: 'expired', redeemed_at: null, expired_at: '1970-01-03T00:00:00.000Z'}
            ]);

            const stats = new SubscriptionStatsService({knex: db});
            const result = await stats.getSubscriptionHistory();

            // No rows should exist for either tier/cadence combination.
            assert.equal(result.data.filter(r => r.tier === 'basic' && r.cadence === 'year').length, 0);
            assert.equal(result.data.filter(r => r.tier === 'basic' && r.cadence === 'month').length, 0);
        });

        it('Sorts merged paid+gift deltas by date so running counts roll back correctly', async function () {
            const tiers = await createTiers(['basic']);

            // Gift yearly redemption on day 1 (earliest event)
            await db('gifts').insert({
                id: 'g-early',
                tier_id: 'basic',
                cadence: 'year',
                status: 'redeemed',
                redeemed_at: '1970-01-01T00:00:00.000Z'
            });

            // Paid yearly signup on day 3 (latest event). paidDeltas comes first
            // in the concat, so without sorting the order would be:
            //   [paid@day3, gift@day1]
            // Walking backwards: gift@day1 then paid@day3 — earlier-dated entry
            // applied to the running count BEFORE the later one, corrupting snapshots.
            const NEW = createEvent('created');
            await insertEvents([
                [],
                [],
                [NEW('A', tiers.basic.yearly)]
            ]);

            const stats = new SubscriptionStatsService({knex: db});
            const result = await stats.getSubscriptionHistory();

            // fetchSubscriptionCounts() returns 2 yearly basic subs (1 paid + 1 active gift).
            // Walking backwards from countData=2 in ascending date order:
            //   day 3 (paid signup):  emit count=2, then countData -= 1 → 1
            //   day 1 (gift signup):  emit count=1, then countData -= 1 → 0
            const day1Yearly = result.data.find(r => r.tier === 'basic' && r.cadence === 'year' && r.date === '1970-01-01');
            const day3Yearly = result.data.find(r => r.tier === 'basic' && r.cadence === 'year' && r.date === '1970-01-03');

            assert(day1Yearly);
            assert(day3Yearly);
            // After both signups: 2 yearly subs total
            assert.equal(day3Yearly.count, 2);
            // After only the gift signup, before the paid signup: 1 yearly sub
            assert.equal(day1Yearly.count, 1);
        });
    });
});
