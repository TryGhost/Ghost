const assert = require('node:assert/strict');
const db = require('../../../core/server/data/db');
const configUtils = require('../../utils/config-utils');
const postsPublicService = require('../../../core/server/services/posts-public');
const tagsPublicService = require('../../../core/server/services/tags-public');
const { agentProvider, fixtureManager } = require('../../utils/e2e-framework');

describe('Content API tag query privacy', function () {
  let agent;
  let queryParameterFiltering;
  let tags;

  beforeAll(async function () {
    queryParameterFiltering = configUtils.config.get('queryParameterFiltering:enabled');
    configUtils.set('queryParameterFiltering:enabled', false);
    agent = await agentProvider.getContentAPIAgent();
    await fixtureManager.init('users', 'posts', 'tags:extra', 'api_keys');
    await agent.authenticate();

    const { body } = await agent.get('tags/?limit=all').expectStatus(200);
    tags = body.tags;
    assert.ok(tags.length > 1);
    // Give hidden metadata a different order from the public name order, so
    // an accepted private ordering clause cannot pass the regression by chance.
    for (const [index, tag] of tags.entries()) {
      await db
        .knex('tags')
        .where({ id: tag.id })
        .update({
          created_at: new Date(Date.UTC(2020 + index, 0, 1)),
          updated_at: new Date(Date.UTC(2020 + index, 0, 1)),
          parent_id: String(index + 1).padStart(24, '0'),
        });
    }
    await tagsPublicService.api.cache?.reset();
  });

  afterAll(function () {
    configUtils.set('queryParameterFiltering:enabled', queryParameterFiltering);
  });

  for (const [field, predicate, value] of [
    ['created_at', ">'2999-01-01'", '2999-01-01'],
    ['updated_at', ">'2999-01-01'", '2999-01-01'],
    ['parent_id', 'missing-parent', 'missing-parent'],
  ]) {
    it(`ignores hidden ${field} filters on tag browse and read`, async function () {
      const tag = tags[0];
      for (const path of ['tags/?limit=all', `tags/${tag.id}/?include=count.posts`]) {
        const { body: expected } = await agent.get(path).expectStatus(200);
        for (const key of [field, `tags.${field}`]) {
          const { body } = await agent
            .get(`${path}&filter=${encodeURIComponent(`${key}:${predicate}`)}`)
            .expectStatus(200);
          assert.deepEqual(body, expected);
        }
      }
    });

    it(`ignores hidden ${field} selectors in tag read bodies`, async function () {
      const tag = tags[0];
      for (const identifier of [{ id: tag.id }, { slug: tag.slug }]) {
        const path = `tags/${tag.id}/`;
        const { body: expected } = await agent.get(path).expectStatus(200);
        const { body } = await agent
          .get(path, { body: { ...identifier, [field]: value } })
          .expectStatus(200);
        assert.deepEqual(body, expected);
        await agent.get(path, { body: { [field]: value } }).expectStatus(400);
      }
    });

    for (const resource of ['posts', 'pages']) {
      it(`ignores hidden tags.${field} filters through ${resource}`, async function () {
        const path = `${resource}/?limit=all&fields=id,slug`;
        await postsPublicService.api.cache?.reset();
        const { body: expected } = await agent.get(path).expectStatus(200);
        assert.ok(expected[resource].length > 0);
        const { body } = await agent
          .get(`${path}&filter=${encodeURIComponent(`tags.${field}:${predicate}`)}`)
          .expectStatus(200);
        assert.deepEqual(body, expected);
      });
    }
  }

  it('ignores hidden tag ordering fields, including suffix aliases and repeated order options', async function () {
    const path = 'tags/?limit=all';
    const { body: expected } = await agent.get(path).expectStatus(200);
    for (const field of [
      'created_at',
      'updated_at',
      'parent_id',
      'tags.updated_at',
      'ated_at',
      'ent_id',
    ]) {
      const { body } = await agent
        .get(`${path}&order=${encodeURIComponent(`${field} desc`)}`)
        .expectStatus(200);
      assert.deepEqual(body, expected);
    }

    const { body: descending } = await agent.get(`${path}&order=name%20desc`).expectStatus(200);
    for (const order of [
      `order=${encodeURIComponent('updated_at asc,name desc')}`,
      'order=updated_at%20asc&order=name%20desc',
    ]) {
      const { body } = await agent.get(`${path}&${order}`).expectStatus(200);
      assert.deepEqual(body, descending);
    }
  });

  it('preserves public tag identifiers, visibility, slug ordering and post counts', async function () {
    const tag = tags[0];
    for (const path of [`tags/${tag.id}/`, `tags/slug/${tag.slug}/`]) {
      const { body } = await agent.get(`${path}?visibility=public`).expectStatus(200);
      assert.equal(body.tags[0].id, tag.id);
      await agent.get(`${path}?visibility=internal`).expectStatus(404);
      await agent.get(path, { body: { visibility: 'public' } }).expectStatus(400);
    }

    const slugs = [tags[1].slug, tag.slug];
    const { body } = await agent
      .get(
        `tags/?include=count.posts&filter=${encodeURIComponent(`slug:[${slugs.join(',')}]+visibility:public`)}`,
      )
      .expectStatus(200);
    assert.deepEqual(
      body.tags.map((t) => t.slug),
      slugs,
    );
    assert.ok(body.tags.every((t) => t.count.posts > 0));
  });
});
