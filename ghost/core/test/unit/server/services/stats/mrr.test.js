const MrrStatsService = require('../../../../../core/server/services/stats/MrrStatsService');
const moment = require('moment');
const sinon = require('sinon');
const knex = require('knex').default;
const should = require('should');

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
        const ninetyDaysAgoDate = testToday.clone().subtract(90, 'days').format('YYYY-MM-DD');

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
            result.should.eql({
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
            totals.should.eql(expectedTotals);
        }

        /**
         * Get MRR history and return structured result
         * @param {Object} [options]
         * @param {string} [options.dateFrom] - Optional start date
         */
        async function getMrrHistory(options = {}) {
            const result = await mrrStatsService.getHistory(options);
            return {
                data: result.data,
                totals: result.meta.totals,
                meta: result.meta,
                count: result.data.length
            };
        }

        /**
         * Find entry for a specific date and currency
         * @param {Array} data - History data array
         * @param {string} date - Date to find
         * @param {string} currency - Currency to find
         */
        function findEntry(data, date, currency = 'usd') {
            return data.find(entry => entry.date === date && entry.currency === currency);
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

            // Should return 91 days (90 days back + today) with a single currency
            history.count.should.eql(91);

            // First entry should be 90 days ago with 0 MRR
            assertMrrEntry(history.data[0], ninetyDaysAgoDate, 0, 'usd');

            // Last entry should be today with 0 MRR
            assertMrrEntry(history.data[history.count - 1], todayDate, 0, 'usd');

            assertTotals(history.totals, [{mrr: 0}]);
        });

        it('Always returns at least one value per currency', async function () {
            await addCurrentSubscriptions([
                {mrr: 1, currency: 'usd'},
                {mrr: 2, currency: 'eur'}
            ]);

            const history = await getMrrHistory();

            // Should return 91 days * 2 currencies = 182 entries
            history.count.should.eql(182);

            // First day should have both currencies
            const firstDayEur = findEntry(history.data, ninetyDaysAgoDate, 'eur');
            const firstDayUsd = findEntry(history.data, ninetyDaysAgoDate, 'usd');

            // Currencies are always sorted ascending
            assertMrrEntry(firstDayEur, ninetyDaysAgoDate, 2, 'eur');
            assertMrrEntry(firstDayUsd, ninetyDaysAgoDate, 1, 'usd');

            // Last day should also have both currencies
            const lastDayEur = findEntry(history.data, todayDate, 'eur');
            const lastDayUsd = findEntry(history.data, todayDate, 'usd');

            assertMrrEntry(lastDayEur, todayDate, 2, 'eur');
            assertMrrEntry(lastDayUsd, todayDate, 1, 'usd');

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

            // Should return 91 days
            history.count.should.eql(91);

            // Yesterday should be 0 (before the event)
            const yesterdayEntry = findEntry(history.data, yesterdayDate);
            assertMrrEntry(yesterdayEntry, yesterdayDate, 0);

            // Today should be 5 (after the event)
            const todayEntry = findEntry(history.data, todayDate);
            assertMrrEntry(todayEntry, todayDate, 5);

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

            // Should return 91 days
            history.count.should.eql(91);

            // Day before yesterday should be 0
            const dayBeforeYesterdayEntry = findEntry(history.data, dayBeforeYesterdayDate);
            assertMrrEntry(dayBeforeYesterdayEntry, dayBeforeYesterdayDate, 0);

            // Yesterday should be 2
            const yesterdayEntry = findEntry(history.data, yesterdayDate);
            assertMrrEntry(yesterdayEntry, yesterdayDate, 2);

            // Today should be 7
            const todayEntry = findEntry(history.data, todayDate);
            assertMrrEntry(todayEntry, todayDate, 7);

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

            // Should return 91 days * 2 currencies = 182 entries
            history.count.should.eql(182);

            // Day before yesterday
            const dayBeforeYesterdayEur = findEntry(history.data, dayBeforeYesterdayDate, 'eur');
            const dayBeforeYesterdayUsd = findEntry(history.data, dayBeforeYesterdayDate, 'usd');
            assertMrrEntry(dayBeforeYesterdayEur, dayBeforeYesterdayDate, 200, 'eur');
            assertMrrEntry(dayBeforeYesterdayUsd, dayBeforeYesterdayDate, 0, 'usd');

            // Yesterday
            const yesterdayEur = findEntry(history.data, yesterdayDate, 'eur');
            const yesterdayUsd = findEntry(history.data, yesterdayDate, 'usd');
            assertMrrEntry(yesterdayEur, yesterdayDate, 400, 'eur');
            assertMrrEntry(yesterdayUsd, yesterdayDate, 2, 'usd');

            // Today
            const todayEur = findEntry(history.data, todayDate, 'eur');
            const todayUsd = findEntry(history.data, todayDate, 'usd');
            assertMrrEntry(todayEur, todayDate, 1200, 'eur');
            assertMrrEntry(todayUsd, todayDate, 7, 'usd');

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

            // Should return 91 days, invalid currency event should be ignored
            history.count.should.eql(91);

            // All days should have MRR of 7 (no valid events)
            const firstEntry = findEntry(history.data, ninetyDaysAgoDate);
            assertMrrEntry(firstEntry, ninetyDaysAgoDate, 7);

            const lastEntry = findEntry(history.data, todayDate);
            assertMrrEntry(lastEntry, todayDate, 7);

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

            // Should return 91 days
            history.count.should.eql(91);

            // Day before yesterday should be 0
            const dayBeforeYesterdayEntry = findEntry(history.data, dayBeforeYesterdayDate);
            assertMrrEntry(dayBeforeYesterdayEntry, dayBeforeYesterdayDate, 0);

            // Yesterday should be 2
            const yesterdayEntry = findEntry(history.data, yesterdayDate);
            assertMrrEntry(yesterdayEntry, yesterdayDate, 2);

            // Today should be 7 (future event ignored)
            const todayEntry = findEntry(history.data, todayDate);
            assertMrrEntry(todayEntry, todayDate, 7);

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

            // Should return 91 days
            history.count.should.eql(91);

            // Two days before yesterday: calculated backward from current MRR
            const twoDaysBeforeYesterdayEntry = findEntry(history.data, twoDaysBeforeYesterdayDate);
            assertMrrEntry(twoDaysBeforeYesterdayEntry, twoDaysBeforeYesterdayDate, 5);

            // Day before yesterday: should not be 1000
            const dayBeforeYesterdayEntry = findEntry(history.data, dayBeforeYesterdayDate);
            assertMrrEntry(dayBeforeYesterdayEntry, dayBeforeYesterdayDate, 7);

            // Yesterday: negative MRR should be shown as 0
            const yesterdayEntry = findEntry(history.data, yesterdayDate);
            assertMrrEntry(yesterdayEntry, yesterdayDate, 0);

            // Today: back to positive
            const todayEntry = findEntry(history.data, todayDate);
            assertMrrEntry(todayEntry, todayDate, 7);

            assertTotals(history.totals, [{mrr: 7}]);
        });

        it('Excludes events older than 90 days by default', async function () {
            // Event from 100 days ago (should be excluded from default 90-day window)
            const hundredDaysAgo = testToday.clone().subtract(100, 'days').format('YYYY-MM-DD HH:mm:ss');
            // Event from 60 days ago (within 90-day window)
            const sixtyDaysAgo = testToday.clone().subtract(60, 'days').format('YYYY-MM-DD HH:mm:ss');
            const sixtyDaysAgoDate = testToday.clone().subtract(60, 'days').format('YYYY-MM-DD');

            await addMrrEvents([
                {date: hundredDaysAgo, delta: 100},
                {date: sixtyDaysAgo, delta: 50},
                {date: today, delta: 20}
            ]);

            await addCurrentSubscriptions([{mrr: 170}]);

            const history = await getMrrHistory();

            // Should return 91 days
            history.count.should.eql(91);

            // First entry should be 90 days ago with baseline MRR
            // MRR at start = current (170) - recent events (50 + 20) = 100
            assertMrrEntry(history.data[0], ninetyDaysAgoDate, 100);

            // MRR should jump at the 60-day mark when the event occurred
            const sixtyDaysAgoEntry = findEntry(history.data, sixtyDaysAgoDate);
            assertMrrEntry(sixtyDaysAgoEntry, sixtyDaysAgoDate, 150);

            // Should end at today with full MRR
            const lastEntry = history.data[history.data.length - 1];
            assertMrrEntry(lastEntry, todayDate, 170);
        });

        it('Includes all events when dateFrom is specified early enough', async function () {
            const oneHundredTwentyDaysAgo = testToday.clone().subtract(120, 'days').format('YYYY-MM-DD HH:mm:ss');
            const oneHundredTwentyDaysAgoDate = testToday.clone().subtract(120, 'days').format('YYYY-MM-DD');

            await addMrrEvents([
                {date: oneHundredTwentyDaysAgo, delta: 100},
                {date: yesterday, delta: 50},
                {date: today, delta: 30}
            ]);

            await addCurrentSubscriptions([{mrr: 180}]);

            // Request history starting before the oldest event
            const startDate = testToday.clone().subtract(150, 'days').format('YYYY-MM-DD');
            const history = await mrrStatsService.getHistory({dateFrom: startDate});

            // With complete range backfilling, first entry should be the dateFrom date with baseline MRR
            // Baseline MRR = current (180) - all deltas (100 + 50 + 30) = 0
            assertMrrEntry(history.data[0], startDate, 0);

            // Should have data for every day from startDate to today (151 days)
            history.data.length.should.eql(151);

            // MRR should remain at 0 until the first event
            const dayBeforeFirstEvent = testToday.clone().subtract(121, 'days').format('YYYY-MM-DD');
            const dayBeforeFirstEventEntry = history.data.find(entry => entry.date === dayBeforeFirstEvent);
            assertMrrEntry(dayBeforeFirstEventEntry, dayBeforeFirstEvent, 0);

            // MRR should jump to 100 on the first event date
            const firstEventEntry = history.data.find(entry => entry.date === oneHundredTwentyDaysAgoDate);
            assertMrrEntry(firstEventEntry, oneHundredTwentyDaysAgoDate, 100);

            // Should show progression through all events
            const lastEntry = history.data[history.data.length - 1];
            assertMrrEntry(lastEntry, todayDate, 180);
            assertTotals(history.meta.totals, [{mrr: 180}]);
        });

        it('Filters events based on custom dateFrom parameter', async function () {
            const fourMonthsAgo = testToday.clone().subtract(120, 'days').format('YYYY-MM-DD HH:mm:ss');
            const twoMonthsAgo = testToday.clone().subtract(60, 'days').format('YYYY-MM-DD HH:mm:ss');
            const twoMonthsAgoDate = testToday.clone().subtract(60, 'days').format('YYYY-MM-DD');

            await addMrrEvents([
                {date: fourMonthsAgo, delta: 100}, // Should be excluded from fetch
                {date: twoMonthsAgo, delta: 50}, // Should be included
                {date: today, delta: 30} // Should be included
            ]);

            await addCurrentSubscriptions([{mrr: 180}]);

            // Only include events from 3 months ago onwards
            const threeMonthsAgo = testToday.clone().subtract(90, 'days').format('YYYY-MM-DD');
            const history = await mrrStatsService.getHistory({dateFrom: threeMonthsAgo});

            // With complete range backfilling, first entry should be the dateFrom date
            // Baseline MRR = current (180) - included deltas (50 + 30) = 100
            assertMrrEntry(history.data[0], threeMonthsAgo, 100);

            // Should have data for every day from threeMonthsAgo to today (91 days)
            history.data.length.should.eql(91);

            // MRR should remain at 100 until the first included event
            const dayBeforeFirstEvent = testToday.clone().subtract(61, 'days').format('YYYY-MM-DD');
            const dayBeforeFirstEventEntry = history.data.find(entry => entry.date === dayBeforeFirstEvent);
            assertMrrEntry(dayBeforeFirstEventEntry, dayBeforeFirstEvent, 100);

            // MRR should jump to 150 on the first included event date
            const firstEventEntry = history.data.find(entry => entry.date === twoMonthsAgoDate);
            assertMrrEntry(firstEventEntry, twoMonthsAgoDate, 150);

            const lastEntry = history.data[history.data.length - 1];
            assertMrrEntry(lastEntry, todayDate, 180);
        });

        it('Backfills entire date range when no events exist in range (fixes NY-328)', async function () {
            // This test reproduces the bug where MRR chart shows $0 when there are no
            // recent MRR events but there is existing MRR from earlier events.
            // Bug: If a site has stable MRR with no changes in the selected period,
            // the chart would show $0 because no events existed in the range.

            // Event from 60 days ago - outside the 30-day range we'll request
            const sixtyDaysAgo = testToday.clone().subtract(60, 'days').format('YYYY-MM-DD HH:mm:ss');

            await addMrrEvents([
                {date: sixtyDaysAgo, delta: 500} // Only event, outside the 30-day window
            ]);

            await addCurrentSubscriptions([{mrr: 500}]);

            // Request last 30 days - no events in this period
            const thirtyDaysAgo = testToday.clone().subtract(30, 'days').format('YYYY-MM-DD');
            const history = await mrrStatsService.getHistory({dateFrom: thirtyDaysAgo});

            // Should have data for every day from thirtyDaysAgo to today (31 days)
            history.data.length.should.eql(31);

            // First entry should be the dateFrom date with the existing MRR (not $0!)
            // Baseline MRR = current (500) - included deltas (none in range) = 500
            assertMrrEntry(history.data[0], thirtyDaysAgo, 500);

            // All entries should show MRR of 500 since there were no changes
            for (const entry of history.data) {
                entry.mrr.should.eql(500);
            }

            const lastEntry = history.data[history.data.length - 1];
            assertMrrEntry(lastEntry, todayDate, 500);
        });

        it('Backfills with correct MRR when multiple currencies exist and no events in range', async function () {
            // Multiple currencies, no events in the 30-day window
            const sixtyDaysAgo = testToday.clone().subtract(60, 'days').format('YYYY-MM-DD HH:mm:ss');

            await addMrrEvents([
                {date: sixtyDaysAgo, delta: 100, currency: 'usd'},
                {date: sixtyDaysAgo, delta: 5000, currency: 'eur'}
            ]);

            await addCurrentSubscriptions([
                {mrr: 100, currency: 'usd'},
                {mrr: 5000, currency: 'eur'}
            ]);

            const thirtyDaysAgo = testToday.clone().subtract(30, 'days').format('YYYY-MM-DD');
            const history = await mrrStatsService.getHistory({dateFrom: thirtyDaysAgo});

            // Should have 31 days * 2 currencies = 62 entries
            history.data.length.should.eql(62);

            // First two entries should be EUR and USD on dateFrom with correct values
            const firstDayEntries = history.data.filter(e => e.date === thirtyDaysAgo);
            firstDayEntries.length.should.eql(2);

            const eurEntry = firstDayEntries.find(e => e.currency === 'eur');
            const usdEntry = firstDayEntries.find(e => e.currency === 'usd');

            eurEntry.mrr.should.eql(5000);
            usdEntry.mrr.should.eql(100);

            // Last day should have the same values since no changes occurred
            const lastDayEntries = history.data.filter(e => e.date === todayDate);
            lastDayEntries.length.should.eql(2);

            const lastEurEntry = lastDayEntries.find(e => e.currency === 'eur');
            const lastUsdEntry = lastDayEntries.find(e => e.currency === 'usd');

            lastEurEntry.mrr.should.eql(5000);
            lastUsdEntry.mrr.should.eql(100);
        });
    });
});