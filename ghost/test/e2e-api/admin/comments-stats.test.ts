import assert from 'node:assert/strict';
import ObjectId from 'bson-objectid';
import { afterAll, afterEach, beforeAll, beforeEach, describe, it } from 'vitest';
import { agentProvider, fixtureManager, mockManager } from '../../utils/e2e-framework';
const models = require('../../../core/server/models');

describe('Comments stats API', function () {
  let agent: Awaited<ReturnType<typeof agentProvider.getAdminAPIAgent>>;
  let postIds: string[];
  let members: { id: string; name: string | null }[];
  const commentIds: string[] = [];
  const reportIds: string[] = [];
  const range = '?date_from=2020-03-01&date_to=2020-03-03&timezone=UTC';

  async function insertComment(
    postId: string,
    memberId: string | null,
    createdAt: string,
    status = 'published',
  ) {
    const id = ObjectId().toHexString();
    commentIds.push(id);
    await models.Base.knex('comments').insert({
      id,
      post_id: postId,
      member_id: memberId,
      status,
      html: '<p>Comment</p>',
      created_at: createdAt,
      updated_at: createdAt,
    });
    return id;
  }

  async function insertReport(commentId: string) {
    const id = ObjectId().toHexString();
    reportIds.push(id);
    await models.Base.knex('comment_reports').insert({
      id,
      comment_id: commentId,
      member_id: null,
      created_at: '2020-03-04 00:00:00',
      updated_at: '2020-03-04 00:00:00',
    });
  }

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users', 'posts', 'members');
    // Admin, so every other test also checks the Admin role
    await agent.loginAsAdmin();

    postIds = (await models.Base.knex('posts').orderBy('id').limit(2).pluck('id')) as string[];
    members = await models.Base.knex('members')
      .whereNotNull('name')
      .orderBy('id')
      .limit(2)
      .select('id', 'name');
    const [postA, postB] = postIds;
    const [memberA, memberB] = members.map(({ id }) => id);

    const reported = await insertComment(postA, memberA, '2020-03-01 10:00:00');
    await insertComment(postA, memberB, '2020-03-01 11:00:00', 'hidden');
    await insertComment(postA, memberA, '2020-03-02 09:00:00');
    await insertComment(postB, memberA, '2020-03-03 23:59:59');
    const deleted = await insertComment(postB, memberB, '2020-03-02 10:00:00', 'deleted');
    await insertComment(postB, memberB, '2020-02-28 12:00:00');
    await insertComment(postB, memberB, '2020-03-04 00:00:00');
    await insertReport(reported);
    await insertReport(reported);
    await insertReport(deleted);
  });

  beforeEach(function () {
    mockManager.mockLabsEnabled('commentsAnalytics');
  });

  afterEach(function () {
    mockManager.restore();
  });

  afterAll(async function () {
    await models.Base.knex('comment_reports').whereIn('id', reportIds).del();
    await models.Base.knex('comments').whereIn('id', commentIds).del();
  });

  it('returns totals, the previous period and a zero-filled series', async function () {
    const { body } = await agent.get(`stats/comments${range}`).expectStatus(200);

    assert.deepEqual(body.stats, [
      {
        totals: { comments: 4, commenters: 2, reported: 1 },
        previous_totals: { comments: 1, commenters: 1, reported: 0 },
        interval: 'day',
        series: [
          { date: '2020-03-01', comments: 2, commenters: 2, reported: 1 },
          { date: '2020-03-02', comments: 1, commenters: 1, reported: 0 },
          { date: '2020-03-03', comments: 1, commenters: 1, reported: 0 },
        ],
      },
    ]);
  });

  it('starts an all-time range on the first comment', async function () {
    const { body } = await agent
      .get('stats/comments?date_to=2020-03-03&timezone=UTC')
      .expectStatus(200);
    const [stats] = body.stats;

    assert.equal(stats.interval, 'day');
    assert.equal(stats.series[0].date, '2020-02-28');
    assert.deepEqual(stats.totals, { comments: 5, commenters: 2, reported: 1 });
    assert.deepEqual(stats.previous_totals, { comments: 0, commenters: 0, reported: 0 });
  });

  it('returns the posts with the most comments', async function () {
    const { body } = await agent.get(`stats/comments/top-posts${range}`).expectStatus(200);
    const titles = await models.Base.knex('posts')
      .whereIn('id', postIds)
      .orderBy('id')
      .pluck('title');

    assert.deepEqual(body.stats, [
      { post_id: postIds[0], title: titles[0], comments: 3 },
      { post_id: postIds[1], title: titles[1], comments: 1 },
    ]);
  });

  it('returns the top commenters by name, never email', async function () {
    const { body } = await agent
      .get(`stats/comments/top-commenters${range}&limit=1`)
      .expectStatus(200);

    assert.deepEqual(body.stats, [
      { member_id: members[0].id, name: members[0].name, comments: 3 },
    ]);
  });

  const paths = ['stats/comments', 'stats/comments/top-posts', 'stats/comments/top-commenters'];

  for (const path of paths) {
    it(`rejects ${path} without a date range`, async function () {
      await agent.get(`${path}?timezone=UTC`).expectStatus(422);
    });
  }

  for (const path of paths) {
    it(`rejects ${path} ending after tomorrow`, async function () {
      await agent.get(`${path}?date_to=9999-12-31&timezone=UTC`).expectStatus(422);
    });

    it(`hides ${path} while the labs flag is off`, async function () {
      mockManager.mockLabsDisabled('commentsAnalytics');
      await agent.get(`${path}${range}`).expectStatus(404);
    });
  }

  for (const path of ['stats/comments/top-posts', 'stats/comments/top-commenters']) {
    it(`accepts limits on ${path} up to the API's maximum`, async function () {
      // The API caps any larger limit, including "all", at 100
      for (const limit of ['100', '1001', 'all']) {
        await agent.get(`${path}${range}&limit=${limit}`).expectStatus(200);
      }
    });
  }

  // One login per role: sign-ins are rate limited across the file
  it('is limited to roles that can browse comments', async function () {
    const expected = {
      superEditor: 200,
      editor: 403,
      author: 403,
      contributor: 403,
    } as const;
    for (const [role, status] of Object.entries(expected)) {
      await agent.loginAs(null, null, role);
      for (const path of paths) {
        await agent.get(`${path}${range}`).expectStatus(status);
      }
    }
  });
});
