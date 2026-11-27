const assert = require('node:assert/strict');
const models = require('../../../core/server/models');
const configUtils = require('../../utils/config-utils');
const {
  agentProvider,
  fixtureManager,
  matchers,
  assertions,
} = require('../../utils/e2e-framework');
const { anyContentVersion, anyEtag, anyObjectId, anyNumber } = matchers;
const { cacheInvalidateHeaderNotSet } = assertions;
const localUtils = require('./utils');

const authorMatcher = {
  id: anyObjectId,
};

const authorMatcherWithCount = {
  ...authorMatcher,
  count: {
    posts: anyNumber,
  },
};

describe('Authors Content API', function () {
  let agent;
  let queryParameterFiltering;

  beforeAll(async function () {
    // Exercise the core API without the optional host query-parameter allowlist.
    queryParameterFiltering = configUtils.config.get('queryParameterFiltering:enabled');
    configUtils.set('queryParameterFiltering:enabled', false);
    agent = await agentProvider.getContentAPIAgent();
    await fixtureManager.init('owner:post', 'users', 'user:inactive', 'posts', 'api_keys');
    await agent.authenticate();
  });

  afterAll(function () {
    configUtils.set('queryParameterFiltering:enabled', queryParameterFiltering);
  });

  it('Can request authors', async function () {
    await agent
      .get('authors/')
      .expectStatus(200)
      .matchHeaderSnapshot({
        'content-version': anyContentVersion,
        etag: anyEtag,
      })
      .matchBodySnapshot({
        authors: new Array(3).fill(authorMatcher),
      })
      .expect(cacheInvalidateHeaderNotSet())
      .expect(({ body }) => {
        // We don't expose the email address, status and other attrs.
        localUtils.API.checkResponse(body.authors[0], 'author', ['url'], null, null);

        // Verify default order 'name asc'
        assert.equal(body.authors[0].name, 'Ghost');
        assert.equal(body.authors[2].name, 'Slimer McEctoplasm');

        assert.equal(body.meta.pagination.total, 3);

        // Verify URL structure
        const urlParts = new URL(body.authors[0].url);
        assert.ok(['http:', 'https:'].includes(urlParts.protocol));
        assert.equal(urlParts.pathname, `/author/${body.authors[0].slug}/`);
      });
  });
  it('Can request authors including post count', async function () {
    await agent
      .get('authors/?include=count.posts')
      .expectStatus(200)
      .matchHeaderSnapshot({
        'content-version': anyContentVersion,
        etag: anyEtag,
      })
      .matchBodySnapshot({
        authors: new Array(3).fill(authorMatcherWithCount),
      })
      .expect(cacheInvalidateHeaderNotSet())
      .expect(({ body }) => {
        const { authors } = body;
        // We don't expose the email address.
        localUtils.API.checkResponse(body.authors[0], 'author', ['count', 'url'], null, null);

        // Verify slugs and post counts for specific authors
        const mustFind = (slug) => {
          const expectedAuthor = authors.find((author) => author.slug === slug);
          assert.ok(expectedAuthor, `Expected author slug "${slug}" to be present`);
          return expectedAuthor;
        };

        assert.equal(mustFind('joe-bloggs').count.posts, 6);
        assert.equal(mustFind('slimer-mcectoplasm').count.posts, 1);
        assert.equal(mustFind('ghost').count.posts, 7);

        // Verify expected author IDs (excluding ghost)
        const nonGhostIds = authors
          .filter((author) => author.slug !== 'ghost')
          .map((author) => author.id);

        assert.deepEqual(nonGhostIds, [
          fixtureManager.get('users', 0).id,
          fixtureManager.get('users', 3).id,
        ]);
      });
  });
  it('Can request single author', async function () {
    await agent
      .get(`authors/slug/${fixtureManager.get('users', 0).slug}/`)
      .expectStatus(200)
      .matchHeaderSnapshot({
        'content-version': anyContentVersion,
        etag: anyEtag,
      })
      .matchBodySnapshot({
        authors: [authorMatcher],
      })
      .expect(cacheInvalidateHeaderNotSet())
      .expect(({ body }) => {
        // We don't expose the email address.
        localUtils.API.checkResponse(body.authors[0], 'author', ['url'], null, null);

        assert.equal(body.authors.length, 1);
        const requestedId = fixtureManager.get('users', 0).id;
        assert.equal(body.authors[0].id, requestedId);
      });
  });
  it('Can request author by id including post count', async function () {
    await agent
      .get(`authors/${fixtureManager.get('users', 0).id}/?include=count.posts`)
      .expectStatus(200)
      .matchHeaderSnapshot({
        'content-version': anyContentVersion,
        etag: anyEtag,
      })
      .matchBodySnapshot({
        authors: [authorMatcherWithCount],
      })
      .expect(cacheInvalidateHeaderNotSet())
      .expect(({ body }) => {
        // We don't expose the email address.
        localUtils.API.checkResponse(body.authors[0], 'author', ['count', 'url'], null, null);

        assert.equal(body.authors.length, 1);
        const expectedId = fixtureManager.get('users', 0).id;
        assert.equal(body.authors[0].id, expectedId);
      });
  });

  it('Cannot read staff without published posts', async function () {
    await agent.get(`authors/slug/${fixtureManager.get('users', 1).slug}/`).expectStatus(404);

    await agent
      .get(`authors/?filter=slug:${fixtureManager.get('users', 1).slug}`)
      .expectStatus(200)
      .expect(({ body }) => {
        assert.equal(body.authors.length, 0);
        assert.equal(body.meta.pagination.total, 0);
      });
  });

  it('Ignores staff lookup parameters on author reads', async function () {
    const user = fixtureManager.get('users', 0);
    const model = await models.User.findOne(
      { id: user.id },
      { context: { internal: true }, withRelated: ['roles'] },
    );
    const role = model.related('roles').at(0).get('name');

    for (const path of [`authors/${user.id}/`, `authors/slug/${user.slug}/`]) {
      const { body: expected } = await agent.get(path).expectStatus(200);

      for (const query of [
        { email: user.email },
        { email: 'not-a-staff-member@example.invalid' },
        { role },
        { role: 'NonexistentRole' },
      ]) {
        const { body } = await agent.get(`${path}?${new URLSearchParams(query)}`).expectStatus(200);

        assert.deepEqual(body, expected);
        assert.equal(Object.hasOwn(body.authors[0], 'email'), false);
        assert.equal(Object.hasOwn(body.authors[0], 'roles'), false);
      }
    }
  });

  it('Ignores staff selectors in author read request bodies', async function () {
    const user = fixtureManager.get('users', 0);
    const path = `authors/${user.id}/`;
    const { body: expected } = await agent.get(path).expectStatus(200);

    for (const selectors of [
      { email: user.email },
      { email: 'not-a-staff-member@example.invalid' },
      { role: 'Owner' },
      { role: 'NonexistentRole' },
      { password: 'guess' },
      { status: 'inactive' },
    ]) {
      const { body } = await agent
        .get(path, { body: { id: user.id, ...selectors } })
        .expectStatus(200);

      assert.deepEqual(body, expected);
      assert.equal(Object.hasOwn(body.authors[0], 'roles'), false);
    }
  });

  it('Rejects author read bodies without a public identifier', async function () {
    const user = fixtureManager.get('users', 0);

    for (const body of [{ email: user.email }, { role: 'Owner' }, { status: 'active' }]) {
      await agent.get(`authors/${user.id}/`, { body }).expectStatus(400);
    }
  });

  it('Ignores filters on fields that are not exposed', async function () {
    for (const filter of [
      "email:~'example'",
      'roles.name:Owner',
      'roles_users.role_id:role-id',
      'status:active',
      "last_seen:>'2000-01-01'",
    ]) {
      await agent
        .get(`authors/?filter=${encodeURIComponent(filter)}`)
        .expectStatus(200)
        .expect(({ body }) => {
          assert.equal(body.authors.length, 3, `filter "${filter}" should be ignored`);
        });
    }
  });

  it('Ignores ordering by fields that are not exposed', async function () {
    for (const order of ['email desc', 'password asc', 'last_seen desc', 'roles.name asc']) {
      await agent
        .get(`authors/?order=${encodeURIComponent(order)}`)
        .expectStatus(200)
        .expect(({ body }) => {
          assert.deepEqual(
            body.authors.map((author) => author.name),
            ['Ghost', 'Joe Bloggs', 'Slimer McEctoplasm'],
            `order "${order}" should be ignored`,
          );
        });
    }

    await agent
      .get(`authors/?order=${encodeURIComponent('email desc,name desc')}`)
      .expectStatus(200)
      .expect(({ body }) => {
        assert.deepEqual(
          body.authors.map((author) => author.name),
          ['Slimer McEctoplasm', 'Joe Bloggs', 'Ghost'],
        );
      });

    await agent
      .get(
        `authors/?order=${encodeURIComponent('email desc')}&order=${encodeURIComponent('name desc')}`,
      )
      .expectStatus(200)
      .expect(({ body }) => {
        assert.deepEqual(
          body.authors.map((author) => author.name),
          ['Slimer McEctoplasm', 'Joe Bloggs', 'Ghost'],
        );
      });
  });
});
