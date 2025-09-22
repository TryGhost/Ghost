const MrrStatsService = require('../../../../../core/server/services/stats/MrrStatsService');
const moment = require('moment');
const sinon = require('sinon');
const knex = require('knex').default;
const should = require('should');

describe('MrrStatsService', function () {
    describe('getHistory', function () {
        /** @type {MrrStatsService} */
        let mrrStatsService;

        const today = '2000-01-10';
        const tomorrow = '2000-01-11';
        const yesterday = '2000-01-09';
        const dayBeforeYesterday = '2000-01-08';
        const twoDaysBeforeYesterday = '2000-01-07';

        after(function () {
            sinon.restore();
        });

        /** @type {import('knex').Knex} */
        let db;

        before(function () {
            const todayDate = moment(today).toDate();
            sinon.useFakeTimers(todayDate.getTime());
        });

        beforeEach(async function () {
            db = knex({client: 'sqlite3', connection: {filename: ':memory:'}, useNullAsDefault: true});
            mrrStatsService = new MrrStatsService({knex: db});

            await db.schema.createTable('members_paid_subscription_events', function (table) {
                table.string('currency');
                table.string('mrr_delta');
                table.date('created_at');
            });

            await db.schema.createTable('members_stripe_customers_subscriptions', function (table) {
                table.string('plan_currency');
                table.string('mrr');
            });
        });

        afterEach(async function () {
            await db.destroy();
        });

        it('Handles no data', async function () {
            const {data: results, meta} = await mrrStatsService.getHistory();
            results.length.should.eql(1);

            // Note that currencies should always be sorted ascending, so EUR should be first.
            results[0].should.eql({
                date: today,
                mrr: 0,
                currency: 'usd'
            });
            meta.totals.should.eql([
                {
                    mrr: 0,
                    currency: 'usd'
                }
            ]);
        });

        it('Always returns at least one value', async function () {
            await db('members_stripe_customers_subscriptions').insert([{
                plan_currency: 'usd',
                mrr: 1
            }, {
                plan_currency: 'eur',
                mrr: 2
            }]);

            const {data: results, meta} = await mrrStatsService.getHistory();
            results.length.should.eql(2);

            // Note that currencies should always be sorted ascending, so EUR should be first.
            results[0].should.eql({
                date: today,
                mrr: 2,
                currency: 'eur'
            });
            results[1].should.eql({
                date: today,
                mrr: 1,
                currency: 'usd'
            });
            meta.totals.should.eql([
                {
                    mrr: 2,
                    currency: 'eur'
                },
                {
                    mrr: 1,
                    currency: 'usd'
                }
            ]);
        });

        it('Does not substract delta of first event', async function () {
            await db('members_stripe_customers_subscriptions').insert([{
                plan_currency: 'usd',
                mrr: 5
            }]);
            await db('members_paid_subscription_events').insert([{
                created_at: today,
                mrr_delta: 5,
                currency: 'usd'
            }]);

            const {data: results, meta} = await mrrStatsService.getHistory();
            results.length.should.eql(2);
            results[0].should.eql({
                date: yesterday,
                mrr: 0,
                currency: 'usd'
            });
            results[1].should.eql({
                date: today,
                mrr: 5,
                currency: 'usd'
            });
            meta.totals.should.eql([
                {
                    mrr: 5,
                    currency: 'usd'
                }
            ]);
        });

        it('Correctly calculates deltas', async function () {
            await db('members_paid_subscription_events').insert([{
                created_at: yesterday,
                mrr_delta: 2,
                currency: 'usd'
            },
            {
                created_at: today,
                mrr_delta: 5,
                currency: 'usd'
            }]);

            await db('members_stripe_customers_subscriptions').insert([{
                plan_currency: 'usd',
                mrr: 2
            }, {
                plan_currency: 'usd',
                mrr: 5
            }]);

            const {data: results, meta} = await mrrStatsService.getHistory();
            results.length.should.eql(3);
            results[0].should.eql({
                date: dayBeforeYesterday,
                mrr: 0,
                currency: 'usd'
            });
            results[1].should.eql({
                date: yesterday,
                mrr: 2,
                currency: 'usd'
            });
            results[2].should.eql({
                date: today,
                mrr: 7,
                currency: 'usd'
            });
            meta.totals.should.eql([
                {
                    mrr: 7,
                    currency: 'usd'
                }
            ]);
        });

        it('Correctly calculates deltas for multiple currencies', async function () {
            await db('members_paid_subscription_events').insert([
                {
                    created_at: yesterday,
                    mrr_delta: 200,
                    currency: 'eur'
                },
                {
                    created_at: yesterday,
                    mrr_delta: 2,
                    currency: 'usd'
                },
                {
                    created_at: today,
                    mrr_delta: 800,
                    currency: 'eur'
                },
                {
                    created_at: today,
                    mrr_delta: 5,
                    currency: 'usd'
                }
            ]);

            await db('members_stripe_customers_subscriptions').insert([{
                plan_currency: 'eur',
                mrr: 200
            }, {
                plan_currency: 'usd',
                mrr: 2
            }, {
                plan_currency: 'eur',
                mrr: 800
            }, {
                plan_currency: 'usd',
                mrr: 5
            }, {
                plan_currency: 'eur',
                mrr: 200
            }]);

            const {data: results, meta} = await mrrStatsService.getHistory();
            results.length.should.eql(6);
            results[0].should.eql({
                date: dayBeforeYesterday,
                mrr: 200,
                currency: 'eur'
            });
            results[1].should.eql({
                date: dayBeforeYesterday,
                mrr: 0,
                currency: 'usd'
            });
            results[2].should.eql({
                date: yesterday,
                mrr: 400,
                currency: 'eur'
            });
            results[3].should.eql({
                date: yesterday,
                mrr: 2,
                currency: 'usd'
            });
            results[4].should.eql({
                date: today,
                mrr: 1200,
                currency: 'eur'
            });
            results[5].should.eql({
                date: today,
                mrr: 7,
                currency: 'usd'
            });
            meta.totals.should.eql([
                {
                    mrr: 1200,
                    currency: 'eur'
                },
                {
                    mrr: 7,
                    currency: 'usd'
                }
            ]);
        });

        it('Ignores invalid currencies in deltas', async function () {
            await db('members_paid_subscription_events').insert({
                created_at: today,
                mrr_delta: 200,
                currency: 'abc'
            });

            await db('members_stripe_customers_subscriptions').insert({
                plan_currency: 'usd',
                mrr: 7
            });

            const {data: results, meta} = await mrrStatsService.getHistory();
            results.length.should.eql(1);
            results[0].should.eql({
                date: yesterday,
                mrr: 7,
                currency: 'usd'
            });
            meta.totals.should.eql([
                {
                    mrr: 7,
                    currency: 'usd'
                }
            ]);
        });

        it('Ignores events in the future', async function () {
            await db('members_paid_subscription_events').insert([
                {
                    created_at: yesterday,
                    mrr_delta: 2,
                    currency: 'usd'
                },
                {
                    created_at: today,
                    mrr_delta: 5,
                    currency: 'usd'
                },
                {
                    created_at: tomorrow,
                    mrr_delta: 10,
                    currency: 'usd'
                }
            ]);

            await db('members_stripe_customers_subscriptions').insert({plan_currency: 'usd', mrr: 7});

            const {data: results, meta} = await mrrStatsService.getHistory();
            results.length.should.eql(3);
            results[0].should.eql({
                date: dayBeforeYesterday,
                mrr: 0,
                currency: 'usd'
            });
            results[1].should.eql({
                date: yesterday,
                mrr: 2,
                currency: 'usd'
            });
            results[2].should.eql({
                date: today,
                mrr: 7,
                currency: 'usd'
            });
            meta.totals.should.eql([
                {
                    mrr: 7,
                    currency: 'usd'
                }
            ]);
        });

        it('Correctly handles negative total MRR', async function () {
            await db('members_paid_subscription_events').insert([
                {
                    created_at: dayBeforeYesterday,
                    mrr_delta: 2,
                    currency: 'usd'
                },
                {
                    created_at: yesterday,
                    mrr_delta: -1000,
                    currency: 'usd'
                },
                {
                    created_at: today,
                    mrr_delta: 1000,
                    currency: 'usd'
                }
            ]);

            await db('members_stripe_customers_subscriptions').insert({plan_currency: 'usd', mrr: 7});

            const {data: results, meta} = await mrrStatsService.getHistory();
            results.length.should.eql(4);
            results[0].should.eql({
                date: twoDaysBeforeYesterday,
                mrr: 5,
                currency: 'usd'
            });
            results[1].should.eql({
                date: dayBeforeYesterday,
                // We are mainly testing that this should not be 1000!
                mrr: 7,
                currency: 'usd'
            });
            results[2].should.eql({
                date: yesterday,
                // Should never be shown negative (in fact it is -993 here)
                mrr: 0,
                currency: 'usd'
            });
            results[3].should.eql({
                date: today,
                mrr: 7,
                currency: 'usd'
            });
            meta.totals.should.eql([
                {
                    mrr: 7,
                    currency: 'usd'
                }
            ]);
        });

        it('Can see MRR data from 6 months ago', async function () {
            // Setup: Create MRR events from 6 months ago
            const sixMonthsAgo = moment(today).subtract(6, 'months').format('YYYY-MM-DD');
            const fiveMonthsAgo = moment(today).subtract(5, 'months').format('YYYY-MM-DD');
            const fourMonthsAgo = moment(today).subtract(4, 'months').format('YYYY-MM-DD');

            // Add current MRR total
            await db('members_stripe_customers_subscriptions').insert([
                {plan_currency: 'usd', mrr: 12000} // $120.00 current MRR
            ]);

            // Add historical subscription events (6 months of history)
            await db('members_paid_subscription_events').insert([
                // 6 months ago: first subscription for $30
                {currency: 'usd', mrr_delta: 3000, created_at: sixMonthsAgo},
                // 5 months ago: another subscription for $50
                {currency: 'usd', mrr_delta: 5000, created_at: fiveMonthsAgo},
                // 4 months ago: another subscription for $40
                {currency: 'usd', mrr_delta: 4000, created_at: fourMonthsAgo},
                // Yesterday: small churn
                {currency: 'usd', mrr_delta: -100, created_at: yesterday},
                // Today: new subscription
                {currency: 'usd', mrr_delta: 100, created_at: today}
            ]);

            const {data: results} = await mrrStatsService.getHistory();

            // The test expects to see MRR data going back 6 months
            // But currently it only returns 90 days of data
            // So we expect this to fail - results won't include the 6-month old data

            // Find the earliest date in results
            const earliestDate = results[0].date;
            const earliestMoment = moment(earliestDate);
            const sixMonthsAgoMoment = moment(sixMonthsAgo);

            // This assertion will fail because the service only looks back 90 days
            // We want it to pass by showing data from 6 months ago
            earliestMoment.isSameOrBefore(sixMonthsAgoMoment, 'day').should.be.true(
                `Expected to see MRR data from ${sixMonthsAgo} but earliest date was ${earliestDate}`
            );

            // We should see the progressive MRR growth over 6 months
            // Starting from 0, then 30, then 80, then 120
            const sixMonthsAgoData = results.find(r => r.date === sixMonthsAgo);
            should.exist(sixMonthsAgoData, 'Should have data from 6 months ago');
            sixMonthsAgoData.mrr.should.eql(3000); // First subscription

            const fiveMonthsAgoData = results.find(r => r.date === fiveMonthsAgo);
            should.exist(fiveMonthsAgoData, 'Should have data from 5 months ago');
            fiveMonthsAgoData.mrr.should.eql(8000); // First + second subscription

            const fourMonthsAgoData = results.find(r => r.date === fourMonthsAgo);
            should.exist(fourMonthsAgoData, 'Should have data from 4 months ago');
            fourMonthsAgoData.mrr.should.eql(12000); // All three subscriptions
        });
    });
});
