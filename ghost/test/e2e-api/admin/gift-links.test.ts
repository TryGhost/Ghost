import assert from 'node:assert/strict';
import { assertActionLogged } from '../../utils/action-log';

const { agentProvider, fixtureManager } = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');

describe('Gift Links Admin API', function () {
  let agent: {
    get: (_url: string) => any;
    put: (_url: string) => any;
    post: (_url: string) => any;
    loginAsOwner: () => Promise<void>;
    loginAsAuthor: () => Promise<void>;
    loginAsContributor: () => Promise<void>;
  };
  let postId: string;
  let pageId: string;

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users', 'posts');
    await agent.loginAsOwner();
    postId = fixtureManager.get('posts', 0).id;
    pageId = (await models.Base.knex('posts').where('type', 'page').first('id')).id;
  });

  afterEach(async function () {
    await models.Base.knex('post_gift_links').del();
    await models.Base.knex('gift_links').del();
    await models.Base.knex('actions').where('resource_type', 'gift_link').del();
  });

  // The gift-link API is mounted for both posts and pages off the same controller; exercise
  // both URL shapes so a missing route or a posts-only assumption can't pass unnoticed.
  describe.each([
    { name: 'posts', id: () => postId },
    { name: 'pages', id: () => pageId },
  ])('on $name', function ({ name, id }: { name: string; id: () => string }) {
    it('GET returns an empty list when no link exists', async function () {
      const { body } = await agent.get(`${name}/${id()}/gift_links/`).expectStatus(200);
      assert.deepEqual(body, { gift_links: [] });
    });

    it('PUT ensures the gift link as a token-shaped resource in a list', async function () {
      const { body } = await agent.put(`${name}/${id()}/gift_links/`).expectStatus(200);

      assert.deepEqual(Object.keys(body), ['gift_links']);
      assert.equal(body.gift_links.length, 1);
      // Allow-list — the response exposes only these fields.
      assert.deepEqual(Object.keys(body.gift_links[0]).sort(), ['created_at', 'token']);
    });

    it('POST creates a fresh token', async function () {
      const first = (await agent.put(`${name}/${id()}/gift_links/`).expectStatus(200)).body
        .gift_links[0].token;
      const { body } = await agent.post(`${name}/${id()}/gift_links/`).expectStatus(200);

      assert.equal(body.gift_links.length, 1);
      assert.notEqual(body.gift_links[0].token, first);
    });

    it('supports the full lifecycle', async function () {
      // empty
      let body = (await agent.get(`${name}/${id()}/gift_links/`).expectStatus(200)).body;
      assert.deepEqual(body.gift_links, []);

      // ensure
      body = (await agent.put(`${name}/${id()}/gift_links/`).expectStatus(200)).body;
      const first = body.gift_links[0].token;
      assert.ok(first);

      // create
      body = (await agent.post(`${name}/${id()}/gift_links/`).expectStatus(200)).body;
      const second = body.gift_links[0].token;
      assert.notEqual(second, first);
      body = (await agent.get(`${name}/${id()}/gift_links/`).expectStatus(200)).body;
      assert.equal(body.gift_links[0].token, second);

      // remove
      body = (await agent.put('gift_links/remove_all/').expectStatus(200)).body;
      assert.deepEqual(body, { meta: { count: 1 } });
      body = (await agent.get(`${name}/${id()}/gift_links/`).expectStatus(200)).body;
      assert.deepEqual(body.gift_links, []);
    });
  });

  // Permission is granted at the role level, independent of the post/page, so these
  // run once rather than per-entity.
  describe('without gift-link permission', function () {
    afterEach(async function () {
      await agent.loginAsOwner();
    });

    it('403s for an Author', async function () {
      await agent.loginAsAuthor();
      await agent.get(`posts/${postId}/gift_links/`).expectStatus(403);
    });

    it('403s for a Contributor', async function () {
      await agent.loginAsContributor();
      await agent.get(`posts/${postId}/gift_links/`).expectStatus(403);
    });
  });

  describe('remove_all', function () {
    it('returns the count in a meta block, not as a resource', async function () {
      await agent.put(`posts/${postId}/gift_links/`).expectStatus(200);
      const { body } = await agent.put('gift_links/remove_all/').expectStatus(200);
      assert.deepEqual(body, { meta: { count: 1 } });
    });
  });

  describe('a post that does not exist', function () {
    const MISSING_POST_ID = '0123456789abcdef01234567';

    it('404s on GET, PUT and POST', async function () {
      await agent.get(`posts/${MISSING_POST_ID}/gift_links/`).expectStatus(404);
      await agent.put(`posts/${MISSING_POST_ID}/gift_links/`).expectStatus(404);
      await agent.post(`posts/${MISSING_POST_ID}/gift_links/`).expectStatus(404);
    });
  });

  it('concurrent ensures settle on a single live link (last writer wins)', async function () {
    const [a, b] = await Promise.all([
      agent.put(`posts/${postId}/gift_links/`).expectStatus(200),
      agent.put(`posts/${postId}/gift_links/`).expectStatus(200),
    ]);

    const { body } = await agent.get(`posts/${postId}/gift_links/`).expectStatus(200);
    assert.equal(body.gift_links.length, 1);
    // The surviving live token must be one a caller actually received — a link
    // no client holds would be unshareable.
    const returnedTokens = [a.body.gift_links[0].token, b.body.gift_links[0].token];
    assert.ok(returnedTokens.includes(body.gift_links[0].token));
  });

  describe('records changes in the action log', function () {
    let staff: { type: 'user'; id: string };
    let postTitle: string;

    beforeAll(async function () {
      staff = {
        type: 'user',
        id: (await agent.get('users/me/').expectStatus(200)).body.users[0].id,
      };
      postTitle = (await agent.get(`posts/${postId}/`).expectStatus(200)).body.posts[0].title;
    });

    it('records a gift link being added, with its post', async function () {
      await agent.put(`posts/${postId}/gift_links/`).expectStatus(200);

      const entry = await assertActionLogged(agent, {
        resourceType: 'gift_link',
        event: 'added',
        resourceId: postId,
        actor: staff,
        details: { primary_name: postTitle, count: 1, action_name: null },
      });
      assert.equal(entry.resource?.title, postTitle);
    });

    it('records a reset as an edit named "reset"', async function () {
      await agent.put(`posts/${postId}/gift_links/`).expectStatus(200);
      await agent.post(`posts/${postId}/gift_links/`).expectStatus(200);

      await assertActionLogged(agent, {
        resourceType: 'gift_link',
        event: 'edited',
        resourceId: postId,
        actor: staff,
        details: { primary_name: postTitle, count: 1, action_name: 'reset' },
      });
    });

    it('records revoking every gift link as how many were revoked', async function () {
      await agent.put(`posts/${postId}/gift_links/`).expectStatus(200);
      await agent.put('gift_links/remove_all/').expectStatus(200);

      await assertActionLogged(agent, {
        resourceType: 'gift_link',
        event: 'deleted',
        resourceId: null,
        actor: staff,
        details: { primary_name: 'All gift links', count: 1, action_name: null },
      });
    });
  });
});
