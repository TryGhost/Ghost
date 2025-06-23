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
                table.string('attribution_id');
                table.string('attribution_type');
                table.increments('id').primary();
            });
            await db.schema.createTable('members_subscription_created_events', function (table) {
                table.string('referrer_source');
                table.string('referrer_medium');
                table.string('referrer_url');
                table.date('created_at');
                table.string('attribution_id');
                table.string('attribution_type');
                table.increments('id').primary();
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
                        created_at: day,
                        attribution_id: 'post-1',
                        attribution_type: 'post'
                    });
                }

                paidInsert.push({
                    referrer_source: sources[index],
                    referrer_medium: null,
                    referrer_url: null,
                    created_at: day,
                    attribution_id: 'post-1',
                    attribution_type: 'post'
                });
            }

            // Insert null referrer data for signups
            signupInsert.push(...[
                {
                    referrer_source: null,
                    referrer_medium: null,
                    referrer_url: null,
                    created_at: startDate.plus({days: sources.length}).toISODate(),
                    attribution_id: 'post-2',
                    attribution_type: 'post'
                },
                {
                    referrer_source: null,
                    referrer_medium: null,
                    referrer_url: null,
                    created_at: startDate.plus({days: sources.length}).toISODate(),
                    attribution_id: 'post-2',
                    attribution_type: 'post'
                }
            ]);

            // Insert null referrer data for paid conversions
            paidInsert.push(...[
                {
                    referrer_source: null,
                    referrer_medium: null,
                    referrer_url: null,
                    created_at: startDate.plus({days: sources.length}).toISODate(),
                    attribution_id: 'post-2',
                    attribution_type: 'post'
                },
                {
                    referrer_source: null,
                    referrer_medium: null,
                    referrer_url: null,
                    created_at: startDate.plus({days: sources.length}).toISODate(),
                    attribution_id: 'post-2',
                    attribution_type: 'post'
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

    describe('getForPost', function () {
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
                table.increments('id').primary();
                table.string('referrer_source');
                table.string('attribution_id');
                table.string('attribution_type');
            });
            await db.schema.createTable('members_subscription_created_events', function (table) {
                table.increments('id').primary();
                table.string('referrer_source');
                table.string('attribution_id');
                table.string('attribution_type');
            });
        });

        afterEach(async function () {
            await db.destroy();
        });

        it('returns attribution sources for a specific post', async function () {
            const postId = 'post-123';
            
            // Insert test data
            await db('members_created_events').insert([
                {referrer_source: 'Twitter', attribution_id: postId, attribution_type: 'post'},
                {referrer_source: 'Twitter', attribution_id: postId, attribution_type: 'post'},
                {referrer_source: 'Facebook', attribution_id: postId, attribution_type: 'post'},
                {referrer_source: null, attribution_id: postId, attribution_type: 'post'}
            ]);

            await db('members_subscription_created_events').insert([
                {referrer_source: 'Twitter', attribution_id: postId, attribution_type: 'post'},
                {referrer_source: 'Google', attribution_id: postId, attribution_type: 'post'},
                {referrer_source: null, attribution_id: postId, attribution_type: 'post'}
            ]);

            const stats = new ReferrersStatsService({knex: db});
            const results = await stats.getForPost(postId);

            // Should be sorted by paid_conversions desc
            assert.equal(results.length, 4);
            
            // Check Twitter (highest paid conversions)
            const twitter = results.find(r => r.source === 'Twitter');
            assert.equal(twitter.signups, 2);
            assert.equal(twitter.paid_conversions, 1);
            
            // Check Direct (null source)
            const direct = results.find(r => r.source === 'Direct');
            assert.equal(direct.signups, 1);
            assert.equal(direct.paid_conversions, 1);
            
            // Check Facebook (signups only)
            const facebook = results.find(r => r.source === 'Facebook');
            assert.equal(facebook.signups, 1);
            assert.equal(facebook.paid_conversions, 0);
            
            // Check Google (paid conversions only)
            const google = results.find(r => r.source === 'Google');
            assert.equal(google.signups, 0);
            assert.equal(google.paid_conversions, 1);
        });

        it('returns empty array for post with no attribution', async function () {
            const stats = new ReferrersStatsService({knex: db});
            const results = await stats.getForPost('non-existent-post');
            
            assert.equal(results.length, 0);
        });

        it('normalizes source names correctly', async function () {
            const postId = 'post-123';
            
            // Insert test data with sources that should be normalized
            await db('members_created_events').insert([
                {referrer_source: 'twitter', attribution_id: postId, attribution_type: 'post'},
                {referrer_source: 'www.facebook.com', attribution_id: postId, attribution_type: 'post'},
                {referrer_source: 'google.com', attribution_id: postId, attribution_type: 'post'}
            ]);

            const stats = new ReferrersStatsService({knex: db});
            const results = await stats.getForPost(postId);

            const sources = results.map(r => r.source);
            assert(sources.includes('Twitter'));
            assert(sources.includes('Facebook'));
            assert(sources.includes('Google'));
        });
    });

    describe('getTopSourcesWithRange', function () {
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
                table.increments('id').primary();
                table.string('referrer_source');
                table.date('created_at');
            });
            await db.schema.createTable('members_subscription_created_events', function (table) {
                table.increments('id').primary();
                table.string('referrer_source');
                table.string('subscription_id');
                table.string('member_id');
                table.date('created_at');
            });
            await db.schema.createTable('members_paid_subscription_events', function (table) {
                table.increments('id').primary();
                table.string('subscription_id');
                table.string('member_id');
                table.integer('mrr_delta');
                table.date('created_at');
            });
        });

        afterEach(async function () {
            await db.destroy();
        });

        it('returns top sources within date range ordered by signups', async function () {
            const startDate = '2023-01-01';
            const endDate = '2023-01-31';
            
            // Insert test data
            await db('members_created_events').insert([
                {referrer_source: 'Twitter', created_at: '2023-01-15'},
                {referrer_source: 'Twitter', created_at: '2023-01-16'},
                {referrer_source: 'Facebook', created_at: '2023-01-15'},
                {referrer_source: 'Google', created_at: '2022-12-15'} // Outside range
            ]);

            await db('members_subscription_created_events').insert([
                {referrer_source: 'Twitter', subscription_id: 'sub-1', member_id: 'member-1', created_at: '2023-01-15'}
            ]);

            await db('members_paid_subscription_events').insert([
                {subscription_id: 'sub-1', member_id: 'member-1', mrr_delta: 500, created_at: '2023-01-15'}
            ]);

            const stats = new ReferrersStatsService({knex: db});
            const results = await stats.getTopSourcesWithRange(startDate, endDate, 'signups desc', 10);

            assert.equal(results.data.length, 2); // Only Twitter and Facebook in range
            
            // Should be ordered by signups desc
            assert.equal(results.data[0].source, 'Twitter');
            assert.equal(results.data[0].signups, 2);
            assert.equal(results.data[0].paid_conversions, 1);
            assert.equal(results.data[0].mrr, 500);
             
            assert.equal(results.data[1].source, 'Facebook');
            assert.equal(results.data[1].signups, 1);
            assert.equal(results.data[1].paid_conversions, 0);
            assert.equal(results.data[1].mrr, 0);
        });

        it('respects limit parameter', async function () {
            const startDate = '2023-01-01';
            const endDate = '2023-01-31';
            
            // Insert more data than limit
            await db('members_created_events').insert([
                {referrer_source: 'Twitter', created_at: '2023-01-15'},
                {referrer_source: 'Facebook', created_at: '2023-01-15'},
                {referrer_source: 'Google', created_at: '2023-01-15'}
            ]);

            const stats = new ReferrersStatsService({knex: db});
            const results = await stats.getTopSourcesWithRange(startDate, endDate, 'signups desc', 2);

            assert.equal(results.data.length, 2);
        });

        it('handles different order by options', async function () {
            const startDate = '2023-01-01';
            const endDate = '2023-01-31';
            
            await db('members_created_events').insert([
                {referrer_source: 'Twitter', created_at: '2023-01-15'},
                {referrer_source: 'Facebook', created_at: '2023-01-15'},
                {referrer_source: 'Facebook', created_at: '2023-01-16'}
            ]);

            await db('members_subscription_created_events').insert([
                {referrer_source: 'Twitter', subscription_id: 'sub-1', member_id: 'member-1', created_at: '2023-01-15'},
                {referrer_source: 'Twitter', subscription_id: 'sub-2', member_id: 'member-2', created_at: '2023-01-16'}
            ]);

            const stats = new ReferrersStatsService({knex: db});
            
            // Test paid_conversions desc
            const paidResults = await stats.getTopSourcesWithRange(startDate, endDate, 'paid_conversions desc', 10);
            assert.equal(paidResults.data[0].source, 'Twitter');
            assert.equal(paidResults.data[0].paid_conversions, 2);
        });
    });
});
