const knex = require('knex').default;
const assert = require('assert/strict');
const PostsStatsService = require('../../../../../core/server/services/stats/PostsStatsService');

/**
 * @typedef {object} TestPost
 * @property {string} id
 * @property {string} title
 */

/**
 * @typedef {object} TestFreeSignup
 * @property {string} postId
 * @property {string} memberId
 * @property {Date} [createdAt]
 */

/**
 * @typedef {object} TestPaidSignup
 * @property {string} postId
 * @property {string} memberId
 * @property {string} subscriptionId
 * @property {number} mrr
 * @property {Date} [createdAt]
 */

/**
 * @typedef {object} TestData
 * @property {TestPost[]} [posts]
 * @property {TestFreeSignup[]} [freeSignups]
 * @property {TestPaidSignup[]} [paidSignups]
 */

describe('PostsStatsService', function () {
    /** @type {import('knex').Knex} */
    let db;
    let service;

    /**
     * Helper function to insert test data
     * @param {TestData} data
     */
    async function setupDbData(data) {
        const now = new Date();

        if (data.posts) {
            await db('posts').insert(data.posts);
        }

        if (data.freeSignups) {
            const freeEvents = data.freeSignups.map((signup, index) => ({
                id: `free_event_${index}`,
                member_id: signup.memberId,
                attribution_id: signup.postId,
                attribution_type: 'post',
                created_at: signup.createdAt || now
            }));
            if (freeEvents.length > 0) {
                await db('members_created_events').insert(freeEvents);
            }
        }

        if (data.paidSignups) {
            const subCreatedEvents = [];
            const paidSubEvents = [];

            data.paidSignups.forEach((signup, index) => {
                const createdAt = signup.createdAt || now;
                subCreatedEvents.push({
                    id: `sub_created_${index}`,
                    member_id: signup.memberId,
                    subscription_id: signup.subscriptionId,
                    attribution_id: signup.postId,
                    attribution_type: 'post',
                    created_at: createdAt
                });
                paidSubEvents.push({
                    id: `paid_event_${index}`,
                    member_id: signup.memberId,
                    subscription_id: signup.subscriptionId,
                    mrr_delta: signup.mrr,
                    created_at: createdAt // Assuming paid event happens at the same time
                });
            });

            if (subCreatedEvents.length > 0) {
                await db('members_subscription_created_events').insert(subCreatedEvents);
            }
            if (paidSubEvents.length > 0) {
                await db('members_paid_subscription_events').insert(paidSubEvents);
            }
        }
    }

    beforeEach(async function () {
        db = knex({
            client: 'sqlite3',
            useNullAsDefault: true,
            connection: {
                filename: ':memory:'
            }
        });

        await db.schema.createTable('posts', function (table) {
            table.string('id').primary();
            table.string('title');
        });

        await db.schema.createTable('members_created_events', function (table) {
            table.string('id').primary();
            table.string('member_id');
            table.string('attribution_id').index();
            table.string('attribution_type');
            table.dateTime('created_at');
        });

        await db.schema.createTable('members_subscription_created_events', function (table) {
            table.string('id').primary();
            table.string('member_id');
            table.string('subscription_id');
            table.string('attribution_id').index();
            table.string('attribution_type');
            table.dateTime('created_at');
        });

        await db.schema.createTable('members_paid_subscription_events', function (table) {
            table.string('id').primary();
            table.string('member_id');
            table.string('subscription_id');
            table.integer('mrr_delta');
            table.dateTime('created_at');
        });

        service = new PostsStatsService({knex: db});
    });

    afterEach(async function () {
        await db('members_created_events').truncate();
        await db('members_subscription_created_events').truncate();
        await db('members_paid_subscription_events').truncate();
        await db('posts').truncate();
    });

    after(async function () {
        await db.destroy();
    });

    it('exists', function () {
        assert.ok(service, 'Service instance should exist');
    });

    describe('getTopPosts', function () {
        it('returns empty array when no data exists', async function () {
            const result = await service.getTopPosts({});
            assert.deepEqual(result, {data: []}, 'Should return empty data array');
        });

        it('correctly ranks posts by free_members', async function () {
            // Test Scenario:
            // Post 1: 2 free signups (one paid elsewhere, one never paid), 1 immediate paid signup (same post)
            // Post 2: 1 free signup (never paid)
            // Post 3: 1 immediate paid signup (same post)
            // Expected free_members: Post 1 = 2, Post 2 = 1, Post 3 = 0
            // Expected order: Post 1, Post 2, Post 3 excluded
            await setupDbData({
                posts: [
                    {id: 'post1', title: 'Post 1'},
                    {id: 'post2', title: 'Post 2'},
                    {id: 'post3', title: 'Post 3'}
                ],
                freeSignups: [
                    {postId: 'post1', memberId: 'm1_free_paid_elsewhere'},
                    {postId: 'post1', memberId: 'm2_free_paid_same'},
                    {postId: 'post1', memberId: 'm5_free_only'},
                    {postId: 'post2', memberId: 'm3_free_only'},
                    {postId: 'post3', memberId: 'm4_paid_only'}
                ],
                paidSignups: [
                    // Paid conversion for m1, but attributed to Post 2 (not Post 1)
                    {postId: 'post2', memberId: 'm1_free_paid_elsewhere', subscriptionId: 'sub1', mrr: 500},
                    // Paid conversion for m2, attributed to Post 1 (same as signup)
                    {postId: 'post1', memberId: 'm2_free_paid_same', subscriptionId: 'sub2', mrr: 500},
                    // Paid conversion for m4, attributed to Post 3 (same as signup)
                    {postId: 'post3', memberId: 'm4_paid_only', subscriptionId: 'sub3', mrr: 1000}
                ]
            });

            const result = await service.getTopPosts({order: 'free_members desc'});

            assert.ok(result.data, 'Result should have a data property');
            // Only posts with free_members > 0 according to the new definition
            assert.equal(result.data.length, 2, 'Should return 2 posts with free_members > 0');

            // Check the order is correct now
            assert.equal(result.data[0].post_id, 'post1', 'Post 1 should be ranked first');
            assert.equal(result.data[1].post_id, 'post2', 'Post 2 should be ranked second');

            // Post 1 assertions
            const post1Result = result.data[0];
            assert.equal(post1Result.title, 'Post 1');
            assert.equal(post1Result.free_members, 2, 'Post 1 should have 2 free members');
            // Post 1 had one paid conversion attributed to it (m2)
            assert.equal(post1Result.paid_members, 1, 'Post 1 should have 1 paid member');
            // MRR is associated with the paid conversion attributed to post1
            assert.equal(post1Result.mrr, 500, 'Post 1 should have 500 mrr');

            // Post 2 assertions
            const post2Result = result.data[1];
            assert.equal(post2Result.title, 'Post 2');
            assert.equal(post2Result.free_members, 1, 'Post 2 should have 1 free member');
            // Post 2 had one paid conversion attributed to it (m1)
            assert.equal(post2Result.paid_members, 1, 'Post 2 should have 1 paid member');
            // Post 2 had a paid conversion attributed to it, but the *signup* was elsewhere
            assert.equal(post2Result.mrr, 500, 'Post 2 should have 500 mrr');
        });

        it('correctly ranks posts by paid_members', async function () {
            // Test Scenario: (Assuming paid_members = count of paid conversions attributed to the post)
            // Post 1: 1 paid conversion (m2), 1 free signup (m1) who paid elsewhere.
            // Post 2: 2 paid conversions (m1, m4), signups happened elsewhere.
            // Post 3: 1 free signup only (m3).
            // Expected paid_members: Post 1 = 1, Post 2 = 2, Post 3 = 0
            // Expected order: Post 2, Post 1, Post 3 excluded
            await setupDbData({
                posts: [
                    {id: 'post1', title: 'Post 1'},
                    {id: 'post2', title: 'Post 2'},
                    {id: 'post3', title: 'Post 3'}
                ],
                freeSignups: [
                    {postId: 'post1', memberId: 'm1_free_paid_elsewhere'}, // Signed up post1
                    {postId: 'post1', memberId: 'm2_free_paid_same'},     // Signed up post1
                    {postId: 'post3', memberId: 'm3_free_only'},          // Signed up post3
                    {postId: 'post_other', memberId: 'm4_paid_on_post2'} // Signed up elsewhere
                ],
                paidSignups: [
                    // Paid conversion for m1, attributed to Post 2 (signup was post1) -> Counts for Post 2 paid_members
                    {postId: 'post2', memberId: 'm1_free_paid_elsewhere', subscriptionId: 'sub1', mrr: 500},
                    // Paid conversion for m2, attributed to Post 1 (signup was post1) -> Counts for Post 1 paid_members
                    {postId: 'post1', memberId: 'm2_free_paid_same', subscriptionId: 'sub2', mrr: 600},
                    // Paid conversion for m4, attributed to Post 2 (signup was elsewhere) -> Counts for Post 2 paid_members
                    {postId: 'post2', memberId: 'm4_paid_on_post2', subscriptionId: 'sub3', mrr: 700}
                ]
            });

            const result = await service.getTopPosts({order: 'paid_members desc'});

            assert.ok(result.data, 'Result should have a data property');
            // Posts with paid_members > 0 according to the conversion attribution definition
            assert.equal(result.data.length, 2, 'Should return 2 posts with paid_members > 0');

            // Check order
            assert.equal(result.data[0].post_id, 'post2', 'Post 2 should be ranked first');
            assert.equal(result.data[1].post_id, 'post1', 'Post 1 should be ranked second');

            // Post 2 assertions
            const post2Result = result.data[0];
            assert.equal(post2Result.title, 'Post 2');
            assert.equal(post2Result.paid_members, 2, 'Post 2 should have 2 paid members (m1, m4 conversions)');
            // Post 2 had no free-only signups attributed to it
            assert.equal(post2Result.free_members, 0, 'Post 2 should have 0 free members');
            // MRR should be sum of all paid conversions attributed to Post 2
            assert.equal(post2Result.mrr, 1200, 'Post 2 should have 1200 mrr (500 + 700)');

            // Post 1 assertions
            const post1Result = result.data[1];
            assert.equal(post1Result.title, 'Post 1');
            assert.equal(post1Result.paid_members, 1, 'Post 1 should have 1 paid member (m2 conversion)');
            // Post 1 also had a free signup (m1) who converted elsewhere
            assert.equal(post1Result.free_members, 1, 'Post 1 should have 1 free member');
            // MRR should be sum of all paid conversions attributed to Post 1 (just m2)
            assert.equal(post1Result.mrr, 600, 'Post 1 should have 600 mrr');
        });

        it('correctly ranks posts by mrr', async function () {
            // Test Scenario:
            // Post 1: MRR = 600 (1 * 600), also 1 free signup paid elsewhere
            // Post 2: MRR = 1200 (500 + 700), signup for one was elsewhere
            // Post 3: MRR = 0
            // Expected MRR order: Post 2 (1200), Post 1 (600), Post 3 excluded
            await setupDbData({
                posts: [
                    {id: 'post1', title: 'Post 1'},
                    {id: 'post2', title: 'Post 2'},
                    {id: 'post3', title: 'Post 3'}
                ],
                freeSignups: [
                    {postId: 'post1', memberId: 'm1_free_paid_elsewhere'},
                    {postId: 'post1', memberId: 'm2_free_paid_same'},
                    {postId: 'post3', memberId: 'm3_free_only'},
                    {postId: 'post_other', memberId: 'm4_paid_on_post2'}
                ],
                paidSignups: [
                    // Paid conversion for m1, attributed to Post 2 (MRR=500)
                    {postId: 'post2', memberId: 'm1_free_paid_elsewhere', subscriptionId: 'sub1', mrr: 500},
                    // Paid conversion for m2, attributed to Post 1 (MRR=600)
                    {postId: 'post1', memberId: 'm2_free_paid_same', subscriptionId: 'sub2', mrr: 600},
                    // Paid conversion for m4, attributed to Post 2 (MRR=700)
                    {postId: 'post2', memberId: 'm4_paid_on_post2', subscriptionId: 'sub3', mrr: 700}
                ]
            });

            const result = await service.getTopPosts({order: 'mrr desc'});

            assert.ok(result.data, 'Result should have a data property');
            // Only posts with mrr > 0
            assert.equal(result.data.length, 2, 'Should return 2 posts with mrr > 0');

            // Check order and counts (MRR definition hasn't changed, but paid/free defs have)
            assert.equal(result.data[0].post_id, 'post2', 'Post 2 should be ranked first by MRR');
            assert.equal(result.data[0].title, 'Post 2');
            assert.equal(result.data[0].mrr, 1200, 'Post 2 should have 1200 mrr (500 + 700)');
            // Post 2 had two paid conversions attributed to it (m1, m4)
            assert.equal(result.data[0].paid_members, 2, 'Post 2 should have 2 paid members');
            // Post 2 had no free-only signups attributed to it (m1 signed up on post1)
            assert.equal(result.data[0].free_members, 0, 'Post 2 should have 0 free members (by new def)');

            assert.equal(result.data[1].post_id, 'post1', 'Post 1 should be ranked second by MRR');
            assert.equal(result.data[1].title, 'Post 1');
            assert.equal(result.data[1].mrr, 600, 'Post 1 should have 600 mrr');
            // Post 1 had one signup (m2) that converted immediately on Post 1
            assert.equal(result.data[1].paid_members, 1, 'Post 1 should have 1 paid member (by new def)');
            // Post 1 had one signup (m1) that converted elsewhere
            assert.equal(result.data[1].free_members, 1, 'Post 1 should have 1 free member (by new def)');
        });
    });
});
