const {
  agentProvider,
  fixtureManager,
  matchers,
  mockManager,
} = require('../../utils/e2e-framework');
const { mockStripe, stripeMocker } = require('../../utils/e2e-framework-mock-manager');
const { anyContentVersion, anyEtag, anyISODate, anyObjectId, anyContentLength } = matchers;
const assert = require('node:assert/strict');
const moment = require('moment-timezone');

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

  describe('Histories in the viewer’s timezone and by the hour', function () {
    const timezone = 'Asia/Kolkata';
    const today = () => moment().tz(timezone).format('YYYY-MM-DD');
    const hourLabel = /^\d{4}-\d{2}-\d{2}T\d{2}:00$/;
    // Hours from the timezone's midnight up to the current hour
    const hoursSoFar = () => moment().tz(timezone).hours() + 1;
    // Counted before the request: the hour can tick over while it runs, adding one
    const assertHours = (count, before, perHour = 1) => {
      assert.ok(
        count === before * perHour || count === (before + 1) * perHour,
        `expected ${before * perHour} or ${(before + 1) * perHour} rows, got ${count}`,
      );
    };

    it('Can fetch member count history in local days', async function () {
      const from = moment().tz(timezone).subtract(6, 'days').format('YYYY-MM-DD');
      await agent
        .get(`/stats/member_count?date_from=${from}&timezone=${timezone}`)
        .expectStatus(200)
        .expect(({ body }) => {
          const dates = body.stats.map((stat) => stat.date);
          assert.equal(dates[0], from);
          assert.equal(dates.at(-1), today());
          assert.equal(dates.length, 7);
          const last = body.stats.at(-1);
          const totals = body.meta.totals;
          assert.equal(
            last.paid + last.free + last.comped + last.gift,
            totals.paid + totals.free + totals.comped + totals.gift,
          );
        });
    });

    it('Can fetch today’s member count by the hour', async function () {
      const before = hoursSoFar();
      await agent
        .get(`/stats/member_count?interval=hour&timezone=${timezone}`)
        .expectStatus(200)
        .expect(({ body }) => {
          assert.equal(body.meta.interval, 'hour');
          assertHours(body.stats.length, before);
          assert.equal(body.stats[0].date, `${today()}T00:00`);
          for (const stat of body.stats) {
            assert.match(stat.date, hourLabel);
          }
          const last = body.stats.at(-1);
          const totals = body.meta.totals;
          assert.deepEqual(
            { paid: last.paid, free: last.free, comped: last.comped, gift: last.gift },
            totals,
          );
          // Where the day started, before its first hour's changes
          for (const status of ['paid', 'free', 'comped', 'gift']) {
            assert.equal(typeof body.meta.start[status], 'number');
          }
        });
    });

    it('Can fetch today’s MRR by the hour', async function () {
      const before = hoursSoFar();
      await agent
        .get(`/stats/mrr?interval=hour&timezone=${timezone}`)
        .expectStatus(200)
        .expect(({ body }) => {
          assert.equal(body.meta.interval, 'hour');
          const currencies = body.meta.totals.map((total) => total.currency);
          assertHours(body.stats.length, before, currencies.length);
          for (const total of body.meta.totals) {
            const last = body.stats.filter((stat) => stat.currency === total.currency).at(-1);
            assert.equal(last.mrr, Math.max(0, total.mrr));
          }
          assert.deepEqual(
            body.meta.start.map((start) => start.currency),
            currencies,
          );
        });
    });

    it('Can fetch today’s newsletter subscribers by the hour', async function () {
      const { body: newsletters } = await agent.get('/newsletters/').expectStatus(200);
      const newsletterId = newsletters.newsletters[0].id;

      const before = hoursSoFar();
      await agent
        .get(
          `/stats/subscriber-count?newsletter_id=${newsletterId}&interval=hour&timezone=${timezone}`,
        )
        .expectStatus(200)
        .expect(({ body }) => {
          assert.equal(body.meta.interval, 'hour');
          const [stat] = body.stats;
          assertHours(stat.values.length, before);
          assert.equal(stat.values.at(-1).value, stat.total);
          assert.equal(typeof body.meta.start, 'number');
        });
    });

    it('Rejects a day by the hour that isn’t a real date', async function () {
      const { body: newsletters } = await agent.get('/newsletters/').expectStatus(200);
      const newsletterId = newsletters.newsletters[0].id;

      for (const path of [
        '/stats/member_count?interval=hour&date_to=2026-13-45',
        '/stats/mrr?interval=hour&date_to=banana',
        `/stats/subscriber-count?newsletter_id=${newsletterId}&interval=hour&date_to=2026-02-30`,
      ]) {
        await agent
          .get(path)
          .expectStatus(422)
          .expect(({ body }) => {
            assert.equal(body.errors[0].type, 'ValidationError');
            // Caught before the database sees it, rather than by MySQL
            // refusing the date (SQLite would answer with an empty day)
            assert.match(body.errors[0].message, /date_to/);
          });
      }
    });

    it('Keeps UTC days when no timezone is asked for', async function () {
      const { body } = await agent.get(`/stats/member_count`).expectStatus(200);
      assert.equal(body.meta.interval, undefined);
      assert.equal(body.stats.at(-1).date, moment.utc().format('YYYY-MM-DD'));
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
});
