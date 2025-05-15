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

    async function _createPost(id, title, status = 'published') {
        await db('posts').insert({id, title, status});
    }

    async function _createFreeSignupEvent(postId, memberId, referrerSource, createdAt = new Date()) {
        eventIdCounter += 1;
        const eventId = `free_event_${eventIdCounter}`;
        await db('members_created_events').insert({
            id: eventId,
            member_id: memberId,
            attribution_id: postId,
            attribution_type: 'post',
            referrer_source: referrerSource,
            referrer_url: referrerSource ? `https://${referrerSource}` : null,
            created_at: createdAt
        });
    }

    async function _createPaidConversionEvent(postId, memberId, subscriptionId, mrr, referrerSource, createdAt = new Date()) {
        eventIdCounter += 1;
        const subCreatedEventId = `sub_created_${eventIdCounter}`;
        const paidEventId = `paid_event_${eventIdCounter}`;

        await db('members_subscription_created_events').insert({
            id: subCreatedEventId,
            member_id: memberId,
            subscription_id: subscriptionId,
            attribution_id: postId,
            attribution_type: 'post',
            referrer_source: referrerSource,
            referrer_url: referrerSource ? `https://${referrerSource}` : null,
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

    async function _createFreeSignup(postId, referrerSource,memberId = null) {
        memberIdCounter += 1;
        const finalMemberId = memberId || `member_${memberIdCounter}`;
        await _createFreeSignupEvent(postId, finalMemberId);
    }

    async function _createPaidSignup(postId, mrr, referrerSource, memberId = null, subscriptionId = null) {
        memberIdCounter += 1;
        const finalMemberId = memberId || `member_${memberIdCounter}`;
        subscriptionIdCounter += 1;
        const finalSubscriptionId = subscriptionId || `sub_${subscriptionIdCounter}`;
        await _createFreeSignupEvent(postId, finalMemberId, referrerSource);
        await _createPaidConversionEvent(postId, finalMemberId, finalSubscriptionId, mrr, referrerSource);
    }

    async function _createPaidConversion(signupPostId, conversionPostId, mrr, referrerSource, memberId = null, subscriptionId = null) {
        memberIdCounter += 1;
        const finalMemberId = memberId || `member_${memberIdCounter}`;
        subscriptionIdCounter += 1;
        const finalSubscriptionId = subscriptionId || `sub_${subscriptionIdCounter}`;
        await _createFreeSignupEvent(signupPostId, finalMemberId, referrerSource);
        await _createPaidConversionEvent(conversionPostId, finalMemberId, finalSubscriptionId, mrr, referrerSource);
    }

    before(async function () {
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
            table.string('status');
        });

        await db.schema.createTable('members_created_events', function (table) {
            table.string('id').primary();
            table.string('member_id');
            table.string('attribution_id').index();
            table.string('attribution_type');
            table.dateTime('created_at');
            table.string('referrer_source');
            table.string('referrer_url');
        });

        await db.schema.createTable('members_subscription_created_events', function (table) {
            table.string('id').primary();
            table.string('member_id');
            table.string('subscription_id');
            table.string('attribution_id').index();
            table.string('attribution_type');
            table.dateTime('created_at');
            table.string('referrer_source');
            table.string('referrer_url');
        });

        await db.schema.createTable('members_paid_subscription_events', function (table) {
            table.string('id').primary();
            table.string('member_id');
            table.string('subscription_id');
            table.integer('mrr_delta');
            table.dateTime('created_at');
        });
    });

    beforeEach(async function () {
        eventIdCounter = 0;
        memberIdCounter = 0;
        subscriptionIdCounter = 0;

        service = new PostsStatsService({knex: db});

        await _createPost('post1', 'Post 1');
        await _createPost('post2', 'Post 2');
        await _createPost('post3', 'Post 3');
        await _createPost('post4', 'Post 4');
        await _createPost('post5', 'Post 5', 'draft');
    });

    afterEach(async function () {
        await db('posts').truncate();
        await db('members_created_events').truncate();
        await db('members_subscription_created_events').truncate();
        await db('members_paid_subscription_events').truncate();
    });

    after(async function () {
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
            await _createFreeSignup('post1', 'referrer_1');
            await _createFreeSignup('post2', 'referrer_2');
            await _createPaidSignup('post1', 500, 'referrer_1');
            await _createPaidSignup('post3', 1000, 'referrer_3');
            await _createPaidConversion('post1', 'post2', 500, 'referrer_1');

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
            await _createFreeSignup('post3', 'referrer_3');
            await _createPaidSignup('post1', 600, 'referrer_1');
            await _createPaidConversion('post1', 'post2', 500, 'referrer_1');
            await _createPaidConversion('post4', 'post2', 700, 'referrer_4');

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
            await _createFreeSignup('post3', 'referrer_3');
            await _createPaidSignup('post1', 600, 'referrer_1');
            await _createPaidConversion('post1', 'post2', 500, 'referrer_1');
            await _createPaidConversion('post4', 'post2', 700, 'referrer_4');

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
            await _createFreeSignupEvent('post1', 'member_past', 'referrer_past', tenDaysAgo);
            await _createFreeSignupEvent('post2', 'member_future', 'referrer_future', thirtyDaysAgo);

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

        it('respects the limit parameter', async function () {
            await _createFreeSignup('post1', 'referrer_1');
            await _createFreeSignup('post1', 'referrer_2');
            await _createFreeSignup('post2', 'referrer_3');
            await _createFreeSignup('post3', 'referrer_4');

            const result = await service.getTopPosts({
                order: 'free_members desc',
                limit: 2
            });

            assert.ok(result.data, 'Result should have a data property');
            assert.equal(result.data.length, 2, 'Should return only 2 posts');

            // Verify that only the top 2 posts by free_members are returned
            assert.equal(result.data[0].post_id, 'post1');
            assert.equal(result.data[1].post_id, 'post2');
        });
    });

    describe('getReferrersForPost', function () {
        it('returns empty array when no events exist', async function () {
            const result = await service.getReferrersForPost('post1');
            assert.ok(result.data, 'Result should have a data property');
            assert.equal(result.data.length, 0, 'Should return empty array when no events exist');
        });

        it('returns referrers for a post', async function () {
            await _createFreeSignupEvent('post1', 'member_1', 'referrer_1', new Date());
            await _createFreeSignupEvent('post1', 'member_2', 'referrer_2', new Date());
            await _createFreeSignupEvent('post1', 'member_3', 'referrer_3', new Date());

            const result = await service.getReferrersForPost('post1');
            assert.ok(result.data, 'Result should have a data property');
            assert.equal(result.data.length, 3, 'Should return 3 referrers');
        });

        it('correctly ranks referrers by free_members', async function () {
            await _createFreeSignupEvent('post1', 'member_1_1', 'referrer_1');
            await _createFreeSignupEvent('post1', 'member_1_2', 'referrer_1');
            await _createPaidSignup('post1', 500, 'referrer_1', 'member_1_3');
            await _createFreeSignupEvent('post1', 'member_2_1', 'referrer_2');
            await _createPaidSignup('post1', 1000, 'referrer_3', 'member_3_1');
            await _createPaidConversion('post1', 'post2', 500, 'referrer_4', 'member_4_1');

            const result = await service.getReferrersForPost('post1', {order: 'free_members desc'});

            assert.ok(result.data, 'Result should have a data property');
            assert.equal(result.data.length, 4, 'Should return all 4 referrers for post1');

            const expectedResults = [
                {source: 'referrer_1', free_members: 2, paid_members: 1, mrr: 500, referrer_url: 'https://referrer_1'},
                {source: 'referrer_2', free_members: 1, paid_members: 0, mrr: 0, referrer_url: 'https://referrer_2'},
                {source: 'referrer_4', free_members: 1, paid_members: 0, mrr: 0, referrer_url: 'https://referrer_4'},
                {source: 'referrer_3', free_members: 0, paid_members: 1, mrr: 1000, referrer_url: 'https://referrer_3'}
            ];

            const sortFn = (a, b) => {
                if (b.free_members !== a.free_members) {
                    return b.free_members - a.free_members;
                }
                return (a.source || '').localeCompare(b.source || '');
            };

            const sortedActual = result.data.sort(sortFn);
            const sortedExpected = expectedResults.sort(sortFn);

            assert.deepEqual(sortedActual, sortedExpected, 'Results should match expected order and counts for free_members desc');
        });

        it('correctly ranks referrers by paid_members', async function () {
            await _createPaidSignup('post1', 500, 'referrer_1', 'member_1_1');
            await _createPaidSignup('post1', 600, 'referrer_1', 'member_1_2');
            await _createPaidConversion('post2', 'post1', 700, 'referrer_2', 'member_2_1');
            await _createFreeSignupEvent('post1', 'member_3_1', 'referrer_3');
            await _createPaidConversion('post1', 'post2', 800, 'referrer_4', 'member_4_1');

            const result = await service.getReferrersForPost('post1', {order: 'paid_members desc'});

            assert.ok(result.data, 'Result should have a data property');
            assert.equal(result.data.length, 4, 'Should return all 4 referrers for post1');

            const expectedResults = [
                {source: 'referrer_1', free_members: 0, paid_members: 2, mrr: 1100, referrer_url: 'https://referrer_1'},
                {source: 'referrer_2', free_members: 0, paid_members: 1, mrr: 700, referrer_url: 'https://referrer_2'},
                {source: 'referrer_3', free_members: 1, paid_members: 0, mrr: 0, referrer_url: 'https://referrer_3'},
                {source: 'referrer_4', free_members: 1, paid_members: 0, mrr: 0, referrer_url: 'https://referrer_4'}
            ];

            const sortFn = (a, b) => {
                if (b.paid_members !== a.paid_members) {
                    return b.paid_members - a.paid_members;
                }
                return (a.source || '').localeCompare(b.source || '');
            };

            const sortedActual = result.data.sort(sortFn);
            const sortedExpected = expectedResults.sort(sortFn);

            assert.deepEqual(sortedActual, sortedExpected, 'Results should match expected order and counts for paid_members desc');
        });

        it('correctly ranks referrers by mrr', async function () {
            await _createPaidSignup('post1', 500, 'referrer_1', 'member_1_1');
            await _createPaidSignup('post1', 600, 'referrer_1', 'member_1_2');
            await _createPaidConversion('post2', 'post1', 1200, 'referrer_2', 'member_2_1');
            await _createFreeSignupEvent('post1', 'member_3_1', 'referrer_3');
            await _createPaidConversion('post1', 'post2', 800, 'referrer_4', 'member_4_1');

            const result = await service.getReferrersForPost('post1', {order: 'mrr desc'});

            assert.ok(result.data, 'Result should have a data property');
            assert.equal(result.data.length, 4, 'Should return all 4 referrers for post1');

            const expectedResults = [
                {source: 'referrer_2', free_members: 0, paid_members: 1, mrr: 1200, referrer_url: 'https://referrer_2'},
                {source: 'referrer_1', free_members: 0, paid_members: 2, mrr: 1100, referrer_url: 'https://referrer_1'},
                {source: 'referrer_3', free_members: 1, paid_members: 0, mrr: 0, referrer_url: 'https://referrer_3'},
                {source: 'referrer_4', free_members: 1, paid_members: 0, mrr: 0, referrer_url: 'https://referrer_4'}
            ];

            const sortFn = (a, b) => {
                if (b.mrr !== a.mrr) {
                    return b.mrr - a.mrr;
                }
                return (a.source || '').localeCompare(b.source || '');
            };

            const sortedActual = result.data.sort(sortFn);
            const sortedExpected = expectedResults.sort(sortFn);

            assert.deepEqual(sortedActual, sortedExpected, 'Results should match expected order and counts for mrr desc');
        });

        it('properly filters by date range', async function () {
            const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
            const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

            // Create events at different dates
            await _createFreeSignupEvent('post1', 'member_past', 'referrer_past', tenDaysAgo);
            await _createFreeSignupEvent('post1', 'member_future', 'referrer_future', thirtyDaysAgo);

            const lastFifteenDaysResult = await service.getReferrersForPost('post1', {
                date_from: fifteenDaysAgo,
                date_to: new Date()
            });

            // Make sure we have the result for referrer_past
            const pastsResult = lastFifteenDaysResult.data.find(r => r.source === 'referrer_past');
            assert.ok(pastsResult, 'Should have results for referrer_past');
            assert.equal(pastsResult.free_members, 1, 'Recent referrer should have 1 free member');

            // Test filtering to include both dates
            const lastThirtyDaysResult = await service.getReferrersForPost('post1', {
                date_from: sixtyDaysAgo,
                date_to: new Date()
            });

            // Make sure we have results for both referrers
            const pastResult = lastThirtyDaysResult.data.find(r => r.source === 'referrer_past');
            const futureResult = lastThirtyDaysResult.data.find(r => r.source === 'referrer_future');
            
            assert.ok(pastResult, 'Should have results for referrer_past');
            assert.equal(pastResult.free_members, 1, 'Recent referrer should have 1 free member');
            
            assert.ok(futureResult, 'Should have results for referrer_future');
            assert.equal(futureResult.free_members, 1, 'Older referrer should have 1 free member');
        });

        it('respects the limit parameter', async function () {
            await _createFreeSignupEvent('post1', 'member_1', 'referrer_1', new Date());
            await _createFreeSignupEvent('post1', 'member_2', 'referrer_2', new Date());
            await _createFreeSignupEvent('post1', 'member_3', 'referrer_3', new Date());

            const result = await service.getReferrersForPost('post1', {
                order: 'free_members desc',
                limit: 2
            });

            assert.ok(result.data, 'Result should have a data property');
            assert.equal(result.data.length, 2, 'Should return only 2 referrers');
            
            // All referrers have 1 free member, so we just check that we got 2 out of the 3 possible sources
            const validSources = ['referrer_1', 'referrer_2', 'referrer_3'];
            const returnedSources = result.data.map(item => item.source);
            
            // Both returned sources should be from our valid sources list
            assert.equal(returnedSources.every(source => validSources.includes(source)), true, 
                'All returned sources should be from our test data');
                
            // We should have exactly 2 different sources
            assert.equal(new Set(returnedSources).size, 2, 'Should return 2 different sources');
        });
    });

    describe('getGrowthStatsForPost', function () {
        it('returns growth stats for a post', async function () {
            await _createFreeSignup('post1', 'referrer_1');
            await _createPaidSignup('post1', 500, 'referrer_1');
            await _createPaidConversion('post1', 'post2', 500, 'referrer_1');

            const result = await service.getGrowthStatsForPost('post1');

            const expectedResults = [
                {post_id: 'post1', free_members: 2, paid_members: 1, mrr: 500}
            ];

            assert.deepEqual(result.data, expectedResults, 'Results should match expected order and counts for free_members desc');
        });
    });
});
