const knex = require('knex').default;
const assert = require('assert/strict');
const ReferrersStatsService = require('../../../../../core/server/services/stats/ReferrersStatsService');
const {DateTime} = require('luxon');

describe('ReferrersStatsService', function () {
    describe('getReferrerHistory', function () {
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

            await db.schema.createTable('members_created_events', function (table) {
                table.string('referrer_source');
                table.string('referrer_medium');
                table.string('referrer_url');
                table.date('created_at');
            });
            await db.schema.createTable('members_subscription_created_events', function (table) {
                table.string('referrer_source');
                table.string('referrer_medium');
                table.string('referrer_url');
                table.date('created_at');
            });
        });

        afterEach(async function () {
            await db.destroy();
        });

        async function insertEvents(sources) {
            const signupInsert = [];
            const paidInsert = [];

            const startDate = DateTime.now().minus({months: 1});

            for (let index = 0; index < sources.length; index++) {
                const day = startDate.plus({days: index}).toISODate();
                if (index > 0) {
                    signupInsert.push({
                        referrer_source: sources[index],
                        referrer_medium: null,
                        referrer_url: null,
                        created_at: day
                    });
                }

                paidInsert.push({
                    referrer_source: sources[index],
                    referrer_medium: null,
                    referrer_url: null,
                    created_at: day
                });
            }

            // Insert null referrer data for signups
            signupInsert.push(...[
                {
                    referrer_source: null,
                    referrer_medium: null,
                    referrer_url: null,
                    created_at: startDate.plus({days: sources.length}).toISODate()
                },
                {
                    referrer_source: null,
                    referrer_medium: null,
                    referrer_url: null,
                    created_at: startDate.plus({days: sources.length}).toISODate()
                }
            ]);

            // Insert null referrer data for paid conversions
            paidInsert.push(...[
                {
                    referrer_source: null,
                    referrer_medium: null,
                    referrer_url: null,
                    created_at: startDate.plus({days: sources.length}).toISODate()
                },
                {
                    referrer_source: null,
                    referrer_medium: null,
                    referrer_url: null,
                    created_at: startDate.plus({days: sources.length}).toISODate()
                }
            ]);
            await db('members_created_events').insert(signupInsert);
            await db('members_subscription_created_events').insert(paidInsert);
        }

        it('Responds with correct data', async function () {
            const sources = ['Twitter', 'Ghost Newsletter', 'Ghost Explore', 'Product Hunt', 'Reddit', 'Facebook', 'Google', 'Direct', 'Other'];
            await insertEvents(sources);

            const stats = new ReferrersStatsService({knex: db});

            const results = await stats.getReferrersHistory();

            const finder = (source, date) => (result) => {
                return result.date === date && result.source === source;
            };

            const startDate = DateTime.now().minus({months: 1});

            const expectedDates = [];
            for (let i = 0; i < 10; i++) {
                expectedDates.push(startDate.plus({days: i}).toISODate());
            }

            assert.deepEqual(results.data.map(result => result.date), expectedDates);

            const firstDayCounts = results.data.find(finder('Twitter', expectedDates[0]));
            const secondDayCounts = results.data.find(finder('Ghost Newsletter', expectedDates[1]));
            const thirdDayCounts = results.data.find(finder('Ghost Explore', expectedDates[2]));
            const nullReferrerCounts = results.data.find(finder(null, expectedDates[9]));

            assert(firstDayCounts.signups === 0);
            assert(firstDayCounts.paid_conversions === 1);

            assert(secondDayCounts.signups === 1);
            assert(secondDayCounts.paid_conversions === 1);

            assert(thirdDayCounts.signups === 1);
            assert(thirdDayCounts.paid_conversions === 1);

            assert(nullReferrerCounts.signups === 2);
            assert(nullReferrerCounts.paid_conversions === 2);
        });
    });
});
