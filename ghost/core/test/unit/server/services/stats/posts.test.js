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
    let eventIdCounter = 0; // Simple counter for unique event IDs
    let memberIdCounter = 0; // Counter for auto-generated member IDs

    // Helper Functions for Setup
    async function _createPost(id, title) {
        await db('posts').insert({id, title});
    }

    async function _createFreeSignupEvent(postId, memberId, createdAt = new Date()) {
        eventIdCounter += 1;
        const eventId = `free_event_${eventIdCounter}`;
        await db('members_created_events').insert({
            id: eventId,
            member_id: memberId,
            attribution_id: postId,
            attribution_type: 'post',
            created_at: createdAt
        });
    }

    async function _createPaidConversionEvent(postId, memberId, subscriptionId, mrr, createdAt = new Date()) {
        eventIdCounter += 1;
        const subCreatedEventId = `sub_created_${eventIdCounter}`;
        const paidEventId = `paid_event_${eventIdCounter}`;

        await db('members_subscription_created_events').insert({
            id: subCreatedEventId,
            member_id: memberId,
            subscription_id: subscriptionId,
            attribution_id: postId, // Conversion attributed to this post
            attribution_type: 'post',
            created_at: createdAt
        });

        await db('members_paid_subscription_events').insert({
            id: paidEventId,
            member_id: memberId,
            subscription_id: subscriptionId,
            mrr_delta: mrr,
            created_at: createdAt // Assuming paid event happens at the same time
        });
    }

    // Higher-level scenario creators (used in tests)
    /** Creates only a free signup event attributed to the post */
    async function _createFreeSignup(postId, memberId = null) {
        memberIdCounter += 1;
        const finalMemberId = memberId || `member_${memberIdCounter}`;
        await _createFreeSignupEvent(postId, finalMemberId);
    }

    /** Creates a free signup AND a paid conversion event, both attributed to the SAME post */
    async function _createPaidSignup(postId, subscriptionId, mrr, memberId = null) {
        memberIdCounter += 1;
        const finalMemberId = memberId || `member_${memberIdCounter}`;
        await _createFreeSignupEvent(postId, finalMemberId);
        await _createPaidConversionEvent(postId, finalMemberId, subscriptionId, mrr);
    }

    /** Creates a free signup attributed to signupPostId, and a paid conversion attributed to conversionPostId */
    async function _createPaidConversion(signupPostId, conversionPostId, subscriptionId, mrr, memberId = null) {
        memberIdCounter += 1;
        const finalMemberId = memberId || `member_${memberIdCounter}`;
        await _createFreeSignupEvent(signupPostId, finalMemberId);
        await _createPaidConversionEvent(conversionPostId, finalMemberId, subscriptionId, mrr);
    }

    beforeEach(async function () {
        db = knex({
            client: 'sqlite3',
            useNullAsDefault: true,
            connection: {
                filename: ':memory:'
            }
        });

        // Reset counters for each test
        eventIdCounter = 0;
        memberIdCounter = 0;

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
            // Test Scenario: Using higher-level helpers
            // Post 1: 1 free signup, 1 paid signup, 1 signup who paid elsewhere
            // Post 2: 1 free signup
            // Post 3: 1 paid signup
            // Expected free_members: Post 1 = 2, Post 2 = 1 -> Order: Post 1, Post 2

            // Setup posts
            await _createPost('post1', 'Post 1');
            await _createPost('post2', 'Post 2');
            await _createPost('post3', 'Post 3');

            // Create member scenarios (Member IDs are auto-generated)
            await _createFreeSignup('post1');
            await _createFreeSignup('post2');
            await _createPaidSignup('post1', 'sub_paid_post1', 500);
            await _createPaidSignup('post3', 'sub_paid_post3', 1000);
            await _createPaidConversion('post1', 'post2', 'sub_paid_post2', 500);

            const result = await service.getTopPosts({order: 'free_members desc'});

            assert.ok(result.data, 'Result should have a data property');
            // Only posts with free_members > 0
            assert.equal(result.data.length, 2, 'Should return 2 posts with free_members > 0');

            const expectedResults = [
                {post_id: 'post1', title: 'Post 1', free_members: 2, paid_members: 1, mrr: 500},
                {post_id: 'post2', title: 'Post 2', free_members: 1, paid_members: 1, mrr: 500}
            ];

            assert.deepEqual(result.data, expectedResults, 'Results should match expected order and counts for free_members desc');
        });

        it('correctly ranks posts by paid_members', async function () {
            // Test Scenario: Using higher-level helpers
            // Post 1: 1 paid signup, 1 signup who paid elsewhere
            // Post 2: 1 conversion from signup elsewhere, 1 conversion from signup on Post 1
            // Post 3: 1 free signup
            // Expected paid_members: Post 1 = 1, Post 2 = 2 -> Order: Post 2, Post 1

            // Setup posts
            await _createPost('post1', 'Post 1');
            await _createPost('post2', 'Post 2');
            await _createPost('post3', 'Post 3');
            await _createPost('post_other', 'Other Post');

            // Create member scenarios (Member IDs are auto-generated)
            await _createFreeSignup('post3');
            await _createPaidSignup('post1', 'sub_paid_post1', 600);
            await _createPaidConversion('post1', 'post2', 'sub_paid_elsewhere', 500);
            await _createPaidConversion('post_other', 'post2', 'sub_paid_on_post2', 700);

            const result = await service.getTopPosts({order: 'paid_members desc'});

            assert.ok(result.data, 'Result should have a data property');
            // Posts with paid_members > 0
            assert.equal(result.data.length, 2, 'Should return 2 posts with paid_members > 0');

            const expectedResults = [
                {post_id: 'post2', title: 'Post 2', free_members: 0, paid_members: 2, mrr: 1200},
                {post_id: 'post1', title: 'Post 1', free_members: 1, paid_members: 1, mrr: 600}
            ];

            assert.deepEqual(result.data, expectedResults, 'Results should match expected order and counts for paid_members desc');
        });

        it('correctly ranks posts by mrr', async function () {
            // Test Scenario: Using higher-level helpers
            // Post 1: 1 paid signup (MRR=600)
            // Post 2: 2 paid conversions (MRR=500 + MRR=700 -> Total=1200)
            // Post 3: 1 free signup
            // Expected MRR: Post 1 = 600, Post 2 = 1200 -> Order: Post 2, Post 1

            // Setup posts
            await _createPost('post1', 'Post 1');
            await _createPost('post2', 'Post 2');
            await _createPost('post3', 'Post 3');
            await _createPost('post_other', 'Other Post');

            // Create member scenarios (Member IDs are auto-generated)
            await _createFreeSignup('post3');
            await _createPaidSignup('post1', 'sub_paid_post1', 600);
            await _createPaidConversion('post1', 'post2', 'sub_paid_elsewhere', 500);
            await _createPaidConversion('post_other', 'post2', 'sub_paid_on_post2', 700);

            const result = await service.getTopPosts({order: 'mrr desc'});

            assert.ok(result.data, 'Result should have a data property');
            // Only posts with mrr > 0
            assert.equal(result.data.length, 2, 'Should return 2 posts with mrr > 0');

            const expectedResults = [
                {post_id: 'post2', title: 'Post 2', free_members: 0, paid_members: 2, mrr: 1200},
                {post_id: 'post1', title: 'Post 1', free_members: 1, paid_members: 1, mrr: 600}
            ];

            assert.deepEqual(result.data, expectedResults, 'Results should match expected order and counts for mrr desc');
        });
    });
});
