const assert = require('node:assert/strict');
const models = require('../../../core/server/models');
const { computeAutoExcerpt, computeReadingTime } = require('../../../core/server/lib/post-meta');
const { agentProvider, fixtureManager } = require('../../utils/e2e-framework');

const createLexical = (text) =>
  JSON.stringify({
    root: {
      children: [
        {
          children: [
            {
              detail: 0,
              format: 0,
              mode: 'normal',
              style: '',
              text,
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
  });

/**
 * Admin API parity for storedPostMetadata (enabled for all private flags in e2e).
 */
describe('Admin API stored post metadata', function () {
  let agent;

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('posts');
    await agent.loginAsOwner();
  });

  async function assertStoredParity(resource, id) {
    const row = await models.Base.knex('posts')
      .where({ id })
      .select(
        'html',
        'plaintext',
        'feature_image',
        'custom_excerpt',
        'auto_excerpt',
        'reading_time',
      )
      .first();

    assert.notEqual(row.auto_excerpt, null);
    assert.notEqual(row.reading_time, null);

    const { body } = await agent.get(`/${resource}/${id}/`).expectStatus(200);
    const item = body[resource][0];

    assert.equal(Object.prototype.hasOwnProperty.call(item, 'auto_excerpt'), false);
    assert.equal(item.excerpt, row.custom_excerpt || row.auto_excerpt);
    assert.equal(item.reading_time, row.reading_time);
  }

  it('returns stored excerpt and reading_time for fixture posts', async function () {
    await assertStoredParity('posts', fixtureManager.get('posts', 0).id);
    await assertStoredParity('posts', fixtureManager.get('posts', 1).id);
  });

  it('returns stored excerpt and reading_time for fixture pages', async function () {
    const pageFixture = fixtureManager.get('posts', 5);
    assert.equal(pageFixture.type, 'page');
    await assertStoredParity('pages', pageFixture.id);
  });

  it('returns parity excerpt and reading_time on post create and feature_image update', async function () {
    // ~380–410 words is just under 1.5 minutes; +1 image rounds to 2.
    const lexical = createLexical(`Admin parity ${'word '.repeat(390)}content`);

    const { body: createBody } = await agent
      .post('/posts/?formats=lexical,html,plaintext')
      .body({
        posts: [
          {
            title: 'Admin stored metadata create',
            status: 'draft',
            mobiledoc: null,
            lexical,
          },
        ],
      })
      .expectStatus(201);

    const created = createBody.posts[0];
    assert.equal(Object.prototype.hasOwnProperty.call(created, 'auto_excerpt'), false);
    assert.equal(created.excerpt, computeAutoExcerpt(created.plaintext));
    assert.equal(created.reading_time, computeReadingTime(created.html, created.feature_image));
    assert.equal(created.reading_time, 1);

    const rowAfterCreate = await models.Base.knex('posts')
      .where({ id: created.id })
      .select('auto_excerpt', 'reading_time')
      .first();
    assert.equal(rowAfterCreate.auto_excerpt, created.excerpt);
    assert.equal(rowAfterCreate.reading_time, created.reading_time);

    // Sentinel proves feature_image-only edits refresh reading_time on save.
    await models.Base.knex('posts').where({ id: created.id }).update({ reading_time: 999 });

    const { body: updateBody } = await agent
      .put(`/posts/${created.id}/?formats=lexical,html,plaintext`)
      .body({
        posts: [
          {
            feature_image: 'https://example.com/feature.jpg',
            updated_at: created.updated_at,
          },
        ],
      })
      .expectStatus(200);

    const updated = updateBody.posts[0];
    const expectedReadingTime = computeReadingTime(updated.html, 'https://example.com/feature.jpg');

    assert.equal(updated.excerpt, created.excerpt);
    assert.equal(updated.reading_time, expectedReadingTime);
    assert.equal(updated.reading_time, 2);
    assert.ok(updated.reading_time > created.reading_time);

    const rowAfterUpdate = await models.Base.knex('posts')
      .where({ id: created.id })
      .select('auto_excerpt', 'reading_time', 'feature_image')
      .first();
    assert.equal(rowAfterUpdate.feature_image, 'https://example.com/feature.jpg');
    assert.equal(rowAfterUpdate.auto_excerpt, created.excerpt);
    assert.notEqual(rowAfterUpdate.reading_time, 999);
    assert.equal(rowAfterUpdate.reading_time, expectedReadingTime);
  });

  it('returns parity excerpt and reading_time on page create', async function () {
    const lexical = createLexical(`Admin page parity ${'word '.repeat(390)}content`);

    const { body } = await agent
      .post('/pages/?formats=lexical,html,plaintext')
      .body({
        pages: [
          {
            title: 'Admin stored metadata page',
            status: 'draft',
            mobiledoc: null,
            lexical,
          },
        ],
      })
      .expectStatus(201);

    const page = body.pages[0];
    assert.equal(Object.prototype.hasOwnProperty.call(page, 'auto_excerpt'), false);
    assert.equal(page.excerpt, computeAutoExcerpt(page.plaintext));
    assert.equal(page.reading_time, computeReadingTime(page.html, page.feature_image));

    const row = await models.Base.knex('posts')
      .where({ id: page.id })
      .select('auto_excerpt', 'reading_time', 'type')
      .first();
    assert.equal(row.type, 'page');
    assert.equal(row.auto_excerpt, page.excerpt);
    assert.equal(row.reading_time, page.reading_time);
  });

  it('lets custom_excerpt win over stored auto_excerpt', async function () {
    const { body: createBody } = await agent
      .post('/posts/?formats=lexical,html,plaintext')
      .body({
        posts: [
          {
            title: 'Admin custom excerpt wins',
            status: 'draft',
            custom_excerpt: 'custom wins',
            mobiledoc: null,
            lexical: createLexical('Body plaintext for auto excerpt'),
          },
        ],
      })
      .expectStatus(201);

    const created = createBody.posts[0];

    await models.Base.knex('posts').where({ id: created.id }).update({
      auto_excerpt: 'should-not-appear',
    });

    const { body } = await agent
      .get(`/posts/${created.id}/?formats=lexical,html,plaintext`)
      .expectStatus(200);

    assert.equal(body.posts[0].excerpt, 'custom wins');
  });

  it('prefers stored values when they diverge from compute', async function () {
    const { body: createBody } = await agent
      .post('/posts/?formats=lexical,html,plaintext')
      .body({
        posts: [
          {
            title: 'Admin divergent stored metadata',
            status: 'draft',
            mobiledoc: null,
            lexical: createLexical(`Divergent ${'word '.repeat(390)}content`),
          },
        ],
      })
      .expectStatus(201);

    const created = createBody.posts[0];

    await models.Base.knex('posts').where({ id: created.id }).update({
      auto_excerpt: 'admin-divergent-stored-excerpt',
      reading_time: 99,
    });

    const { body } = await agent
      .get(`/posts/${created.id}/?formats=lexical,html,plaintext`)
      .expectStatus(200);

    assert.equal(body.posts[0].excerpt, 'admin-divergent-stored-excerpt');
    assert.equal(body.posts[0].reading_time, 99);
  });
});
