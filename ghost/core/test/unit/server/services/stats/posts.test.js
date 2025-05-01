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
    let eventIdCounter = 0;
    let memberIdCounter = 0;
    let subscriptionIdCounter = 0;

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
            attribution_id: postId,
            attribution_type: 'post',
            created_at: createdAt
        });

        await db('members_paid_subscription_events').insert({
            id: paidEventId,
            member_id: memberId,
            subscription_id: subscriptionId,
            mrr_delta: mrr,
            created_at: createdAt
        });
    }

    async function _createFreeSignup(postId, memberId = null) {
        memberIdCounter += 1;
        const finalMemberId = memberId || `member_${memberIdCounter}`;
        await _createFreeSignupEvent(postId, finalMemberId);
    }

    async function _createPaidSignup(postId, mrr, memberId = null, subscriptionId = null) {
        memberIdCounter += 1;
        const finalMemberId = memberId || `member_${memberIdCounter}`;
        subscriptionIdCounter += 1;
        const finalSubscriptionId = subscriptionId || `sub_${subscriptionIdCounter}`;
        await _createFreeSignupEvent(postId, finalMemberId);
        await _createPaidConversionEvent(postId, finalMemberId, finalSubscriptionId, mrr);
    }

    async function _createPaidConversion(signupPostId, conversionPostId, mrr, memberId = null, subscriptionId = null) {
        memberIdCounter += 1;
        const finalMemberId = memberId || `member_${memberIdCounter}`;
        subscriptionIdCounter += 1;
        const finalSubscriptionId = subscriptionId || `sub_${subscriptionIdCounter}`;
        await _createFreeSignupEvent(signupPostId, finalMemberId);
        await _createPaidConversionEvent(conversionPostId, finalMemberId, finalSubscriptionId, mrr);
    }

    beforeEach(async function () {
        db = knex({
            client: 'sqlite3',
            useNullAsDefault: true,
            connection: {
                filename: ':memory:'
            }
        });

        eventIdCounter = 0;
        memberIdCounter = 0;
        subscriptionIdCounter = 0;

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

        await _createPost('post1', 'Post 1');
        await _createPost('post2', 'Post 2');
        await _createPost('post3', 'Post 3');
        await _createPost('post4', 'Post 4');
    });

    afterEach(async function () {
        await db.destroy();
    });

    it('exists', function () {
        assert.ok(service, 'Service instance should exist');
    });

    describe('getTopPosts', function () {
        it('returns all posts with zero stats when no events exist', async function () {
            const result = await service.getTopPosts({});
            assert.ok(result.data, 'Result should have a data property');
            assert.equal(result.data.length, 4, 'Should return all 4 posts');

            const expectedResults = [
                {post_id: 'post1', title: 'Post 1', free_members: 0, paid_members: 0, mrr: 0},
                {post_id: 'post2', title: 'Post 2', free_members: 0, paid_members: 0, mrr: 0},
                {post_id: 'post3', title: 'Post 3', free_members: 0, paid_members: 0, mrr: 0},
                {post_id: 'post4', title: 'Post 4', free_members: 0, paid_members: 0, mrr: 0}
            ];

            const sortedResults = result.data.sort((a, b) => a.post_id.localeCompare(b.post_id));

            assert.deepEqual(sortedResults, expectedResults, 'Should return all posts with zero stats');
        });

        it('correctly ranks posts by free_members', async function () {
            await _createFreeSignup('post1');
            await _createFreeSignup('post2');
            await _createPaidSignup('post1', 500);
            await _createPaidSignup('post3', 1000);
            await _createPaidConversion('post1', 'post2', 500);

            const result = await service.getTopPosts({order: 'free_members desc'});

            assert.ok(result.data, 'Result should have a data property');
            assert.equal(result.data.length, 4, 'Should return all 4 posts');

            const expectedResults = [
                {post_id: 'post1', title: 'Post 1', free_members: 2, paid_members: 1, mrr: 500},
                {post_id: 'post2', title: 'Post 2', free_members: 1, paid_members: 1, mrr: 500},
                {post_id: 'post3', title: 'Post 3', free_members: 0, paid_members: 1, mrr: 1000},
                {post_id: 'post4', title: 'Post 4', free_members: 0, paid_members: 0, mrr: 0}
            ];

            const sortedResults = result.data.sort((a, b) => {
                if (a.free_members === 0 && b.free_members === 0) {
                    return a.post_id.localeCompare(b.post_id);
                }
                return 0;
            });

            assert.deepEqual(sortedResults, expectedResults, 'Results should match expected order and counts for free_members desc');
        });

        it('correctly ranks posts by paid_members', async function () {
            await _createFreeSignup('post3');
            await _createPaidSignup('post1', 600);
            await _createPaidConversion('post1', 'post2', 500);
            await _createPaidConversion('post4', 'post2', 700);

            const result = await service.getTopPosts({order: 'paid_members desc'});

            assert.ok(result.data, 'Result should have a data property');
            assert.equal(result.data.length, 4, 'Should return all 4 posts');

            const expectedResults = [
                {post_id: 'post2', title: 'Post 2', free_members: 0, paid_members: 2, mrr: 1200},
                {post_id: 'post1', title: 'Post 1', free_members: 1, paid_members: 1, mrr: 600},
                {post_id: 'post3', title: 'Post 3', free_members: 1, paid_members: 0, mrr: 0},
                {post_id: 'post4', title: 'Post 4', free_members: 1, paid_members: 0, mrr: 0}
            ];

            const sortedResults = result.data.sort((a, b) => {
                if (a.paid_members === 0 && b.paid_members === 0) {
                    return a.post_id.localeCompare(b.post_id);
                }
                return 0;
            });

            assert.deepEqual(sortedResults, expectedResults, 'Results should match expected order and counts for paid_members desc');
        });

        it('correctly ranks posts by mrr', async function () {
            await _createFreeSignup('post3');
            await _createPaidSignup('post1', 600);
            await _createPaidConversion('post1', 'post2', 500);
            await _createPaidConversion('post4', 'post2', 700);

            const result = await service.getTopPosts({order: 'mrr desc'});

            assert.ok(result.data, 'Result should have a data property');
            assert.equal(result.data.length, 4, 'Should return all 4 posts');

            const expectedResults = [
                {post_id: 'post2', title: 'Post 2', free_members: 0, paid_members: 2, mrr: 1200},
                {post_id: 'post1', title: 'Post 1', free_members: 1, paid_members: 1, mrr: 600},
                {post_id: 'post3', title: 'Post 3', free_members: 1, paid_members: 0, mrr: 0},
                {post_id: 'post4', title: 'Post 4', free_members: 1, paid_members: 0, mrr: 0}
            ];

            const sortedResults = result.data.sort((a, b) => {
                if (a.mrr === 0 && b.mrr === 0) {
                    return a.post_id.localeCompare(b.post_id);
                }
                return 0;
            });

            assert.deepEqual(sortedResults, expectedResults, 'Results should match expected order and counts for mrr desc');
        });

        it('properly filters by date range', async function () {
            const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
            const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

            // Create events at different dates
            await _createFreeSignupEvent('post1', 'member_past', tenDaysAgo);
            await _createFreeSignupEvent('post2', 'member_future', thirtyDaysAgo);

            const lastFifteenDaysResult = await service.getTopPosts({
                date_from: fifteenDaysAgo,
                date_to: new Date()
            });

            assert.equal(lastFifteenDaysResult.data.find(p => p.post_id === 'post1').free_members, 1);
            assert.equal(lastFifteenDaysResult.data.find(p => p.post_id === 'post2').free_members, 0);

            // Test filtering to include both dates
            const lastThirtyDaysResult = await service.getTopPosts({
                date_from: sixtyDaysAgo,
                date_to: new Date()
            });

            assert.equal(lastThirtyDaysResult.data.find(p => p.post_id === 'post1').free_members, 1);
            assert.equal(lastThirtyDaysResult.data.find(p => p.post_id === 'post2').free_members, 1);
        });
    });
});
