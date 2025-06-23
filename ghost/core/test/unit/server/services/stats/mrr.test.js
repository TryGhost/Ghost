const MrrStatsService = require('../../../../../core/server/services/stats/MrrStatsService');
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

    describe('getCurrentMrr', function () {
        /** @type {MrrStatsService} */
        let mrrStatsService;

        /** @type {import('knex').Knex} */
        let db;

        beforeEach(async function () {
            db = knex({client: 'sqlite3', connection: {filename: ':memory:'}, useNullAsDefault: true});
            mrrStatsService = new MrrStatsService({knex: db});

            await db.schema.createTable('members_stripe_customers_subscriptions', function (table) {
                table.string('plan_currency');
                table.integer('mrr');
            });
        });

        afterEach(async function () {
            await db.destroy();
        });

        it('returns USD placeholder when no subscriptions exist', async function () {
            const result = await mrrStatsService.getCurrentMrr();

            result.length.should.eql(1);
            result[0].should.eql({
                currency: 'usd',
                mrr: 0
            });
        });

        it('returns current MRR for single currency', async function () {
            await db('members_stripe_customers_subscriptions').insert([
                {plan_currency: 'usd', mrr: 500},
                {plan_currency: 'usd', mrr: 750},
                {plan_currency: 'usd', mrr: 250}
            ]);

            const result = await mrrStatsService.getCurrentMrr();

            result.length.should.eql(1);
            result[0].should.eql({
                currency: 'usd',
                mrr: 1500
            });
        });

        it('returns current MRR for multiple currencies in ascending order', async function () {
            await db('members_stripe_customers_subscriptions').insert([
                {plan_currency: 'usd', mrr: 500},
                {plan_currency: 'eur', mrr: 750},
                {plan_currency: 'gbp', mrr: 250},
                {plan_currency: 'usd', mrr: 300},
                {plan_currency: 'eur', mrr: 150}
            ]);

            const result = await mrrStatsService.getCurrentMrr();

            result.length.should.eql(3);
            
            // Should be sorted alphabetically by currency
            result[0].should.eql({
                currency: 'eur',
                mrr: 900
            });
            result[1].should.eql({
                currency: 'gbp',
                mrr: 250
            });
            result[2].should.eql({
                currency: 'usd',
                mrr: 800
            });
        });

        it('handles zero MRR values correctly', async function () {
            await db('members_stripe_customers_subscriptions').insert([
                {plan_currency: 'usd', mrr: 0},
                {plan_currency: 'eur', mrr: 500}
            ]);

            const result = await mrrStatsService.getCurrentMrr();

            result.length.should.eql(2);
            result[0].should.eql({
                currency: 'eur',
                mrr: 500
            });
            result[1].should.eql({
                currency: 'usd',
                mrr: 0
            });
        });

        it('handles negative MRR values correctly', async function () {
            await db('members_stripe_customers_subscriptions').insert([
                {plan_currency: 'usd', mrr: 1000},
                {plan_currency: 'usd', mrr: -200}
            ]);

            const result = await mrrStatsService.getCurrentMrr();

            result.length.should.eql(1);
            result[0].should.eql({
                currency: 'usd',
                mrr: 800
            });
        });
    });

    describe('fetchAllDeltas', function () {
        /** @type {MrrStatsService} */
        let mrrStatsService;

        /** @type {import('knex').Knex} */
        let db;

        beforeEach(async function () {
            db = knex({client: 'sqlite3', connection: {filename: ':memory:'}, useNullAsDefault: true});
            mrrStatsService = new MrrStatsService({knex: db});

            await db.schema.createTable('members_paid_subscription_events', function (table) {
                table.string('currency');
                table.integer('mrr_delta');
                table.datetime('created_at');
            });
        });

        afterEach(async function () {
            await db.destroy();
        });

        it('returns empty array when no events exist', async function () {
            const result = await mrrStatsService.fetchAllDeltas();

            result.length.should.eql(0);
        });

        it('returns deltas for events within 90 days', async function () {
            const today = moment().format('YYYY-MM-DD HH:mm:ss');
            const tenDaysAgo = moment().subtract(10, 'days').format('YYYY-MM-DD HH:mm:ss');
            const twentyDaysAgo = moment().subtract(20, 'days').format('YYYY-MM-DD HH:mm:ss');

            await db('members_paid_subscription_events').insert([
                {currency: 'usd', mrr_delta: 500, created_at: today},
                {currency: 'usd', mrr_delta: 250, created_at: tenDaysAgo},
                {currency: 'eur', mrr_delta: 300, created_at: twentyDaysAgo}
            ]);

            const result = await mrrStatsService.fetchAllDeltas();

            result.length.should.eql(3);
            
            // Should contain all events
            const currencies = result.map(r => r.currency);
            const deltas = result.map(r => r.delta);
            
            currencies.should.match(/usd/);
            currencies.should.match(/eur/);
            deltas.should.match(/500/);
            deltas.should.match(/250/);
            deltas.should.match(/300/);
        });

        it('excludes events older than 90 days', async function () {
            const today = moment().format('YYYY-MM-DD HH:mm:ss');
            const eightyDaysAgo = moment().subtract(80, 'days').format('YYYY-MM-DD HH:mm:ss');
            const hundredDaysAgo = moment().subtract(100, 'days').format('YYYY-MM-DD HH:mm:ss');

            await db('members_paid_subscription_events').insert([
                {currency: 'usd', mrr_delta: 500, created_at: today},
                {currency: 'usd', mrr_delta: 250, created_at: eightyDaysAgo},
                {currency: 'usd', mrr_delta: 100, created_at: hundredDaysAgo} // Should be excluded
            ]);

            const result = await mrrStatsService.fetchAllDeltas();

            result.should.be.an.Array();
            result.length.should.equal(2);
            
            const deltas = result.map(r => r.delta);
            deltas.should.containEql(500);
            deltas.should.containEql(250);
            deltas.should.not.containEql(100); // Old event should be excluded
        });

        it('groups deltas by date and currency', async function () {
            const today = moment().format('YYYY-MM-DD HH:mm:ss');
            const todayLater = moment().add(2, 'hours').format('YYYY-MM-DD HH:mm:ss');
            const yesterday = moment().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss');

            await db('members_paid_subscription_events').insert([
                {currency: 'usd', mrr_delta: 500, created_at: today},
                {currency: 'usd', mrr_delta: 250, created_at: todayLater}, // Same day, should be grouped
                {currency: 'usd', mrr_delta: 300, created_at: yesterday},
                {currency: 'eur', mrr_delta: 400, created_at: today}
            ]);

            const result = await mrrStatsService.fetchAllDeltas();

            result.should.be.an.Array();
            result.length.should.equal(3);
            
            // Find the grouped USD entry for today
            const usdToday = result.find(r => r.currency === 'usd' && r.date === moment().format('YYYY-MM-DD'));
            const usdYesterday = result.find(r => r.currency === 'usd' && r.date === moment().subtract(1, 'day').format('YYYY-MM-DD'));
            const eurToday = result.find(r => r.currency === 'eur' && r.date === moment().format('YYYY-MM-DD'));

            usdToday.should.not.be.undefined();
            usdToday.delta.should.equal(750); // 500 + 250 grouped together
            
            usdYesterday.should.not.be.undefined();
            usdYesterday.delta.should.equal(300);
            
            eurToday.should.not.be.undefined();
            eurToday.delta.should.equal(400);
        });

        it('handles negative deltas correctly', async function () {
            const today = moment().format('YYYY-MM-DD HH:mm:ss');

            await db('members_paid_subscription_events').insert([
                {currency: 'usd', mrr_delta: 500, created_at: today},
                {currency: 'usd', mrr_delta: -200, created_at: today},
                {currency: 'eur', mrr_delta: -100, created_at: today}
            ]);

            const result = await mrrStatsService.fetchAllDeltas();

            result.should.be.an.Array();
            result.length.should.equal(2);
            
            const usdEntry = result.find(r => r.currency === 'usd');
            const eurEntry = result.find(r => r.currency === 'eur');

            usdEntry.should.not.be.undefined();
            usdEntry.delta.should.equal(300); // 500 - 200

            eurEntry.should.not.be.undefined();
            eurEntry.delta.should.equal(-100);
        });

        it('returns date as string in YYYY-MM-DD format', async function () {
            const today = moment().format('YYYY-MM-DD HH:mm:ss');

            await db('members_paid_subscription_events').insert([
                {currency: 'usd', mrr_delta: 500, created_at: today}
            ]);

            const result = await mrrStatsService.fetchAllDeltas();

            result.should.be.an.Array();
            result.length.should.equal(1);
            result[0].date.should.be.a.String();
            result[0].date.should.match(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD format
        });

        it('handles multiple currencies with different deltas', async function () {
            const today = moment().format('YYYY-MM-DD HH:mm:ss');
            const yesterday = moment().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss');

            await db('members_paid_subscription_events').insert([
                {currency: 'usd', mrr_delta: 500, created_at: today},
                {currency: 'eur', mrr_delta: 300, created_at: today},
                {currency: 'gbp', mrr_delta: 200, created_at: yesterday},
                {currency: 'usd', mrr_delta: 100, created_at: yesterday}
            ]);

            const result = await mrrStatsService.fetchAllDeltas();

            result.should.be.an.Array();
            result.length.should.equal(4);
            
            const currencies = result.map(r => r.currency);
            currencies.should.containEql('usd');
            currencies.should.containEql('eur');
            currencies.should.containEql('gbp');
            
            // Verify each currency has correct deltas
            result.forEach((entry) => {
                entry.should.have.properties(['currency', 'date', 'delta']);
                entry.currency.should.be.a.String();
                entry.date.should.be.a.String();
                entry.delta.should.be.a.Number();
            });
        });
    });
});
