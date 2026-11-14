const {
  agentProvider,
  fixtureManager,
  matchers,
  mockManager,
} = require('../../utils/e2e-framework');
const { mockStripe, stripeMocker } = require('../../utils/e2e-framework-mock-manager');
const { anyContentVersion, anyEtag, anyISODate, anyObjectId, anyContentLength } = matchers;
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { knex } = require('../../../core/server/data/db');

let agent;

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

  it('rejects an invalid MRR start time', async function () {
    await agent.get('/stats/mrr/?start_at=2024-06-27').expectStatus(422);
  });

  it('returns MRR immediately before an exact start time', async function () {
    const memberId = fixtureManager.get('members', 0).id;
    const customerId = 'cus_mrr_cutoff';
    const currency = 'cad';
    const id = () => randomBytes(12).toString('hex');
    const events = [
      { created_at: '2024-06-26 18:00:00', mrr_delta: 500 },
      { created_at: '2024-06-26 18:30:00', mrr_delta: 1000 },
      { created_at: '2024-06-27 02:00:00', mrr_delta: 2000 },
      { created_at: '2024-06-27 05:00:00', mrr_delta: 500 },
    ].map((event) => ({ ...event, id: id(), member_id: memberId, currency, source: 'stripe' }));

    await knex.transaction(async (tx) => {
      await tx('members_stripe_customers').insert({
        id: id(),
        member_id: memberId,
        customer_id: customerId,
        created_at: '2024-06-01 00:00:00',
      });
      await tx('members_stripe_customers_subscriptions').insert({
        id: id(),
        customer_id: customerId,
        subscription_id: 'sub_mrr_cutoff',
        status: 'active',
        start_date: '2024-06-01 00:00:00',
        current_period_end: '2024-07-01 00:00:00',
        created_at: '2024-06-01 00:00:00',
        mrr: 14000,
        plan_id: 'price_mrr_cutoff',
        plan_nickname: 'MRR cutoff',
        plan_interval: 'month',
        plan_amount: 14000,
        plan_currency: currency,
      });
      await tx('members_paid_subscription_events').insert(events);
    });

    try {
      const path = '/stats/mrr/?date_from=2024-06-27';
      const { body: legacy } = await agent.get(path).expectStatus(200);
      assert.equal(legacy.meta.opening_totals, undefined);
      assert.equal(legacy.stats.find((row) => row.currency === currency).mrr, 11500);

      for (const [startAt, openingMrr] of [
        ['2024-06-26T18:30:00Z', 10500], // Midnight in Kolkata. Includes the event at midnight.
        ['2024-06-27T04:00:00Z', 13500], // Midnight in New York. Excludes the previous evening.
        ['2024-06-27T06:00:00Z', 14000], // No activity after the cutoff.
      ]) {
        const { body } = await agent
          .get(`${path}&start_at=${encodeURIComponent(startAt)}`)
          .expectStatus(200);
        assert.deepEqual(
          body.meta.opening_totals?.find((row) => row.currency === currency),
          {
            currency,
            mrr: openingMrr,
          },
        );
        assert.equal(body.meta.totals.find((row) => row.currency === currency).mrr, 14000);
      }
    } finally {
      await knex.transaction(async (tx) => {
        await tx('members_paid_subscription_events')
          .whereIn(
            'id',
            events.map((event) => event.id),
          )
          .delete();
        await tx('members_stripe_customers_subscriptions')
          .where({ customer_id: customerId })
          .delete();
        await tx('members_stripe_customers').where({ customer_id: customerId }).delete();
      });
    }
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
});

describe('Stats API revenue permissions', function () {
  let postId;

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users', 'posts', 'members');
    postId = fixtureManager.get('posts', 0).id;
  });

  describe.each(['Editor', 'Author', 'Contributor'])('As %s', function (role) {
    beforeAll(async function () {
      await agent[`loginAs${role}`]();
    });

    it.each([
      'stats/mrr/',
      'stats/referrers/',
      'stats/top-posts/',
      'stats/top-sources-growth/',
      'stats/posts/:id/top-referrers/',
      'stats/posts/:id/growth/',
    ])('cannot fetch MRR from %s', async function (path) {
      await agent.get(path.replace(':id', postId)).expectStatus(403);
    });

    it('can still fetch member counts for the posts list', async function () {
      await agent
        .post('stats/posts-member-counts/')
        .body({ postIds: [postId] })
        .expectStatus(200);
    });
  });
});
