const {agentProvider, fixtureManager, matchers, mockManager} = require('../../utils/e2e-framework');
const {mockStripe, stripeMocker} = require('../../utils/e2e-framework-mock-manager');
const {anyContentVersion, anyEtag, anyISODate, anyObjectId, anyContentLength} = matchers;
const assert = require('node:assert/strict');
const ObjectId = require('bson-objectid').default;
const db = require('../../../core/server/data/db');

let agent;

const matchSubscriptionStats = {
    stats: [{
        date: anyISODate,
        tier: anyObjectId
    }, {
        date: anyISODate,
        tier: anyObjectId
    }],
    meta: {
        tiers: [anyObjectId],
        totals: [{
            tier: anyObjectId
        }]
    }
};

describe('Stats API', function () {
    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('posts', 'members');
        await agent.loginAsOwner();
    });

    beforeEach(async function () {
        mockStripe();
        mockManager.mockMail();
    });

    afterEach(async function () {
        await mockManager.restore();
    });

    it('Can fetch member count history', async function () {
        await agent
            .get(`/stats/member_count`)
            .expectStatus(200)
            .matchBodySnapshot({
                stats: [{
                    date: anyISODate
                }]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Can fetch MRR history', async function () {
        await agent
            .get(`/stats/mrr`)
            .expectStatus(200)
            .matchBodySnapshot({
                stats: [{
                    date: anyISODate
                }, {
                    date: anyISODate
                }]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    describe('Subscriptions history', function () {
        it('Can fetch subscriptions history', async function () {
            await agent
                .get(`/stats/subscriptions`)
                .expectStatus(200)
                .matchBodySnapshot(matchSubscriptionStats)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('Can fetch history for free trials', async function () {
            // Get stats before tests
            const {body: before} = await agent
                .get(`/stats/subscriptions`)
                .expectStatus(200);

            const customer = stripeMocker.createCustomer();
            const price = await stripeMocker.getPriceForTier('default-product', 'month');
            const subscription = await stripeMocker.createTrialSubscription({
                customer,
                price
            });

            // Check the stats have not changed
            await agent
                .get(`/stats/subscriptions`)
                .expectStatus(200)
                .matchBodySnapshot(matchSubscriptionStats)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .expect(({body}) => {
                    assert.deepEqual(body, before, 'A free trial should not be counted as a paid subscriber');
                });

            // Activate the subscription
            await stripeMocker.updateSubscription({
                id: subscription.id,
                status: 'active',
                trial_end_at: null
            });

            // Check the stats have changed
            await agent
                .get(`/stats/subscriptions`)
                .expectStatus(200)
                .matchBodySnapshot(matchSubscriptionStats)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .expect(({body}) => {
                    assert.notDeepEqual(body, before, 'The stats should change after a free trial is activated');
                });
        });

        it('Can fetch history for 3D secure payments', async function () {
            // Get stats before tests
            const {body: before} = await agent
                .get(`/stats/subscriptions`)
                .expectStatus(200);

            const customer = stripeMocker.createCustomer();
            const price = await stripeMocker.getPriceForTier('default-product', 'month');
            const subscription = await stripeMocker.createIncompleteSubscription({
                customer,
                price
            });

            // Check the stats have not changed
            await agent
                .get(`/stats/subscriptions`)
                .expectStatus(200)
                .matchBodySnapshot(matchSubscriptionStats)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .expect(({body}) => {
                    assert.deepEqual(body, before, 'An incomplete subscription should not be counted as a paid subscriber');
                });

            // Activate the subscription
            await stripeMocker.updateSubscription({
                id: subscription.id,
                status: 'active'
            });

            // Check the stats have changed
            await agent
                .get(`/stats/subscriptions`)
                .expectStatus(200)
                .matchBodySnapshot(matchSubscriptionStats)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .expect(({body}) => {
                    assert.notDeepEqual(body, before, 'The stats should change after an incomplete subscription is activated');
                });
        });
    });

    describe('Referrer source history stats', function () {
        it('Can fetch attribution stats', async function () {
            await agent
                .get(`/stats/referrers/`)
                .expectStatus(200)
                .matchBodySnapshot({
                    stats: [
                        {
                            date: anyISODate,
                            source: null,
                            signups: 2,
                            paid_conversions: 2
                        },
                        {
                            date: anyISODate,
                            source: 'Direct',
                            signups: 4,
                            paid_conversions: 1
                        },
                        {
                            date: anyISODate,
                            source: 'Twitter',
                            signups: 4,
                            paid_conversions: 2
                        }
                    ],
                    meta: {}
                });
        });
    });

    describe('Top Posts by Attribution', function () {
        it('Can fetch top posts ordered by free members', async function () {
            await agent
                .get(`/stats/top-posts/?order=free_members%20desc&limit=5`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    'content-length': anyContentLength,
                    etag: anyEtag
                })
                .expect(({body}) => {
                    assert.ok(body.stats, 'Response should contain a stats property');
                    assert.ok(Array.isArray(body.stats), 'body.stats should be an array');
                });
        });
    });

    describe('Top Referrers for a post', function () {
        it('Can fetch top referrers for a post', async function () {
            await agent
                .get(`/stats/posts/${fixtureManager.get('posts', 1).id}/top-referrers`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    'content-length': anyContentLength,
                    etag: anyEtag
                })
                .expect(({body}) => {
                    assert.ok(body.stats, 'Response should contain a stats property');
                    assert.ok(Array.isArray(body.stats), 'body.stats should be an array');
                });
        });
    });

    describe('Post Growth Stats', function () {
        it('Can fetch post growth stats', async function () {
            await agent
                .get(`/stats/posts/${fixtureManager.get('posts', 1).id}/growth`)
                .expectStatus(200)
                .expect(({body}) => {
                    assert.ok(body.stats, 'Response should contain a stats property');
                    assert.ok(Array.isArray(body.stats), 'body.stats should be an array');
                });
        });
    });

    describe('Posts Visitor Counts', function () {
        it('Can fetch visitor counts for multiple posts', async function () {
            const post1 = fixtureManager.get('posts', 0);
            const post2 = fixtureManager.get('posts', 1);

            await agent
                .post('/stats/posts-visitor-counts')
                .body({
                    postUuids: [post1.uuid, post2.uuid]
                })
                .expectStatus(200)
                .expect(({body}) => {
                    assert.ok(body.stats, 'Response should contain a stats property');
                    assert.ok(Array.isArray(body.stats), 'body.stats should be an array');
                    assert.equal(body.stats.length, 1, 'Should return one stats object');
                    assert.ok(body.stats[0].data, 'Stats should contain data');
                    assert.ok(body.stats[0].data.visitor_counts, 'Data should contain visitor_counts');
                });
        });

        it('Returns empty visitor counts for invalid UUIDs', async function () {
            await agent
                .post('/stats/posts-visitor-counts')
                .body({
                    postUuids: ['invalid-uuid-1', 'invalid-uuid-2']
                })
                .expectStatus(200)
                .expect(({body}) => {
                    assert.ok(body.stats, 'Response should contain a stats property');
                    assert.ok(Array.isArray(body.stats), 'body.stats should be an array');
                    assert.equal(body.stats.length, 1, 'Should return one stats object');
                    assert.ok(body.stats[0].data, 'Stats should contain data');
                    assert.ok(body.stats[0].data.visitor_counts, 'Data should contain visitor_counts');
                });
        });

        it('Returns empty results when postUuids parameter is missing', async function () {
            await agent
                .post('/stats/posts-visitor-counts')
                .body({})
                .expectStatus(200)
                .matchBodySnapshot({
                    stats: [{
                        data: {
                            visitor_counts: {}
                        }
                    }]
                });
        });

        it('Returns empty results when postUuids is not an array', async function () {
            await agent
                .post('/stats/posts-visitor-counts')
                .body({
                    postUuids: 'not-an-array'
                })
                .expectStatus(200)
                .matchBodySnapshot({
                    stats: [{
                        data: {
                            visitor_counts: {}
                        }
                    }]
                });
        });
    });

    describe('Posts Member Counts', function () {
        it('Can fetch member counts for multiple posts', async function () {
            const post1 = fixtureManager.get('posts', 0);
            const post2 = fixtureManager.get('posts', 1);

            await agent
                .post('/stats/posts-member-counts')
                .body({
                    postIds: [post1.id, post2.id]
                })
                .expectStatus(200)
                .expect(({body}) => {
                    assert.ok(body.stats, 'Response should contain a stats property');
                    assert.ok(Array.isArray(body.stats), 'body.stats should be an array');
                    assert.equal(body.stats.length, 1, 'Should return one stats object');
                    // Member counts might be empty if no attribution data exists
                });
        });

        it('Returns empty member counts for invalid IDs', async function () {
            await agent
                .post('/stats/posts-member-counts')
                .body({
                    postIds: ['invalid-id-1', 'invalid-id-2']
                })
                .expectStatus(200)
                .expect(({body}) => {
                    assert.ok(body.stats, 'Response should contain a stats property');
                    assert.ok(Array.isArray(body.stats), 'body.stats should be an array');
                    assert.equal(body.stats.length, 1, 'Should return one stats object');
                });
        });

        it('Returns empty results when postIds parameter is missing', async function () {
            await agent
                .post('/stats/posts-member-counts')
                .body({})
                .expectStatus(200)
                .matchBodySnapshot({
                    stats: [{}]
                });
        });

        it('Returns empty results when postIds is not an array', async function () {
            await agent
                .post('/stats/posts-member-counts')
                .body({
                    postIds: 'not-an-array'
                })
                .expectStatus(200)
                .matchBodySnapshot({
                    stats: [{}]
                });
        });
    });

    describe('Comments overview', function () {
        beforeEach(async function () {
            await db.knex('comment_likes').delete();
            await db.knex('comment_reports').delete();
            await db.knex('comments').delete();
        });

        function post(index = 0) {
            return fixtureManager.get('posts', index);
        }

        function member(index = 0) {
            return fixtureManager.get('members', index);
        }

        async function addComment({postIndex = 0, memberIndex = 0, createdAt, status = 'published'} = {}) {
            const id = ObjectId().toHexString();
            await db.knex('comments').insert({
                id,
                post_id: post(postIndex).id,
                member_id: member(memberIndex).id,
                html: '<p>Comment</p>',
                status,
                created_at: createdAt,
                updated_at: createdAt
            });

            return {id};
        }

        async function addReport(comment, memberIndex = 1, createdAt) {
            await db.knex('comment_reports').insert({
                id: ObjectId().toHexString(),
                comment_id: comment.id,
                member_id: member(memberIndex).id,
                created_at: createdAt,
                updated_at: createdAt
            });
        }

        it('returns the overview payload with expected shape', async function () {
            const {body} = await agent
                .get('/stats/comments/')
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    'content-length': anyContentLength,
                    etag: anyEtag
                });

            assert.ok(Array.isArray(body.stats), 'expected stats array in response');
            assert.equal(body.stats.length, 1, 'expected a single overview object');

            const overview = body.stats[0];
            assert.ok(overview.totals, 'expected totals');
            assert.equal(typeof overview.totals.comments, 'number');
            assert.equal(typeof overview.totals.commenters, 'number');
            assert.equal(typeof overview.totals.reported, 'number');
            assert.ok('previousTotals' in overview, 'expected previousTotals key');
            assert.ok(Array.isArray(overview.series));
            assert.ok(Array.isArray(overview.topPosts));
            assert.ok(Array.isArray(overview.topMembers));
        });

        it('accepts date_from and date_to range parameters', async function () {
            await agent
                .get('/stats/comments/?date_from=2026-01-01&date_to=2026-12-31')
                .expectStatus(200);
        });

        it('returns seeded comment analytics through the Admin API', async function () {
            await addComment({createdAt: '2026-04-29T10:00:00.000Z', memberIndex: 0});
            await addComment({createdAt: '2026-04-30T10:00:00.000Z', memberIndex: 1});

            const first = await addComment({createdAt: '2026-05-01T10:00:00.000Z', memberIndex: 0, postIndex: 0});
            const second = await addComment({createdAt: '2026-05-01T12:00:00.000Z', memberIndex: 0, postIndex: 0});
            await addComment({createdAt: '2026-05-02T10:00:00.000Z', memberIndex: 1, postIndex: 1});
            await addComment({createdAt: '2026-05-02T11:00:00.000Z', memberIndex: 2, postIndex: 1, status: 'hidden'});

            await addReport(first, 1, '2026-05-01T13:00:00.000Z');
            await addReport(first, 2, '2026-05-01T14:00:00.000Z');
            await addReport(second, 2, '2026-05-02T14:00:00.000Z');

            const {body} = await agent
                .get('/stats/comments/?date_from=2026-05-01&date_to=2026-05-02&timezone=UTC')
                .expectStatus(200);

            const overview = body.stats[0];
            assert.deepEqual(overview.totals, {comments: 3, commenters: 2, reported: 2});
            assert.deepEqual(overview.previousTotals, {comments: 2, commenters: 2, reported: 0});
            assert.deepEqual(overview.series, [
                {date: '2026-05-01', count: 2, commenters: 1, reported: 1},
                {date: '2026-05-02', count: 1, commenters: 1, reported: 1}
            ]);
            assert.deepEqual(overview.topPosts.slice(0, 2), [
                {id: post(0).id, title: post(0).title, slug: post(0).slug, count: 2},
                {id: post(1).id, title: post(1).title, slug: post(1).slug, count: 1}
            ]);
            assert.deepEqual(overview.topMembers.slice(0, 2), [
                {id: member(0).id, name: member(0).name ?? null, email: member(0).email, count: 2},
                {id: member(1).id, name: member(1).name ?? null, email: member(1).email, count: 1}
            ]);
        });

        it('buckets comment series by the requested timezone through the Admin API', async function () {
            const comment = await addComment({
                createdAt: '2026-05-06T06:30:00.000Z',
                memberIndex: 0,
                postIndex: 0
            });
            await addReport(comment, 1, '2026-05-06T06:45:00.000Z');

            const {body} = await agent
                .get('/stats/comments/?date_from=2026-05-05&date_to=2026-05-05&timezone=America/Los_Angeles')
                .expectStatus(200);

            const overview = body.stats[0];
            assert.deepEqual(overview.totals, {comments: 1, commenters: 1, reported: 1});
            assert.deepEqual(overview.series, [
                {date: '2026-05-05', count: 1, commenters: 1, reported: 1}
            ]);
        });
    });
});
