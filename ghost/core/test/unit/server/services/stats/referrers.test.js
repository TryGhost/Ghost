const knex = require('knex').default;
const assert = require('node:assert/strict');
const moment = require('moment-timezone');
const ReferrersStatsService = require('../../../../../core/server/services/stats/referrers-stats-service');
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
                table.string('member_id');
                table.string('referrer_source');
                table.string('referrer_medium');
                table.string('referrer_url');
                table.date('created_at');
            });
            await db.schema.createTable('members_subscription_created_events', function (table) {
                table.string('id');
                table.string('member_id');
                table.string('subscription_id');
                table.string('referrer_source');
                table.string('referrer_medium');
                table.string('referrer_url');
                table.date('created_at');
            });
            await db.schema.createTable('members_paid_subscription_events', function (table) {
                table.string('member_id');
                table.string('subscription_id');
                table.integer('mrr_delta');
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
                        member_id: `member_${index}`,
                        referrer_source: sources[index],
                        referrer_medium: null,
                        referrer_url: null,
                        created_at: day
                    });
                }

                paidInsert.push({
                    id: `sub_event_${index}`,
                    member_id: `member_${index}`,
                    subscription_id: `sub_${index}`,
                    referrer_source: sources[index],
                    referrer_medium: null,
                    referrer_url: null,
                    created_at: day
                });
            }

            // Insert null referrer data for signups
            signupInsert.push(...[
                {
                    member_id: 'member_null_1',
                    referrer_source: null,
                    referrer_medium: null,
                    referrer_url: null,
                    created_at: startDate.plus({days: sources.length}).toISODate()
                },
                {
                    member_id: 'member_null_2',
                    referrer_source: null,
                    referrer_medium: null,
                    referrer_url: null,
                    created_at: startDate.plus({days: sources.length}).toISODate()
                }
            ]);

            // Insert null referrer data for paid conversions
            paidInsert.push(...[
                {
                    id: 'sub_event_null_1',
                    member_id: 'member_null_1',
                    subscription_id: 'sub_null_1',
                    referrer_source: null,
                    referrer_medium: null,
                    referrer_url: null,
                    created_at: startDate.plus({days: sources.length}).toISODate()
                },
                {
                    id: 'sub_event_null_2',
                    member_id: 'member_null_2',
                    subscription_id: 'sub_null_2',
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

    describe('getTopSourcesWithRange', function () {
        /** @type {import('knex').Knex} */
        let db;
        let stats;

        beforeEach(async function () {
            db = knex({
                client: 'sqlite3',
                useNullAsDefault: true,
                connection: {
                    filename: ':memory:'
                }
            });

            await db.schema.createTable('members_created_events', function (table) {
                table.string('member_id');
                table.string('referrer_source');
                table.date('created_at');
            });

            await db.schema.createTable('members_subscription_created_events', function (table) {
                table.string('id');
                table.string('member_id');
                table.string('subscription_id');
                table.string('referrer_source');
                table.date('created_at');
            });

            await db.schema.createTable('members_paid_subscription_events', function (table) {
                table.string('member_id');
                table.string('subscription_id');
                table.integer('mrr_delta');
                table.date('created_at');
            });

            stats = new ReferrersStatsService({knex: db});
        });

        afterEach(async function () {
            await db.destroy();
        });

        it('should properly deduplicate members who converted from free to paid', async function () {
            const testDate = moment('2024-01-15').utc().format('YYYY-MM-DD HH:mm:ss');
            const febDate = moment('2024-02-15').utc().format('YYYY-MM-DD HH:mm:ss');

            // Insert 3 member signups for Google
            await db('members_created_events').insert([
                {member_id: 'member_1', referrer_source: 'Google', created_at: testDate},
                {member_id: 'member_2', referrer_source: 'Google', created_at: testDate},
                {member_id: 'member_3', referrer_source: 'Google', created_at: testDate}
            ]);

            // 1 member converts to paid in the same time window
            await db('members_subscription_created_events').insert([
                {id: 'sub_1', member_id: 'member_1', subscription_id: 'sub_1', referrer_source: 'Google', created_at: testDate}
            ]);

            // 1 member converts to paid after the time window (in February)
            await db('members_subscription_created_events').insert([
                {id: 'sub_2', member_id: 'member_2', subscription_id: 'sub_2', referrer_source: 'Google', created_at: febDate}
            ]);

            // Query for January
            const result = await stats.getTopSourcesWithRange({date_from: '2024-01-01', date_to: '2024-01-31', timezone: 'UTC'});
            const googleStats = result.data.find(s => s.source === 'Google');

            // Expected: 2 signups (member_2 who converted later + member_3 who stayed free)
            // member_1 is excluded from signups because they converted in the same window
            // 1 paid conversion (member_1 who converted in January)
            assert.equal(googleStats.signups, 2, 'Google should have 2 signups (excluding only member who converted in same window)');
            assert.equal(googleStats.paid_conversions, 1, 'Google should have 1 paid conversion in January');

            // Query for February to see member_2's conversion
            const febResult = await stats.getTopSourcesWithRange({date_from: '2024-02-01', date_to: '2024-02-28', timezone: 'UTC'});
            const febGoogleStats = febResult.data.find(s => s.source === 'Google');
            assert(febGoogleStats, 'Google stats should exist in February results');
            assert.equal(febGoogleStats.paid_conversions, 1, 'Google should have 1 paid conversion in February');
        });

        it('should aggregate MRR data correctly', async function () {
            const testDate = moment('2024-01-15').utc().format('YYYY-MM-DD HH:mm:ss');

            // Insert paid conversions
            await db('members_subscription_created_events').insert([
                {id: 'sub_1', member_id: 'paid_1', subscription_id: 'sub_1', referrer_source: 'Google', created_at: testDate},
                {id: 'sub_2', member_id: 'paid_2', subscription_id: 'sub_2', referrer_source: 'Google', created_at: testDate},
                {id: 'sub_3', member_id: 'paid_3', subscription_id: 'sub_3', referrer_source: 'Twitter', created_at: testDate}
            ]);

            // Insert MRR events
            await db('members_paid_subscription_events').insert([
                {member_id: 'paid_1', subscription_id: 'sub_1', mrr_delta: 500, created_at: testDate},
                {member_id: 'paid_2', subscription_id: 'sub_2', mrr_delta: 1000, created_at: testDate},
                {member_id: 'paid_3', subscription_id: 'sub_3', mrr_delta: 750, created_at: testDate}
            ]);

            const result = await stats.getTopSourcesWithRange({date_from: '2024-01-01', date_to: '2024-01-31', timezone: 'UTC'});

            const googleStats = result.data.find(s => s.source === 'Google');
            const twitterStats = result.data.find(s => s.source === 'Twitter');

            assert.equal(googleStats.mrr, 1500, 'Google should have total MRR of 1500');
            assert.equal(twitterStats.mrr, 750, 'Twitter should have total MRR of 750');
        });

        it('should respect date range filters', async function () {
            // Insert events across different dates
            await db('members_created_events').insert([
                {member_id: 'jan_1', referrer_source: 'Google', created_at: moment('2024-01-15').utc().format('YYYY-MM-DD HH:mm:ss')},
                {member_id: 'jan_2', referrer_source: 'Google', created_at: moment('2024-01-20').utc().format('YYYY-MM-DD HH:mm:ss')},
                {member_id: 'feb_1', referrer_source: 'Google', created_at: moment('2024-02-15').utc().format('YYYY-MM-DD HH:mm:ss')},
                {member_id: 'feb_2', referrer_source: 'Google', created_at: moment('2024-02-20').utc().format('YYYY-MM-DD HH:mm:ss')}
            ]);

            const janResult = await stats.getTopSourcesWithRange({date_from: '2024-01-01', date_to: '2024-01-31', timezone: 'UTC'});
            const febResult = await stats.getTopSourcesWithRange({date_from: '2024-02-01', date_to: '2024-02-28', timezone: 'UTC'});

            const janGoogle = janResult.data.find(s => s.source === 'Google');
            const febGoogle = febResult.data.find(s => s.source === 'Google');

            assert.equal(janGoogle.signups, 2, 'January should have 2 signups');
            assert.equal(febGoogle.signups, 2, 'February should have 2 signups');
        });

        it('should handle Direct traffic normalization', async function () {
            const testDate = moment('2024-01-15').utc().format('YYYY-MM-DD HH:mm:ss');

            await db('members_created_events').insert([
                {member_id: 'direct_1', referrer_source: null, created_at: testDate},
                {member_id: 'direct_2', referrer_source: '', created_at: testDate},
                {member_id: 'direct_3', referrer_source: null, created_at: testDate}
            ]);

            const result = await stats.getTopSourcesWithRange({date_from: '2024-01-01', date_to: '2024-01-31', timezone: 'UTC'});
            const directStats = result.data.find(s => s.source === 'Direct');

            // The normalization happens in the service layer
            // Both null and empty string should be normalized to 'Direct'
            assert(directStats, 'Direct stats should exist');

            // We expect 3 signups total: 2 nulls + 1 empty string
            assert.equal(directStats.signups, 3, 'Should have 3 Direct signups');
        });

        it('should sort results correctly', async function () {
            const testDate = moment('2024-01-15').utc().format('YYYY-MM-DD HH:mm:ss');

            await db('members_created_events').insert([
                // Twitter: 3 signups
                {member_id: 't1', referrer_source: 'Twitter', created_at: testDate},
                {member_id: 't2', referrer_source: 'Twitter', created_at: testDate},
                {member_id: 't3', referrer_source: 'Twitter', created_at: testDate},
                // Google: 1 signup
                {member_id: 'g1', referrer_source: 'Google', created_at: testDate},
                // Facebook: 2 signups
                {member_id: 'f1', referrer_source: 'Facebook', created_at: testDate},
                {member_id: 'f2', referrer_source: 'Facebook', created_at: testDate}
            ]);

            // Test different sort orders
            const signupsResult = await stats.getTopSourcesWithRange({date_from: '2024-01-01', date_to: '2024-01-31', timezone: 'UTC', order: 'signups desc'});
            assert.equal(signupsResult.data[0].source, 'Twitter', 'Twitter should be first when sorted by signups');
            assert.equal(signupsResult.data[1].source, 'Facebook', 'Facebook should be second');
            assert.equal(signupsResult.data[2].source, 'Google', 'Google should be third');

            const sourceResult = await stats.getTopSourcesWithRange({date_from: '2024-01-01', date_to: '2024-01-31', timezone: 'UTC', order: 'source desc'});
            assert.equal(sourceResult.data[0].source, 'Twitter', 'Sources should be sorted alphabetically descending');
        });

        it('should respect limit parameter', async function () {
            const testDate = moment('2024-01-15').utc().format('YYYY-MM-DD HH:mm:ss');

            // Insert signups for multiple sources
            const sources = ['Google', 'Twitter', 'Facebook', 'Reddit', 'LinkedIn'];
            const inserts = [];
            sources.forEach((source, idx) => {
                inserts.push({
                    member_id: `member_${idx}`,
                    referrer_source: source,
                    created_at: testDate
                });
            });
            await db('members_created_events').insert(inserts);

            const result = await stats.getTopSourcesWithRange({date_from: '2024-01-01', date_to: '2024-01-31', timezone: 'UTC', order: 'signups desc', limit: 3});
            assert.equal(result.data.length, 3, 'Should return only 3 results when limit is 3');
        });

        it('should handle members with same source converting on different dates', async function () {
            // Member signs up free in January
            await db('members_created_events').insert([
                {member_id: 'member_1', referrer_source: 'Google', created_at: moment('2024-01-15').utc().format('YYYY-MM-DD HH:mm:ss')}
            ]);

            // Same member converts to paid in February
            await db('members_subscription_created_events').insert([
                {id: 'sub_1', member_id: 'member_1', subscription_id: 'sub_1', referrer_source: 'Google', created_at: moment('2024-02-15').utc().format('YYYY-MM-DD HH:mm:ss')}
            ]);

            // Query for January - should see the signup (no conversion in same window)
            const janResult = await stats.getTopSourcesWithRange({date_from: '2024-01-01', date_to: '2024-01-31', timezone: 'UTC'});
            const janGoogle = janResult.data.find(s => s.source === 'Google');
            assert(janGoogle, 'Google stats should exist in January results');
            assert.equal(janGoogle.signups, 1, 'January should count this member as signup (conversion happened later)');
            assert.equal(janGoogle.paid_conversions, 0, 'January should have no paid conversions');

            // Query for February - should see the paid conversion
            const febResult = await stats.getTopSourcesWithRange({date_from: '2024-02-01', date_to: '2024-02-28', timezone: 'UTC'});
            const febGoogle = febResult.data.find(s => s.source === 'Google');
            assert(febGoogle, 'Google stats should exist in February results');
            assert.equal(febGoogle.signups, 0, 'February should have no signups');
            assert.equal(febGoogle.paid_conversions, 1, 'February should have 1 paid conversion');
        });

        it('should handle members who sign up and convert with different sources', async function () {
            const testDate = moment('2024-01-15').utc().format('YYYY-MM-DD HH:mm:ss');

            // Member signs up via Google
            await db('members_created_events').insert([
                {member_id: 'member_1', referrer_source: 'Google', created_at: testDate}
            ]);

            // Same member converts to paid via Twitter (different attribution) in same window
            await db('members_subscription_created_events').insert([
                {id: 'sub_1', member_id: 'member_1', subscription_id: 'sub_1', referrer_source: 'Twitter', created_at: testDate}
            ]);

            const result = await stats.getTopSourcesWithRange({date_from: '2024-01-01', date_to: '2024-01-31', timezone: 'UTC'});

            const googleStats = result.data.find(s => s.source === 'Google');
            const twitterStats = result.data.find(s => s.source === 'Twitter');

            // Google might not exist in results since member converted via different source
            if (googleStats) {
                assert.equal(googleStats.signups, 0, 'Google should have 0 signups (member converted in same window)');
                assert.equal(googleStats.paid_conversions, 0, 'Google should have 0 paid conversions');
            }

            // Twitter should exist and show the paid conversion
            assert(twitterStats, 'Twitter stats should exist');
            assert.equal(twitterStats.signups, 0, 'Twitter should have 0 signups');
            assert.equal(twitterStats.paid_conversions, 1, 'Twitter should have 1 paid conversion');
        });
    });
});
