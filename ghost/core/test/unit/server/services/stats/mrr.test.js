const assert = require('node:assert/strict');
const MrrStatsService = require('../../../../../core/server/services/stats/mrr-stats-service');
const moment = require('moment');
const sinon = require('sinon');
const knex = require('knex').default;

describe('MrrStatsService', function () {
    describe('getHistory', function () {
        /** @type {MrrStatsService} */
        let mrrStatsService;

        /** @type {import('knex').Knex} */
        let db;

        // Use a fixed "today" for consistent testing - set to a recent date in UTC
        const testToday = moment.utc('2024-03-15 12:00:00');

        // Test date constants - relative to our fixed "today" using moment for accuracy
        const today = testToday.format('YYYY-MM-DD HH:mm:ss');
        const tomorrow = testToday.clone().add(1, 'days').format('YYYY-MM-DD HH:mm:ss');
        const yesterday = testToday.clone().subtract(1, 'days').format('YYYY-MM-DD HH:mm:ss');
        const dayBeforeYesterday = testToday.clone().subtract(2, 'days').format('YYYY-MM-DD HH:mm:ss');

        // Date-only versions for assertions (service returns YYYY-MM-DD format)
        const todayDate = testToday.format('YYYY-MM-DD');
        const yesterdayDate = testToday.clone().subtract(1, 'days').format('YYYY-MM-DD');
        const dayBeforeYesterdayDate = testToday.clone().subtract(2, 'days').format('YYYY-MM-DD');
        const twoDaysBeforeYesterdayDate = testToday.clone().subtract(3, 'days').format('YYYY-MM-DD');

        // Helper functions for better test readability

        /**
         * Add MRR events to the database
         * @param {Array<{date: string, delta: number, currency?: string}>} events
         */
        async function addMrrEvents(events) {
            const records = events.map(event => ({
                created_at: event.date,
                mrr_delta: event.delta,
                currency: event.currency || 'usd'
            }));
            await db('members_paid_subscription_events').insert(records);
        }

        /**
         * Add current subscriptions to the database
         * @param {Array<{mrr: number, currency?: string}>} subscriptions
         */
        async function addCurrentSubscriptions(subscriptions) {
            const records = subscriptions.map(sub => ({
                plan_currency: sub.currency || 'usd',
                mrr: sub.mrr
            }));
            await db('members_stripe_customers_subscriptions').insert(records);
        }

        /**
         * Assert MRR history entry
         * @param {Object} result - The actual result
         * @param {string} date - Expected date
         * @param {number} mrr - Expected MRR value
         * @param {string} currency - Expected currency
         */
        function assertMrrEntry(result, date, mrr, currency = 'usd') {
            assert.deepEqual(result, {
                date: date,
                mrr: mrr,
                currency: currency
            });
        }

        /**
         * Assert total MRR
         * @param {Array} totals - The actual totals
         * @param {Array<{mrr: number, currency?: string}>} expected - Expected totals
         */
        function assertTotals(totals, expected) {
            const expectedTotals = expected.map(item => ({
                mrr: item.mrr,
                currency: item.currency || 'usd'
            }));
            assert.deepEqual(totals, expectedTotals);
        }

        /**
         * Get MRR history and return structured result
         */
        async function getMrrHistory() {
            const result = await mrrStatsService.getHistory();
            return {
                data: result.data,
                totals: result.meta.totals,
                meta: result.meta,
                count: result.data.length
            };
        }

        before(function () {
            // Set fake timers to our test "today"
            sinon.useFakeTimers(testToday.toDate().getTime());
        });

        after(function () {
            sinon.restore();
        });

        beforeEach(async function () {
            db = knex({client: 'sqlite3', connection: {filename: ':memory:'}, useNullAsDefault: true});
            mrrStatsService = new MrrStatsService({knex: db});

            await db.schema.createTable('members_paid_subscription_events', function (table) {
                table.string('currency');
                table.string('mrr_delta');
                table.datetime('created_at');
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
            const history = await getMrrHistory();

            assert.equal(history.count, 1);
            assertMrrEntry(history.data[0], todayDate, 0, 'usd');
            assertTotals(history.totals, [{mrr: 0}]);
        });

        it('Always returns at least one value', async function () {
            await addCurrentSubscriptions([
                {mrr: 1, currency: 'usd'},
                {mrr: 2, currency: 'eur'}
            ]);

            const history = await getMrrHistory();

            assert.equal(history.count, 2);

            // Currencies are always sorted ascending
            assertMrrEntry(history.data[0], todayDate, 2, 'eur');
            assertMrrEntry(history.data[1], todayDate, 1, 'usd');

            assertTotals(history.totals, [
                {mrr: 2, currency: 'eur'},
                {mrr: 1, currency: 'usd'}
            ]);
        });

        it('Does not substract delta of first event', async function () {
            await addCurrentSubscriptions([{mrr: 5}]);
            await addMrrEvents([
                {date: today, delta: 5}
            ]);

            const history = await getMrrHistory();

            assert.equal(history.count, 2);
            assertMrrEntry(history.data[0], yesterdayDate, 0);
            assertMrrEntry(history.data[1], todayDate, 5);
            assertTotals(history.totals, [{mrr: 5}]);
        });

        it('Correctly calculates deltas', async function () {
            await addMrrEvents([
                {date: yesterday, delta: 2},
                {date: today, delta: 5}
            ]);

            await addCurrentSubscriptions([
                {mrr: 2},
                {mrr: 5}
            ]);

            const history = await getMrrHistory();

            assert.equal(history.count, 3);
            assertMrrEntry(history.data[0], dayBeforeYesterdayDate, 0);
            assertMrrEntry(history.data[1], yesterdayDate, 2);
            assertMrrEntry(history.data[2], todayDate, 7);
            assertTotals(history.totals, [{mrr: 7}]);
        });

        it('Correctly calculates deltas for multiple currencies', async function () {
            await addMrrEvents([
                {date: yesterday, delta: 200, currency: 'eur'},
                {date: yesterday, delta: 2, currency: 'usd'},
                {date: today, delta: 800, currency: 'eur'},
                {date: today, delta: 5, currency: 'usd'}
            ]);

            await addCurrentSubscriptions([
                {mrr: 200, currency: 'eur'},
                {mrr: 2, currency: 'usd'},
                {mrr: 800, currency: 'eur'},
                {mrr: 5, currency: 'usd'},
                {mrr: 200, currency: 'eur'}
            ]);

            const history = await getMrrHistory();

            assert.equal(history.count, 6);

            // Day before yesterday
            assertMrrEntry(history.data[0], dayBeforeYesterdayDate, 200, 'eur');
            assertMrrEntry(history.data[1], dayBeforeYesterdayDate, 0, 'usd');

            // Yesterday
            assertMrrEntry(history.data[2], yesterdayDate, 400, 'eur');
            assertMrrEntry(history.data[3], yesterdayDate, 2, 'usd');

            // Today
            assertMrrEntry(history.data[4], todayDate, 1200, 'eur');
            assertMrrEntry(history.data[5], todayDate, 7, 'usd');

            assertTotals(history.totals, [
                {mrr: 1200, currency: 'eur'},
                {mrr: 7, currency: 'usd'}
            ]);
        });

        it('Ignores invalid currencies in deltas', async function () {
            await addMrrEvents([
                {date: today, delta: 200, currency: 'abc'} // Invalid currency
            ]);

            await addCurrentSubscriptions([
                {mrr: 7, currency: 'usd'}
            ]);

            const history = await getMrrHistory();

            // Invalid currency event should be ignored
            assert.equal(history.count, 1);
            assertMrrEntry(history.data[0], yesterdayDate, 7);
            assertTotals(history.totals, [{mrr: 7}]);
        });

        it('Ignores events in the future', async function () {
            await addMrrEvents([
                {date: yesterday, delta: 2},
                {date: today, delta: 5},
                {date: tomorrow, delta: 10} // Future event should be ignored
            ]);

            await addCurrentSubscriptions([{mrr: 7}]);

            const history = await getMrrHistory();

            assert.equal(history.count, 3);
            assertMrrEntry(history.data[0], dayBeforeYesterdayDate, 0);
            assertMrrEntry(history.data[1], yesterdayDate, 2);
            assertMrrEntry(history.data[2], todayDate, 7);
            assertTotals(history.totals, [{mrr: 7}]);
        });

        it('Correctly handles negative total MRR', async function () {
            await addMrrEvents([
                {date: dayBeforeYesterday, delta: 2},
                {date: yesterday, delta: -1000}, // Large negative delta
                {date: today, delta: 1000}
            ]);

            await addCurrentSubscriptions([{mrr: 7}]);

            const history = await getMrrHistory();

            assert.equal(history.count, 4);

            // Two days before yesterday: calculated backward from current MRR
            assertMrrEntry(history.data[0], twoDaysBeforeYesterdayDate, 5);

            // Day before yesterday: should not be 1000
            assertMrrEntry(history.data[1], dayBeforeYesterdayDate, 7);

            // Yesterday: negative MRR should be shown as 0
            assertMrrEntry(history.data[2], yesterdayDate, 0);

            // Today: back to positive
            assertMrrEntry(history.data[3], todayDate, 7);

            assertTotals(history.totals, [{mrr: 7}]);
        });

        it('Excludes events older than 90 days by default', async function () {
            // Event from 100 days ago (should be excluded from default 90-day window)
            const hundredDaysAgo = testToday.clone().subtract(100, 'days').format('YYYY-MM-DD HH:mm:ss');
            // Event from 60 days ago (within 90-day window)
            const sixtyDaysAgo = testToday.clone().subtract(60, 'days').format('YYYY-MM-DD HH:mm:ss');

            await addMrrEvents([
                {date: hundredDaysAgo, delta: 100},
                {date: sixtyDaysAgo, delta: 50},
                {date: today, delta: 20}
            ]);

            await addCurrentSubscriptions([{mrr: 170}]);

            const history = await getMrrHistory();

            // Should start from day before recentDate (oldest event within 90 days)
            // MRR at start = current (170) - recent events (50 + 20) = 100
            const expectedStartDate = testToday.clone().subtract(61, 'days').format('YYYY-MM-DD');
            assertMrrEntry(history.data[0], expectedStartDate, 100);

            // Should end at today with full MRR
            const lastEntry = history.data[history.data.length - 1];
            assertMrrEntry(lastEntry, todayDate, 170);
        });

        it('Includes all events when dateFrom is specified early enough', async function () {
            const oneHundredTwentyDaysAgo = testToday.clone().subtract(120, 'days').format('YYYY-MM-DD HH:mm:ss');

            await addMrrEvents([
                {date: oneHundredTwentyDaysAgo, delta: 100},
                {date: yesterday, delta: 50},
                {date: today, delta: 30}
            ]);

            await addCurrentSubscriptions([{mrr: 180}]);

            // Request history starting before the oldest event
            const startDate = testToday.clone().subtract(150, 'days').format('YYYY-MM-DD');
            const history = await mrrStatsService.getHistory({dateFrom: startDate});

            // Should start from day before first event with 0 MRR
            const expectedFirstDate = testToday.clone().subtract(121, 'days').format('YYYY-MM-DD');
            assertMrrEntry(history.data[0], expectedFirstDate, 0);

            // Should show progression through all events
            const lastEntry = history.data[history.data.length - 1];
            assertMrrEntry(lastEntry, todayDate, 180);
            assertTotals(history.meta.totals, [{mrr: 180}]);
        });

        it('Filters events based on custom dateFrom parameter', async function () {
            const fourMonthsAgo = testToday.clone().subtract(120, 'days').format('YYYY-MM-DD HH:mm:ss');
            const twoMonthsAgo = testToday.clone().subtract(60, 'days').format('YYYY-MM-DD HH:mm:ss');

            await addMrrEvents([
                {date: fourMonthsAgo, delta: 100}, // Should be excluded
                {date: twoMonthsAgo, delta: 50}, // Should be included
                {date: today, delta: 30} // Should be included
            ]);

            await addCurrentSubscriptions([{mrr: 180}]);

            // Only include events from 3 months ago onwards
            const threeMonthsAgo = testToday.clone().subtract(90, 'days').format('YYYY-MM-DD');
            const history = await mrrStatsService.getHistory({dateFrom: threeMonthsAgo});

            // MRR at start = current (180) - included events (50 + 30) = 100
            const expectedStartDate = testToday.clone().subtract(61, 'days').format('YYYY-MM-DD');
            assertMrrEntry(history.data[0], expectedStartDate, 100);

            const lastEntry = history.data[history.data.length - 1];
            assertMrrEntry(lastEntry, todayDate, 180);
        });
    });
});
