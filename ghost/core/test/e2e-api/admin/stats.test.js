const {
  agentProvider,
  fixtureManager,
  matchers,
  mockManager,
} = require('../../utils/e2e-framework');
const { mockStripe, stripeMocker } = require('../../utils/e2e-framework-mock-manager');
const { anyContentVersion, anyEtag, anyISODate, anyObjectId, anyContentLength } = matchers;
const assert = require('node:assert/strict');
const models = require('../../../core/server/models');
const db = require('../../../core/server/data/db');

let agent;
let contributorAgent;
let analyticsCommentIds = [];

async function addAnalyticsComment(createdAt, memberIndex = 0) {
  const comment = await models.Comment.add({
    post_id: fixtureManager.get('posts', 0).id,
    member_id: fixtureManager.get('members', memberIndex).id,
    html: '<p>Analytics bucket fixture</p>',
    status: 'published',
    created_at: new Date(createdAt),
  });
  analyticsCommentIds.push(comment.id);
}

const matchSubscriptionStats = {
  stats: [
    {
      date: anyISODate,
      tier: anyObjectId,
    },
    {
      date: anyISODate,
      tier: anyObjectId,
    },
  ],
  meta: {
    tiers: [anyObjectId],
    totals: [
      {
        tier: anyObjectId,
      },
    ],
  },
};

describe('Stats API', function () {
  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    contributorAgent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('posts', 'members', 'users');
    await agent.loginAsOwner();
    await contributorAgent.loginAsContributor();
  });

  beforeEach(async function () {
    mockStripe();
    mockManager.mockMail();
  });

  afterEach(async function () {
    await mockManager.restore();
    if (analyticsCommentIds.length > 0) {
      await db.knex('comments').whereIn('id', analyticsCommentIds).del();
      analyticsCommentIds = [];
    }
  });

  it('Can fetch member count history', async function () {
    await agent
      .get(`/stats/member_count`)
      .expectStatus(200)
      .matchBodySnapshot({
        stats: [
          {
            date: anyISODate,
          },
        ],
      })
      .matchHeaderSnapshot({
        'content-version': anyContentVersion,
        etag: anyEtag,
      });
  });

  it('Can fetch MRR history', async function () {
    await agent
      .get(`/stats/mrr`)
      .expectStatus(200)
      .matchBodySnapshot({
        stats: [
          {
            date: anyISODate,
          },
          {
            date: anyISODate,
          },
        ],
      })
      .matchHeaderSnapshot({
        'content-version': anyContentVersion,
        etag: anyEtag,
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
          etag: anyEtag,
        });
    });

    it('Can fetch history for free trials', async function () {
      // Get stats before tests
      const { body: before } = await agent.get(`/stats/subscriptions`).expectStatus(200);

      const customer = stripeMocker.createCustomer();
      const price = await stripeMocker.getPriceForTier('default-product', 'month');
      const subscription = await stripeMocker.createTrialSubscription({
        customer,
        price,
      });

      // Check the stats have not changed
      await agent
        .get(`/stats/subscriptions`)
        .expectStatus(200)
        .matchBodySnapshot(matchSubscriptionStats)
        .matchHeaderSnapshot({
          'content-version': anyContentVersion,
          etag: anyEtag,
        })
        .expect(({ body }) => {
          assert.deepEqual(body, before, 'A free trial should not be counted as a paid subscriber');
        });

      // Activate the subscription
      await stripeMocker.updateSubscription({
        id: subscription.id,
        status: 'active',
        trial_end_at: null,
      });

      // Check the stats have changed
      await agent
        .get(`/stats/subscriptions`)
        .expectStatus(200)
        .matchBodySnapshot(matchSubscriptionStats)
        .matchHeaderSnapshot({
          'content-version': anyContentVersion,
          etag: anyEtag,
        })
        .expect(({ body }) => {
          assert.notDeepEqual(
            body,
            before,
            'The stats should change after a free trial is activated',
          );
        });
    });

    it('Can fetch history for 3D secure payments', async function () {
      // Get stats before tests
      const { body: before } = await agent.get(`/stats/subscriptions`).expectStatus(200);

      const customer = stripeMocker.createCustomer();
      const price = await stripeMocker.getPriceForTier('default-product', 'month');
      const subscription = await stripeMocker.createIncompleteSubscription({
        customer,
        price,
      });

      // Check the stats have not changed
      await agent
        .get(`/stats/subscriptions`)
        .expectStatus(200)
        .matchBodySnapshot(matchSubscriptionStats)
        .matchHeaderSnapshot({
          'content-version': anyContentVersion,
          etag: anyEtag,
        })
        .expect(({ body }) => {
          assert.deepEqual(
            body,
            before,
            'An incomplete subscription should not be counted as a paid subscriber',
          );
        });

      // Activate the subscription
      await stripeMocker.updateSubscription({
        id: subscription.id,
        status: 'active',
      });

      // Check the stats have changed
      await agent
        .get(`/stats/subscriptions`)
        .expectStatus(200)
        .matchBodySnapshot(matchSubscriptionStats)
        .matchHeaderSnapshot({
          'content-version': anyContentVersion,
          etag: anyEtag,
        })
        .expect(({ body }) => {
          assert.notDeepEqual(
            body,
            before,
            'The stats should change after an incomplete subscription is activated',
          );
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
              paid_conversions: 2,
            },
            {
              date: anyISODate,
              source: 'Direct',
              signups: 4,
              paid_conversions: 1,
            },
            {
              date: anyISODate,
              source: 'Twitter',
              signups: 4,
              paid_conversions: 2,
            },
          ],
          meta: {},
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
          etag: anyEtag,
        })
        .expect(({ body }) => {
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
          etag: anyEtag,
        })
        .expect(({ body }) => {
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
        .expect(({ body }) => {
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
          postUuids: [post1.uuid, post2.uuid],
        })
        .expectStatus(200)
        .expect(({ body }) => {
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
          postUuids: ['invalid-uuid-1', 'invalid-uuid-2'],
        })
        .expectStatus(200)
        .expect(({ body }) => {
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
          stats: [
            {
              data: {
                visitor_counts: {},
              },
            },
          ],
        });
    });

    it('Returns empty results when postUuids is not an array', async function () {
      await agent
        .post('/stats/posts-visitor-counts')
        .body({
          postUuids: 'not-an-array',
        })
        .expectStatus(200)
        .matchBodySnapshot({
          stats: [
            {
              data: {
                visitor_counts: {},
              },
            },
          ],
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
          postIds: [post1.id, post2.id],
        })
        .expectStatus(200)
        .expect(({ body }) => {
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
          postIds: ['invalid-id-1', 'invalid-id-2'],
        })
        .expectStatus(200)
        .expect(({ body }) => {
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
          stats: [{}],
        });
    });

    it('Returns empty results when postIds is not an array', async function () {
      await agent
        .post('/stats/posts-member-counts')
        .body({
          postIds: 'not-an-array',
        })
        .expectStatus(200)
        .matchBodySnapshot({
          stats: [{}],
        });
    });
  });

  describe('Comments overview', function () {
    it('rejects invalid dates, inverted ranges, and unknown timezones', async function () {
      await agent.get('/stats/comments/?date_from=garbage&date_to=2026-02-14').expectStatus(400);
      await agent.get('/stats/comments/?date_from=2026-02-14&date_to=2026-02-08').expectStatus(400);
      await agent
        .get('/stats/comments/?date_from=2026-02-08&date_to=2026-02-14&timezone=Nowhere/Unknown')
        .expectStatus(400);
    });

    it('returns the overview payload with expected shape', async function () {
      const { body } = await agent.get('/stats/comments/').expectStatus(200).matchHeaderSnapshot({
        'content-version': anyContentVersion,
        'content-length': anyContentLength,
        etag: anyEtag,
      });

      assert.ok(Array.isArray(body.stats), 'expected stats array in response');
      assert.equal(body.stats.length, 1, 'expected a single overview object');

      const overview = body.stats[0];
      assert.ok(overview.totals, 'expected totals');
      assert.equal(typeof overview.totals.comments, 'number');
      assert.equal(typeof overview.totals.commenters, 'number');
      assert.equal(typeof overview.totals.reported, 'number');
      assert.ok('previous_totals' in overview, 'expected previous_totals key');
      assert.ok(Array.isArray(overview.series));
      assert.ok(['day', 'week', 'month'].includes(overview.series_aggregation));
      assert.ok(Array.isArray(overview.top_posts));
      assert.ok(Array.isArray(overview.top_members));
    });

    it('refuses roles without comment permissions', async function () {
      await contributorAgent.get('/stats/comments/').expectStatus(403);
    });

    it('refuses roles without comment permissions even after the payload has been served once', async function () {
      // The api-framework consults an endpoint cache before it runs the
      // permissions stage, so a warmed response must not become readable to
      // callers who would otherwise be refused.
      const query = '/stats/comments/?date_from=2026-01-01&date_to=2026-01-31&timezone=UTC';

      await agent.get(query).expectStatus(200);
      await contributorAgent.get(query).expectStatus(403);
    });

    it('does not expose member email in top_members', async function () {
      await addAnalyticsComment('2026-01-05T12:00:00.000Z', 0);
      await addAnalyticsComment('2026-01-06T12:00:00.000Z', 1);

      const { body } = await agent
        .get('/stats/comments/?date_from=2026-01-01&date_to=2026-01-31')
        .expectStatus(200);

      const { top_members: topMembers } = body.stats[0];
      assert.ok(topMembers.length > 0, 'expected commenters in the fixture range');
      for (const member of topMembers) {
        assert.ok(!('email' in member), 'top_members rows must not carry member email');
      }
    });

    it('accepts date_from and date_to range parameters and returns previous_totals', async function () {
      const { body } = await agent
        .get('/stats/comments/?date_from=2026-01-01&date_to=2026-12-31')
        .expectStatus(200);

      const overview = body.stats[0];
      assert.ok(overview.previous_totals);
      assert.equal(typeof overview.previous_totals.comments, 'number');
    });

    it('executes day buckets with a non-UTC half-hour offset', async function () {
      await addAnalyticsComment('2026-01-01T00:00:00.000Z', 0);
      await addAnalyticsComment('2026-01-01T18:45:00.000Z', 0);
      await addAnalyticsComment('2026-01-02T18:00:00.000Z', 1);

      const { body } = await agent
        .get('/stats/comments/?date_from=2026-01-01&date_to=2026-01-30&timezone=Asia/Kolkata')
        .expectStatus(200);

      const overview = body.stats[0];
      assert.equal(overview.series_aggregation, 'day');
      assert.deepEqual(
        overview.series.filter((row) => row.count > 0),
        [
          { date: '2026-01-01', count: 1, commenters: 1, reported: 0 },
          { date: '2026-01-02', count: 2, commenters: 2, reported: 0 },
        ],
      );
    });

    it('executes Monday-based week buckets with a non-UTC half-hour offset', async function () {
      await addAnalyticsComment('2026-01-04T19:00:00.000Z', 0);
      await addAnalyticsComment('2026-01-06T00:00:00.000Z', 0);
      await addAnalyticsComment('2026-01-11T18:45:00.000Z', 1);

      const { body } = await agent
        .get('/stats/comments/?date_from=2026-01-01&date_to=2026-04-30&timezone=Asia/Kolkata')
        .expectStatus(200);

      const overview = body.stats[0];
      assert.equal(overview.series_aggregation, 'week');
      assert.deepEqual(
        overview.series.filter((row) => row.count > 0),
        [
          { date: '2026-01-05', count: 2, commenters: 1, reported: 0 },
          { date: '2026-01-12', count: 1, commenters: 1, reported: 0 },
        ],
      );
    });
  });
});
