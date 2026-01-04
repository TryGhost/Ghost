const knex = require('knex').default;
const assert = require('assert/strict');
const moment = require('moment-timezone');
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
            const signupsResult = await stats.getTopSourcesWithRange({date_from: '2024-01-01', date_to: '2024-01-31', timezone: 'UTC', orderBy: 'signups desc'});
            assert.equal(signupsResult.data[0].source, 'Twitter', 'Twitter should be first when sorted by signups');
            assert.equal(signupsResult.data[1].source, 'Facebook', 'Facebook should be second');
            assert.equal(signupsResult.data[2].source, 'Google', 'Google should be third');

            const sourceResult = await stats.getTopSourcesWithRange({date_from: '2024-01-01', date_to: '2024-01-31', timezone: 'UTC', orderBy: 'source desc'});
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

            const result = await stats.getTopSourcesWithRange({date_from: '2024-01-01', date_to: '2024-01-31', timezone: 'UTC', orderBy: 'signups desc', limit: 3});
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

    describe('getUtmGrowthStats', function () {
        /** @type {import('knex').Knex} */
        let db;
        let service;

        beforeEach(async function () {
            db = knex({
                client: 'sqlite3',
                useNullAsDefault: true,
                connection: {
                    filename: ':memory:'
                }
            });

            // Create tables with UTM fields
            await db.schema.createTable('members_created_events', function (table) {
                table.string('id');
                table.string('member_id');
                table.string('attribution_id');
                table.string('attribution_type');
                table.string('utm_source');
                table.string('utm_medium');
                table.string('utm_campaign');
                table.string('utm_term');
                table.string('utm_content');
                table.dateTime('created_at');
            });

            await db.schema.createTable('members_subscription_created_events', function (table) {
                table.string('id');
                table.string('member_id');
                table.string('subscription_id');
                table.string('attribution_id');
                table.string('attribution_type');
                table.string('utm_source');
                table.string('utm_medium');
                table.string('utm_campaign');
                table.string('utm_term');
                table.string('utm_content');
                table.dateTime('created_at');
            });

            await db.schema.createTable('members_paid_subscription_events', function (table) {
                table.string('member_id');
                table.string('subscription_id');
                table.integer('mrr_delta');
                table.dateTime('created_at');
            });

            service = new ReferrersStatsService({knex: db});
        });

        afterEach(async function () {
            await db.destroy();
        });

        async function insertUtmTestData() {
            const now = DateTime.now();

            // Insert free members with different UTM sources
            await db('members_created_events').insert([
                {id: '1', member_id: 'free_member_1', utm_source: 'google', utm_medium: 'organic', utm_campaign: 'spring-sale', created_at: now.toISO()},
                {id: '2', member_id: 'free_member_2', utm_source: 'google', utm_medium: 'organic', utm_campaign: 'spring-sale', created_at: now.toISO()},
                {id: '3', member_id: 'free_member_3', utm_source: 'facebook', utm_medium: 'social', utm_campaign: 'product-launch', created_at: now.toISO()},
                {id: '4', member_id: 'paid_member_1', utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'spring-sale', created_at: now.toISO()},
                {id: '5', member_id: 'paid_member_2', utm_source: 'twitter', utm_medium: 'social', utm_campaign: 'product-launch', created_at: now.toISO()}
            ]);

            // Insert paid conversions
            await db('members_subscription_created_events').insert([
                {id: '1', member_id: 'paid_member_1', subscription_id: 'sub_1', utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'spring-sale', created_at: now.toISO()},
                {id: '2', member_id: 'paid_member_2', subscription_id: 'sub_2', utm_source: 'twitter', utm_medium: 'social', utm_campaign: 'product-launch', created_at: now.toISO()}
            ]);

            // Insert MRR data
            await db('members_paid_subscription_events').insert([
                {member_id: 'paid_member_1', subscription_id: 'sub_1', mrr_delta: 1000, created_at: now.toISO()},
                {member_id: 'paid_member_2', subscription_id: 'sub_2', mrr_delta: 500, created_at: now.toISO()}
            ]);
        }

        it('returns utm_source data by default', async function () {
            await insertUtmTestData();
            const result = await service.getUtmGrowthStats({});

            assert(result.data, 'Should return data');
            assert(result.data.length > 0, 'Should have data');
            assert.equal(result.data[0].utm_type, 'utm_source', 'Should default to utm_source');
            assert(result.data[0].utm_value, 'Should have utm_value');
            assert.equal(typeof result.data[0].free_members, 'number', 'Should have free_members count');
            assert.equal(typeof result.data[0].paid_members, 'number', 'Should have paid_members count');
            assert.equal(typeof result.data[0].mrr, 'number', 'Should have mrr value');
        });

        it('returns utm_medium data when specified', async function () {
            await insertUtmTestData();
            const result = await service.getUtmGrowthStats({utm_type: 'utm_medium'});

            assert(result.data, 'Should return data');
            assert(result.data.length > 0, 'Should have data');
            assert.equal(result.data[0].utm_type, 'utm_medium', 'Should return utm_medium data');
        });

        it('returns utm_campaign data when specified', async function () {
            await insertUtmTestData();
            const result = await service.getUtmGrowthStats({utm_type: 'utm_campaign'});

            assert(result.data, 'Should return data');
            assert(result.data.length > 0, 'Should have data');
            assert.equal(result.data[0].utm_type, 'utm_campaign', 'Should return utm_campaign data');
        });

        it('throws error for invalid utm_type', async function () {
            await assert.rejects(
                async () => await service.getUtmGrowthStats({utm_type: 'invalid_field'}),
                /Invalid utm_type/,
                'Should reject invalid utm_type'
            );
        });

        it('applies limit parameter', async function () {
            await insertUtmTestData();
            const result = await service.getUtmGrowthStats({utm_type: 'utm_source', limit: 1});

            assert.equal(result.data.length, 1, 'Should limit results to 1');
        });

        it('sorts by free_members desc by default', async function () {
            await insertUtmTestData();
            const result = await service.getUtmGrowthStats({utm_type: 'utm_source'});

            // Check that results are sorted by free_members descending
            for (let i = 0; i < result.data.length - 1; i++) {
                assert(
                    result.data[i].free_members >= result.data[i + 1].free_members,
                    'Should be sorted by free_members descending'
                );
            }
        });

        it('sorts by paid_members desc when specified', async function () {
            await insertUtmTestData();
            const result = await service.getUtmGrowthStats({
                utm_type: 'utm_source',
                order: 'paid_members desc'
            });

            // Check that results are sorted by paid_members descending
            for (let i = 0; i < result.data.length - 1; i++) {
                assert(
                    result.data[i].paid_members >= result.data[i + 1].paid_members,
                    'Should be sorted by paid_members descending'
                );
            }
        });

        it('sorts by mrr desc when specified', async function () {
            await insertUtmTestData();
            const result = await service.getUtmGrowthStats({
                utm_type: 'utm_source',
                order: 'mrr desc'
            });

            // Check that results are sorted by mrr descending
            for (let i = 0; i < result.data.length - 1; i++) {
                assert(
                    result.data[i].mrr >= result.data[i + 1].mrr,
                    'Should be sorted by mrr descending'
                );
            }
        });

        it('filters data when post_id is provided', async function () {
            const now = DateTime.now();
            const postId = 'test-post-id';

            // Insert members with different attribution
            await db('members_created_events').insert([
                {id: '1', member_id: 'free_member_1', utm_source: 'google', attribution_id: postId, attribution_type: 'post', created_at: now.toISO()},
                {id: '2', member_id: 'free_member_2', utm_source: 'facebook', attribution_id: 'other-post', attribution_type: 'post', created_at: now.toISO()}
            ]);

            const result = await service.getUtmGrowthStats({
                utm_type: 'utm_source',
                post_id: postId
            });

            assert.equal(result.data.length, 1, 'Should only return data for specified post');
            assert.equal(result.data[0].utm_value, 'google', 'Should only include google source');
        });

        it('does not apply limit when post_id is provided', async function () {
            const now = DateTime.now();
            const postId = 'test-post-id';

            // Insert multiple members for a specific post
            await db('members_created_events').insert([
                {id: '1', member_id: 'free_member_1', utm_source: 'google', attribution_id: postId, attribution_type: 'post', created_at: now.toISO()},
                {id: '2', member_id: 'free_member_2', utm_source: 'facebook', attribution_id: postId, attribution_type: 'post', created_at: now.toISO()},
                {id: '3', member_id: 'free_member_3', utm_source: 'twitter', attribution_id: postId, attribution_type: 'post', created_at: now.toISO()}
            ]);

            const result = await service.getUtmGrowthStats({
                utm_type: 'utm_source',
                post_id: postId,
                limit: 1
            });

            // Should return all post-specific results, not limited to 1
            assert(result.data.length === 3, 'Should ignore limit for post-specific queries');
        });

        it('correctly aggregates free members, paid members, and MRR', async function () {
            await insertUtmTestData();

            // Provide explicit date range to ensure the deduplication works
            const now = DateTime.now();
            const result = await service.getUtmGrowthStats({
                utm_type: 'utm_source',
                date_from: now.minus({days: 1}).toISODate(),
                date_to: now.plus({days: 1}).toISODate()
            });

            const googleData = result.data.find(item => item.utm_value === 'google');
            assert(googleData, 'Should have google data');
            // Google has 3 created events: free_member_1, free_member_2, paid_member_1
            // paid_member_1 also has a subscription in the same window, so it's excluded from free
            // Result: free_members = 2, paid_members = 1
            assert.equal(googleData.free_members, 2, 'Should have 2 free members (excluding converted member)');
            assert.equal(googleData.paid_members, 1, 'Should have 1 paid member');
            assert.equal(googleData.mrr, 1000, 'Should have correct MRR');
        });

        it('filters by date_from and date_to correctly', async function () {
            const pastDate = DateTime.now().minus({days: 5});
            const futureDate = DateTime.now().plus({days: 5});

            // Insert data with different dates
            await db('members_created_events').insert([
                {id: '1', member_id: 'old_member', utm_source: 'google', created_at: pastDate.toISO()},
                {id: '2', member_id: 'new_member', utm_source: 'facebook', created_at: futureDate.toISO()}
            ]);

            // Query only for data from today onwards
            const result = await service.getUtmGrowthStats({
                utm_type: 'utm_source',
                date_from: DateTime.now().toISODate(),
                date_to: futureDate.plus({days: 1}).toISODate()
            });

            // Should only include facebook (future date), not google (past date)
            assert.equal(result.data.length, 1, 'Should only return future data');
            assert.equal(result.data[0].utm_value, 'facebook', 'Should only include facebook');
        });

        it('returns empty array when no data matches the query', async function () {
            // Don't insert any data
            const result = await service.getUtmGrowthStats({
                utm_type: 'utm_source'
            });

            assert(Array.isArray(result.data), 'Should return an array');
            assert.equal(result.data.length, 0, 'Should return empty array when no data exists');
        });

        it('returns utm_term data when specified', async function () {
            const now = DateTime.now();
            await db('members_created_events').insert([
                {id: '1', member_id: 'member_1', utm_source: 'google', utm_term: 'ghost-cms', created_at: now.toISO()},
                {id: '2', member_id: 'member_2', utm_source: 'google', utm_term: 'newsletter-platform', created_at: now.toISO()}
            ]);

            const result = await service.getUtmGrowthStats({utm_type: 'utm_term'});

            assert(result.data, 'Should return data');
            assert(result.data.length > 0, 'Should have data');
            assert.equal(result.data[0].utm_type, 'utm_term', 'Should return utm_term data');
            assert(result.data.find(item => item.utm_value === 'ghost-cms'), 'Should include ghost-cms term');
            assert(result.data.find(item => item.utm_value === 'newsletter-platform'), 'Should include newsletter-platform term');
        });

        it('returns utm_content data when specified', async function () {
            const now = DateTime.now();
            await db('members_created_events').insert([
                {id: '1', member_id: 'member_1', utm_source: 'google', utm_content: 'hero-cta', created_at: now.toISO()},
                {id: '2', member_id: 'member_2', utm_source: 'google', utm_content: 'sidebar-banner', created_at: now.toISO()}
            ]);

            const result = await service.getUtmGrowthStats({utm_type: 'utm_content'});

            assert(result.data, 'Should return data');
            assert(result.data.length > 0, 'Should have data');
            assert.equal(result.data[0].utm_type, 'utm_content', 'Should return utm_content data');
            assert(result.data.find(item => item.utm_value === 'hero-cta'), 'Should include hero-cta content');
            assert(result.data.find(item => item.utm_value === 'sidebar-banner'), 'Should include sidebar-banner content');
        });
    });
});
