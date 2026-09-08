const assert = require('node:assert/strict');
const models = require('../../../core/server/models');
const { computeAutoExcerpt, computeReadingTime } = require('../../../core/server/lib/post-meta');
const { agentProvider, fixtureManager } = require('../../utils/e2e-framework');

/**
 * Content API parity for storedPostMetadata (enabled for all private flags in e2e).
 * Asserts public excerpt / reading_time match stored columns (or compute helpers).
 */
describe('Content API stored post metadata', function () {
  let agent;

  beforeAll(async function () {
    agent = await agentProvider.getContentAPIAgent();
    await fixtureManager.init('posts', 'api_keys');
    await agent.authenticate();
  });

  async function assertPostParity(postId) {
    const row = await models.Base.knex('posts')
      .where({ id: postId })
      .select(
        'id',
        'html',
        'plaintext',
        'feature_image',
        'custom_excerpt',
        'auto_excerpt',
        'reading_time',
      )
      .first();

    const { body } = await agent.get(`posts/${postId}/`).expectStatus(200);
    const post = body.posts[0];

    assert.equal(Object.prototype.hasOwnProperty.call(post, 'auto_excerpt'), false);

    const expectedExcerpt =
      row.custom_excerpt || row.auto_excerpt || computeAutoExcerpt(row.plaintext);
    assert.equal(post.excerpt, expectedExcerpt);

    const expectedReadingTime =
      row.reading_time !== null && row.reading_time !== undefined
        ? row.reading_time
        : computeReadingTime(row.html, row.feature_image);
    assert.equal(post.reading_time, expectedReadingTime);
  }

  it('matches stored excerpt and reading_time for fixture posts', async function () {
    // Fixture index 0 is a published post with custom_excerpt; index with null custom still has content.
    await assertPostParity(fixtureManager.get('posts', 0).id);
    await assertPostParity(fixtureManager.get('posts', 1).id);
  });

  it('matches stored excerpt and reading_time for fixture pages via pages API', async function () {
    const pageFixture = fixtureManager.get('posts', 5);
    assert.equal(pageFixture.type, 'page');

    const row = await models.Base.knex('posts')
      .where({ id: pageFixture.id })
      .select(
        'html',
        'plaintext',
        'feature_image',
        'custom_excerpt',
        'auto_excerpt',
        'reading_time',
      )
      .first();

    const { body } = await agent.get(`pages/${pageFixture.id}/`).expectStatus(200);
    const page = body.pages[0];

    assert.equal(Object.prototype.hasOwnProperty.call(page, 'auto_excerpt'), false);
    assert.equal(
      page.excerpt,
      row.custom_excerpt || row.auto_excerpt || computeAutoExcerpt(row.plaintext),
    );
    assert.equal(
      page.reading_time,
      row.reading_time !== null && row.reading_time !== undefined
        ? row.reading_time
        : computeReadingTime(row.html, row.feature_image),
    );
  });

  it('prefers stored auto_excerpt and reading_time over compute when they diverge', async function () {
    const post = await models.Post.add(
      {
        title: 'Stored metadata divergence content',
        status: 'published',
        lexical: JSON.stringify({
          root: {
            children: [
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text: `Parity ${'word '.repeat(300)}content`,
                    type: 'text',
                    version: 1,
                  },
                ],
                direction: 'ltr',
                format: '',
                indent: 0,
                type: 'paragraph',
                version: 1,
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            type: 'root',
            version: 1,
          },
        }),
      },
      { context: { internal: true } },
    );

    await models.Base.knex('posts').where({ id: post.id }).update({
      auto_excerpt: 'intentionally-divergent-stored-excerpt',
      reading_time: 42,
    });

    const { body } = await agent.get(`posts/${post.id}/`).expectStatus(200);
    const response = body.posts[0];

    assert.equal(response.excerpt, 'intentionally-divergent-stored-excerpt');
    assert.equal(response.reading_time, 42);
    assert.notEqual(response.excerpt, computeAutoExcerpt(post.get('plaintext')));
    assert.notEqual(
      response.reading_time,
      computeReadingTime(post.get('html'), post.get('feature_image')),
    );
  });

  it('lets custom_excerpt win over stored auto_excerpt', async function () {
    const post = await models.Post.add(
      {
        title: 'Custom excerpt wins content',
        status: 'published',
        custom_excerpt: 'custom wins',
        lexical: JSON.stringify({
          root: {
            children: [
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text: 'Body plaintext for auto excerpt',
                    type: 'text',
                    version: 1,
                  },
                ],
                direction: 'ltr',
                format: '',
                indent: 0,
                type: 'paragraph',
                version: 1,
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            type: 'root',
            version: 1,
          },
        }),
      },
      { context: { internal: true } },
    );

    await models.Base.knex('posts').where({ id: post.id }).update({
      auto_excerpt: 'should-not-appear',
    });

    const { body } = await agent.get(`posts/${post.id}/`).expectStatus(200);
    assert.equal(body.posts[0].excerpt, 'custom wins');
  });
});
