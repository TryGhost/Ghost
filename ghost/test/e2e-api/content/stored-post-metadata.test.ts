import assert from 'node:assert/strict';
// beforeAll isn't in the mocha globals that tsc resolves project-wide; this
// suite runs under vitest, so import it explicitly for type-checking.
import { beforeAll } from 'vitest';

const models = require('../../../core/server/models');
const { computeAutoExcerpt, computeReadingTime } = require('../../../core/server/lib/post-meta');
const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');

type StoredMetaRow = {
  id?: string;
  html: string | null;
  plaintext: string | null;
  feature_image: string | null;
  custom_excerpt: string | null;
  auto_excerpt: string | null;
  reading_time: number | null;
};

type ApiResource = {
  excerpt: string | null;
  reading_time: number | null;
  plaintext?: string | null;
  html?: string | null;
  feature_image?: string | null;
  updated_at?: string;
  auto_excerpt?: string;
  id?: string;
};

/**
 * Content API parity for storedPostMetadata (enabled for all private flags in e2e).
 * Asserts public excerpt / reading_time come from populated stored columns.
 */
describe('Content API stored post metadata', function () {
  let agent: any;

  beforeAll(async function () {
    agent = await agentProvider.getContentAPIAgent();
    await fixtureManager.init('posts', 'api_keys');
    await agent.authenticate();
  });

  async function assertStoredParity(resource: 'posts' | 'pages', id: string) {
    const row = (await models.Base.knex('posts')
      .where({ id })
      .select(
        'id',
        'html',
        'plaintext',
        'feature_image',
        'custom_excerpt',
        'auto_excerpt',
        'reading_time',
      )
      .first()) as StoredMetaRow;

    assert.notEqual(row.auto_excerpt, null);
    assert.notEqual(row.reading_time, null);

    const { body } = await agent.get(`${resource}/${id}/`).expectStatus(200);
    const item = body[resource][0] as ApiResource;

    assert.equal(Object.prototype.hasOwnProperty.call(item, 'auto_excerpt'), false);
    assert.equal(item.excerpt, row.custom_excerpt || row.auto_excerpt);
    assert.equal(item.reading_time, row.reading_time);
  }

  it('returns stored excerpt and reading_time for fixture posts', async function () {
    // Fixture index 0 is a published post with custom_excerpt; index 1 still has content.
    await assertStoredParity('posts', fixtureManager.get('posts', 0).id);
    await assertStoredParity('posts', fixtureManager.get('posts', 1).id);
  });

  it('returns stored excerpt and reading_time for fixture pages', async function () {
    const pageFixture = fixtureManager.get('posts', 5);
    assert.equal(pageFixture.type, 'page');
    await assertStoredParity('pages', pageFixture.id);
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
                    text: `Parity ${'word '.repeat(390)}content`,
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
    const response = body.posts[0] as ApiResource;

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

  it('computes excerpt and reading_time when storedPostMetadata is off', async function () {
    const post = await models.Post.add(
      {
        title: 'Content flag-off compute path',
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
                    text: `Flag off ${'word '.repeat(390)}content`,
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
      auto_excerpt: 'content-flag-off-should-ignore',
      reading_time: 42,
    });

    mockManager.mockLabsDisabled('storedPostMetadata');
    try {
      const { body } = await agent.get(`posts/${post.id}/`).expectStatus(200);
      const response = body.posts[0] as ApiResource;

      assert.equal(response.excerpt, computeAutoExcerpt(post.get('plaintext')));
      assert.equal(
        response.reading_time,
        computeReadingTime(post.get('html'), post.get('feature_image')),
      );
      assert.notEqual(response.excerpt, 'content-flag-off-should-ignore');
      assert.notEqual(response.reading_time, 42);
    } finally {
      mockManager.restore();
    }
  });

  it('uses stored auto_excerpt for ?fields=excerpt without loading html', async function () {
    const post = await models.Post.add(
      {
        title: 'Content fields excerpt stored path',
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
                    text: 'Body for fields=excerpt stored path',
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
      auto_excerpt: 'content-fields-excerpt-stored',
      plaintext: 'plaintext-fallback-should-not-win',
    });

    const { body } = await agent.get(`posts/${post.id}/?fields=excerpt`).expectStatus(200);

    assert.equal(body.posts[0].excerpt, 'content-fields-excerpt-stored');
    assert.equal(Object.prototype.hasOwnProperty.call(body.posts[0], 'auto_excerpt'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(body.posts[0], 'html'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(body.posts[0], 'plaintext'), false);
  });

  it('uses stored reading_time for ?fields=reading_time without leaking html', async function () {
    const post = await models.Post.add(
      {
        title: 'Content fields reading_time stored path',
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
                    text: `Fields reading time ${'word '.repeat(390)}content`,
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
      reading_time: 42,
    });

    const { body } = await agent.get(`posts/${post.id}/?fields=reading_time`).expectStatus(200);

    assert.equal(body.posts[0].reading_time, 42);
    assert.equal(Object.prototype.hasOwnProperty.call(body.posts[0], 'html'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(body.posts[0], 'feature_image'), false);
  });

  it('computes reading_time for ?fields=reading_time when stored value is still null', async function () {
    const post = await models.Post.add(
      {
        title: 'Content fields reading_time null fallback',
        status: 'published',
        feature_image: 'https://example.com/feature.jpg',
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
                    text: `Null fallback ${'word '.repeat(390)}content`,
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
      reading_time: null,
    });

    const { body } = await agent.get(`posts/${post.id}/?fields=reading_time`).expectStatus(200);

    assert.equal(body.posts[0].reading_time, 2);
    assert.equal(Object.prototype.hasOwnProperty.call(body.posts[0], 'html'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(body.posts[0], 'feature_image'), false);
  });
});
