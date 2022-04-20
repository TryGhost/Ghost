const MembersStatsService = require('../../../../../core/server/services/stats/lib/members-stats-service');
const assert = require('assert');
const moment = require('moment');
const sinon = require('sinon');
require('should');

describe('MembersStatsService', function () {
    describe('fetchAllSubscriptionDeltas', function () {
        const knex = require('knex')({
            client: 'sqlite',
            useNullAsDefault: true,
            connection: {
                filename: ':memory:'
            }
        });

        beforeEach(async function () {
            await knex.schema.dropTableIfExists('products');
            await knex.schema.dropTableIfExists('stripe_products');
            await knex.schema.dropTableIfExists('stripe_prices');
            await knex.schema.dropTableIfExists('members_paid_subscription_events');
            await knex.schema.createTable('products', function (table) {
                table.string('id');
            });
            await knex.schema.createTable('stripe_products', function (table) {
                table.string('stripe_product_id');
                table.string('product_id');
            });
            await knex.schema.createTable('stripe_prices', function (table) {
                table.string('id');
                table.string('stripe_price_id');
                table.string('stripe_product_id');
                table.string('interval');
            });
            await knex.schema.createTable('members_paid_subscription_events', function (table) {
                table.string('type');
                table.string('from_plan');
                table.string('to_plan');
                table.int('mrr_delta');
                table.date('created_at');
            });
        });

        async function createTiers(tiers) {
            const results = {};
            for (const tier of tiers) {
                await knex('products').insert({id: tier});
                await knex('stripe_products').insert({
                    product_id: tier,
                    stripe_product_id: `stripe_product_${tier}`
                });
                await knex('stripe_prices').insert({
                    id: `stripe_price_month_${tier}`,
                    stripe_price_id: `stripe_price_month_${tier}`,
                    stripe_product_id: `stripe_product_${tier}`,
                    interval: 'month'
                });
                await knex('stripe_prices').insert({
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

        async function insertEvents(days) {
            const {DateTime} = require('luxon');
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
                    return {
                        type: event.type,
                        from_plan: event.type === 'created' ? null : `stripe_price_${last.cadence}_${last.tier}`,
                        to_plan: event.cadence && event.tier ? `stripe_price_${event.cadence}_${event.tier}` : `stripe_price_${last.cadence}_${last.tier}`,
                        mrr_delta: event.type === 'created' ? event.mrr : -last.mrr,
                        created_at: day
                    };
                }));
            }
            await knex('members_paid_subscription_events').insert(toInsert);
        }

        it('Gets the correct data for the basic case', async function () {
            const tiers = await createTiers(['basic', 'advanced']);

            const thing = type => (id, attr = {}) => Object.assign({}, attr, {id, type});
            const NEW = thing('created');
            const CANCEL = thing('canceled');

            const events = [
                [NEW('A', tiers.basic.monthly), NEW('B', tiers.advanced.yearly)],
                [CANCEL('B'), NEW('C', tiers.advanced.monthly)],
                [CANCEL('A'), NEW('D', tiers.basic.monthly)]
            ];

            await insertEvents(events);

            const stats = new MembersStatsService({db: {knex}});

            const results = await stats.fetchAllSubscriptionDeltas();

            const finder = (tier, cadence, date) => (result) => {
                return result.tier === tier && result.cadence === cadence && result.date === date;
            };

            const firstDayBasicMonthly = results.find(finder('basic', 'month', '1970-01-01'));
            const firstDayAdvancedYearly = results.find(finder('advanced', 'year', '1970-01-01'));
            const secondDayAdvancedYearly = results.find(finder('advanced', 'year', '1970-01-02'));
            const secondDayAdvancedMonthly = results.find(finder('advanced', 'month', '1970-01-02'));
            const thirdDayBasicMonthly = results.find(finder('basic', 'month', '1970-01-03'));

            assert(firstDayBasicMonthly);
            assert(firstDayBasicMonthly.positive_delta === 1);
            assert(firstDayBasicMonthly.negative_delta === 0);

            assert(firstDayAdvancedYearly);
            assert(firstDayAdvancedYearly.positive_delta === 1);
            assert(firstDayAdvancedYearly.negative_delta === 0);

            assert(secondDayAdvancedYearly);
            assert(secondDayAdvancedYearly.positive_delta === 0);
            assert(secondDayAdvancedYearly.negative_delta === 1);

            assert(secondDayAdvancedMonthly);
            assert(secondDayAdvancedMonthly.positive_delta === 1);
            assert(secondDayAdvancedMonthly.negative_delta === 0);

            assert(thirdDayBasicMonthly);
            assert(thirdDayBasicMonthly.positive_delta === 1);
            assert(thirdDayBasicMonthly.negative_delta === 1);
        });
    });
    describe('getCountHistory', function () {
        let membersStatsService;
        let fakeStatuses;
        let fakeTotal;

        /**
         * @type {MembersStatsService.TotalMembersByStatus}
         */
        const currentCounts = {paid: 0, free: 0, comped: 0};
        /**
         * @type {MembersStatsService.MemberStatusDelta[]}
         */
        let events = [];
        const today = '2000-01-10';
        const tomorrow = '2000-01-11';
        const yesterday = '2000-01-09';
        const dayBeforeYesterday = '2000-01-08';
        const twoDaysBeforeYesterday = '2000-01-07';
        const todayDate = moment(today).toDate();
        const tomorrowDate = moment(tomorrow).toDate();
        const yesterdayDate = moment(yesterday).toDate();
        const dayBeforeYesterdayDate = moment(dayBeforeYesterday).toDate();

        before(function () {
            sinon.useFakeTimers(todayDate.getTime());
            membersStatsService = new MembersStatsService({db: null});
            fakeTotal = sinon.stub(membersStatsService, 'getCount').resolves(currentCounts);
            fakeStatuses = sinon.stub(membersStatsService, 'fetchAllStatusDeltas').callsFake(() => {
                // Sort here ascending to mimic same ordering
                events.sort((a, b) => {
                    return a.date < b.date ? -1 : 1;
                });
                return Promise.resolve(events);
            });
        });

        afterEach(function () {
            fakeStatuses.resetHistory();
            fakeTotal.resetHistory();
        });

        it('Always returns at least one value', async function () {
            // No status events
            events = [];
            currentCounts.paid = 1;
            currentCounts.free = 2;
            currentCounts.comped = 3;

            const {data: results, meta} = await membersStatsService.getCountHistory();
            results.length.should.eql(1);
            results[0].should.eql({
                date: today,
                paid: 1,
                free: 2,
                comped: 3,
                paid_subscribed: 0,
                paid_canceled: 0
            });
            meta.totals.should.eql(currentCounts);

            fakeStatuses.calledOnce.should.eql(true);
            fakeTotal.calledOnce.should.eql(true);
        });

        it('Passes paid_subscribers and paid_canceled', async function () {
            // Update faked status events
            events = [
                {
                    date: todayDate,
                    paid_subscribed: 4,
                    paid_canceled: 3,
                    free_delta: 2,
                    comped_delta: 3
                }
            ];

            // Update current faked counts
            currentCounts.paid = 1;
            currentCounts.free = 2;
            currentCounts.comped = 3;

            const {data: results, meta} = await membersStatsService.getCountHistory();
            results.should.eql([
                {
                    date: yesterday,
                    paid: 0,
                    free: 0,
                    comped: 0,
                    paid_subscribed: 0,
                    paid_canceled: 0
                },
                {
                    date: today,
                    paid: 1,
                    free: 2,
                    comped: 3,
                    paid_subscribed: 4,
                    paid_canceled: 3
                }
            ]);
            meta.totals.should.eql(currentCounts);
            fakeStatuses.calledOnce.should.eql(true);
            fakeTotal.calledOnce.should.eql(true);
        });

        it('Correctly resolves deltas', async function () {
            // Update faked status events
            events = [
                {
                    date: yesterdayDate,
                    paid_subscribed: 2,
                    paid_canceled: 1,
                    free_delta: 0,
                    comped_delta: 0
                },
                {
                    date: todayDate,
                    paid_subscribed: 4,
                    paid_canceled: 3,
                    free_delta: 2,
                    comped_delta: 3
                }
            ];

            // Update current faked counts
            currentCounts.paid = 2;
            currentCounts.free = 3;
            currentCounts.comped = 4;

            const {data: results, meta} = await membersStatsService.getCountHistory();
            results.should.eql([
                {
                    date: dayBeforeYesterday,
                    paid: 0,
                    free: 1,
                    comped: 1,
                    paid_subscribed: 0,
                    paid_canceled: 0
                },
                {
                    date: yesterday,
                    paid: 1,
                    free: 1,
                    comped: 1,
                    paid_subscribed: 2,
                    paid_canceled: 1
                }, 
                {
                    date: today,
                    paid: 2,
                    free: 3,
                    comped: 4,
                    paid_subscribed: 4,
                    paid_canceled: 3
                }
            ]);
            meta.totals.should.eql(currentCounts);
            fakeStatuses.calledOnce.should.eql(true);
            fakeTotal.calledOnce.should.eql(true);
        });

        it('Correctly handles negative numbers', async function () {
            // Update faked status events
            events = [ 
                {
                    date: dayBeforeYesterdayDate,
                    paid_subscribed: 2,
                    paid_canceled: 1,
                    free_delta: 2,
                    comped_delta: 10
                },
                {
                    date: yesterdayDate,
                    paid_subscribed: 2,
                    paid_canceled: 1,
                    free_delta: -100,
                    comped_delta: 0
                }, 
                {
                    date: todayDate,
                    paid_subscribed: 4,
                    paid_canceled: 3,
                    free_delta: 100,
                    comped_delta: 3
                }
            ];

            // Update current faked counts
            currentCounts.paid = 2;
            currentCounts.free = 3;
            currentCounts.comped = 4;

            const {data: results, meta} = await membersStatsService.getCountHistory();
            results.should.eql([
                {
                    date: twoDaysBeforeYesterday,
                    paid: 0,
                    free: 1,
                    comped: 0,
                    paid_subscribed: 0,
                    paid_canceled: 0
                },
                {
                    date: dayBeforeYesterday,
                    paid: 0,
                    // note that this shouldn't be 100 (which is also what we test here):
                    free: 3, 
                    comped: 1,
                    paid_subscribed: 2,
                    paid_canceled: 1
                }, 
                {
                    date: yesterday,
                    paid: 1,
                    // never return negative numbers, this is in fact -997:
                    free: 0,
                    comped: 1,
                    paid_subscribed: 2,
                    paid_canceled: 1
                }, 
                {
                    date: today,
                    paid: 2,
                    free: 3,
                    comped: 4,
                    paid_subscribed: 4,
                    paid_canceled: 3
                }
            ]);
            meta.totals.should.eql(currentCounts);
            fakeStatuses.calledOnce.should.eql(true);
            fakeTotal.calledOnce.should.eql(true);
        });

        it('Ignores events in the future', async function () {
            // Update faked status events
            events = [
                {
                    date: yesterdayDate,
                    paid_subscribed: 1,
                    paid_canceled: 0,
                    free_delta: 1,
                    comped_delta: 0
                },
                {
                    date: todayDate,
                    paid_subscribed: 4,
                    paid_canceled: 3,
                    free_delta: 2,
                    comped_delta: 3
                }, 
                {
                    date: tomorrowDate,
                    paid_subscribed: 10,
                    paid_canceled: 5,
                    free_delta: 8,
                    comped_delta: 9
                }
            ];

            // Update current faked counts
            currentCounts.paid = 1;
            currentCounts.free = 2;
            currentCounts.comped = 3;

            const {data: results, meta} = await membersStatsService.getCountHistory();
            results.should.eql([
                {
                    date: dayBeforeYesterday,
                    paid: 0,
                    free: 0,
                    comped: 0,
                    paid_subscribed: 0,
                    paid_canceled: 0
                },
                {
                    date: yesterday,
                    paid: 0,
                    free: 0,
                    comped: 0,
                    paid_subscribed: 1,
                    paid_canceled: 0
                },
                {
                    date: today,
                    paid: 1,
                    free: 2,
                    comped: 3,
                    paid_subscribed: 4,
                    paid_canceled: 3
                }
            ]);
            meta.totals.should.eql(currentCounts);
            fakeStatuses.calledOnce.should.eql(true);
            fakeTotal.calledOnce.should.eql(true);
        });
    });
});
