const MrrStatsService = require('../../lib/MrrStatsService');
const moment = require('moment');
const sinon = require('sinon');
const knex = require('knex').default;
require('should');

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
    });
});
