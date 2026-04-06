const MembersStatsService = require('../../../../../core/server/services/stats/members-stats-service');
const knex = require('knex').default;
const assert = require('node:assert/strict');
const moment = require('moment');
const sinon = require('sinon');

describe('MembersStatsService', function () {
    describe('getCountHistory', function () {
        /** @type {MembersStatsService} */
        let membersStatsService;

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

        /** @type {Date} */
        let todayDate;
        /** @type {Date} */
        let tomorrowDate;
        /** @type {Date} */
        let yesterdayDate;
        /** @type {Date} */
        let dayBeforeYesterdayDate;

        after(function () {
            sinon.restore();
        });

        /** @type {import('knex').Knex} */
        let db;

        before(function () {
            todayDate = moment.utc(today).toDate();
            tomorrowDate = moment.utc(tomorrow).toDate();
            yesterdayDate = moment.utc(yesterday).toDate();
            dayBeforeYesterdayDate = moment.utc(dayBeforeYesterday).toDate();
            sinon.useFakeTimers(todayDate.getTime());
        });

        beforeEach(async function () {
            db = knex({client: 'sqlite3', connection: {filename: ':memory:'}, useNullAsDefault: true});
            membersStatsService = new MembersStatsService({knex: db});

            await db.schema.createTable('members_status_events', function (table) {
                table.string('from_status');
                table.string('to_status');
                table.date('created_at');
            });

            await db.schema.createTable('members', function (table) {
                table.string('id');
                table.string('status');
            });
        });

        afterEach(async function () {
            await db.destroy();
        });

        async function setupDB() {
            const paidMembers = Array.from({length: currentCounts.paid}).map(() => ({
                id: 'id',
                status: 'paid'
            }));
            const freeMembers = Array.from({length: currentCounts.free}).map(() => ({
                id: 'id',
                status: 'free'
            }));
            const compedMembers = Array.from({length: currentCounts.comped}).map(() => ({
                id: 'id',
                status: 'comped'
            }));

            await db('members').insert(paidMembers.concat(freeMembers, compedMembers));

            /**
             * @typedef {object} StatusEvent
             * @prop {string} created_at
             * @prop {string|null} from_status
             * @prop {string|null} to_status
             **/

            /**
             * @param {string} status
             * @param {number} number
             * @param {Date|string} date
             * @returns {StatusEvent[]}
             **/
            function generateEvents(status, number, date) {
                const dateObj = date instanceof Date ? date : new Date(date);
                return Array.from({length: Math.abs(number)}).map(() => ({
                    created_at: dateObj.toISOString(),
                    from_status: number > 0 ? null : status,
                    to_status: number < 0 ? null : status
                }));
            }

            const toInsert = events.reduce((/** @type {StatusEvent[]} */memo, event) => {
                const paidSubscribed = generateEvents('paid', event.paid_subscribed, event.date);
                const paidCanceled = generateEvents('paid', -event.paid_canceled, event.date);
                const freeSubscribed = generateEvents('free', event.free_delta, event.date);
                const compedSubscribed = generateEvents('comped', event.comped_delta, event.date);
                return memo.concat(paidSubscribed, paidCanceled, freeSubscribed, compedSubscribed);
            }, []);

            if (toInsert.length) {
                await db('members_status_events').insert(toInsert);
            }
        }

        it('Always returns at least one value', async function () {
            // No status events
            events = [];
            currentCounts.paid = 1;
            currentCounts.free = 2;
            currentCounts.comped = 3;

            await setupDB();

            const {data: results, meta} = await membersStatsService.getCountHistory();
            assert(results.length === 1, 'Should have one result');
            assert.deepEqual(results[0], {
                date: today,
                paid: 1,
                free: 2,
                comped: 3,
                paid_subscribed: 0,
                paid_canceled: 0
            });
            assert.deepEqual(meta.totals, currentCounts);
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

            await setupDB();

            const {data: results, meta} = await membersStatsService.getCountHistory();
            assert.deepEqual(results, [
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
            assert.deepEqual(meta.totals, currentCounts);
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

            await setupDB();

            const {data: results, meta} = await membersStatsService.getCountHistory();
            assert.deepEqual(results, [
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
            assert.deepEqual(meta.totals, currentCounts);
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

            await setupDB();

            const {data: results, meta} = await membersStatsService.getCountHistory();
            assert.deepEqual(results, [
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
            assert.deepEqual(meta.totals, currentCounts);
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

            await setupDB();

            const {data: results, meta} = await membersStatsService.getCountHistory();
            assert.deepEqual(results, [
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
            assert.deepEqual(meta.totals, currentCounts);
        });

        it('Accepts custom start date', async function () {
            // Update faked status events
            events = [
                {
                    date: dayBeforeYesterdayDate,
                    paid_subscribed: 2,
                    paid_canceled: 1,
                    free_delta: 2,
                    comped_delta: 1
                },
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
                }
            ];

            // Update current faked counts
            currentCounts.paid = 3;
            currentCounts.free = 5;
            currentCounts.comped = 4;

            await setupDB();

            // Test with yesterday as start date
            // Should include: baseline day (day before yesterday), yesterday, and today
            // Complete range behavior fills all days from baseline to today
            const {data: results, meta} = await membersStatsService.getCountHistory({
                startDate: yesterdayDate
            });

            assert.equal(results.length, 2);
            assert.deepEqual(results, [
                {
                    date: yesterday,
                    paid: 2,
                    free: 3,
                    comped: 1,
                    paid_subscribed: 1,
                    paid_canceled: 0
                },
                {
                    date: today,
                    paid: 3,
                    free: 5,
                    comped: 4,
                    paid_subscribed: 4,
                    paid_canceled: 3
                }
            ]);
            assert.deepEqual(meta.totals, currentCounts);
        });

        it('Returns complete range with forward-filled gaps', async function () {
            // Simple test: create events with a 1-day gap to verify forward-filling
            const threeDaysAgoDate = moment.utc().subtract(3, 'days').toDate();
            const oneDayAgoDate = moment.utc().subtract(1, 'days').toDate();

            events = [
                {
                    date: threeDaysAgoDate,
                    paid_subscribed: 1,
                    paid_canceled: 0,
                    free_delta: 1,
                    comped_delta: 0
                },
                {
                    date: oneDayAgoDate,
                    paid_subscribed: 1,
                    paid_canceled: 0,
                    free_delta: 1,
                    comped_delta: 0
                }
                // Note: No events on 2 days ago - should be forward-filled
            ];

            currentCounts.paid = 2;
            currentCounts.free = 2;
            currentCounts.comped = 0;

            await setupDB();

            // Test with 2 days ago as start date (this has no events)
            const startDate = moment.utc().subtract(2, 'days').format('YYYY-MM-DD');
            const {data: results} = await membersStatsService.getCountHistory({
                startDate: startDate
            });

            // Should get 3 days: baseline (3 days ago) + yesterday + today
            assert.equal(results.length, 3);

            // Verify all dates are present (no gaps)
            const dates = results.map(r => r.date).sort();
            const expectedDates = [
                moment.utc().subtract(2, 'days').format('YYYY-MM-DD'), // start date (gap day)
                moment.utc().subtract(1, 'days').format('YYYY-MM-DD'), // has event
                moment.utc().format('YYYY-MM-DD') // today
            ].sort();
            assert.deepEqual(dates, expectedDates);

            // Verify the gap day (2 days ago) has forward-filled data
            const gapDay = results.find(r => r.date === moment.utc().subtract(2, 'days').format('YYYY-MM-DD'));
            assert.ok(gapDay);
            assert.equal(gapDay.paid_subscribed, 0); // No events on this day
            assert.equal(gapDay.paid_canceled, 0); // No events on this day
            assert.ok(typeof gapDay.paid === 'number'); // But has member counts (forward-filled)
        });
    });
});
