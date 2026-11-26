import assert from 'node:assert/strict';
import type { AppPermissionKey } from '@tryghost/app-contracts';
import { SERVER_GAPS, type ServerGapName } from '@tryghost/app-contracts/bridge';
import { generateTestAppKeys, type TestAppKeys } from '../../utils/app-identity';
import { insertTestInstallation, issueTestAppToken } from '../../utils/app-installations';
import { appRequests, type AppAnswer, type AppRequest } from '../../utils/app-requests';
import { agentProvider, fixtureManager } from '../../utils/e2e-framework';

const models = require('../../../core/server/models');
const configUtils = require('../../utils/config-utils');

// Apps get tokens from Better Auth's OAuth provider, so they work only under its engine
const isBetterAuth = configUtils.config.get('auth:engine') === 'better-auth';

/**
 * Admin's bridge still refuses or rewrites some of what an app sends, because Ghost's server
 * doesn't check it yet: the server gaps in the app contracts. Each test here takes requests one
 * gap acts on and sends each of them twice: through the bridge's check, which must refuse or
 * rewrite it by that gap, and as the app wrote it, with a real app token, which the server must
 * still accept. So a gap that no longer covers what its test sends fails here, and so does one
 * the server has caught up with.
 *
 * A test that fails because the server now refuses the request is good news: the bridge's gap
 * is no longer needed. Delete it from `SERVER_GAPS` in
 * `contracts/app-contracts/src/bridge/server-gaps.ts`, from the routes in `app-routes.ts`
 * beside it, and its test here.
 */
describe.skipIf(!isBetterAuth)('What Ghost’s server doesn’t check yet for apps', function () {
  type Agent = Awaited<ReturnType<typeof agentProvider.getAdminAPIAgent>> & { [key: string]: any };
  type App = ReturnType<typeof appRequests>;
  let agent: Agent;
  let keys: TestAppKeys;
  const knex = () => models.Base.knex;
  const owner = () => fixtureManager.get('users', 0);

  /** The Admin API as an app approved for `scopes` reaches it, acting for the Owner. */
  async function appWith(scopes: AppPermissionKey[]): Promise<App> {
    const installationId = await insertTestInstallation(knex(), { scopes, keys });
    const { token } = await issueTestAppToken(knex(), {
      installationId,
      userId: owner().id,
      clientScopes: scopes,
    });
    return appRequests(agent, token, scopes);
  }

  const what = ({ method, path }: AppRequest) => `${method} ${path}`;

  async function stillAccepted(app: App, gap: ServerGapName, request: AppRequest, status: number) {
    const answer = await app.raw(request);
    assert.equal(
      answer.status,
      status,
      `Ghost’s server answered ${answer.status} to ${what(request)}, which it accepted before. If it now refuses it for apps, the bridge no longer needs the ${gap} gap (${SERVER_GAPS[gap].retiredBy.join(', ')}): delete it from SERVER_GAPS in contracts/app-contracts/src/bridge/server-gaps.ts, from the routes in app-routes.ts beside it, and this test.`,
    );
    return answer;
  }

  /**
   * Shows the bridge refuses a request by `gap`, then sends it as the app wrote it and gives the
   * server's answer, which has to be `status`.
   */
  async function onlyTheBridgeRefuses(
    app: App,
    gap: ServerGapName,
    request: AppRequest,
    status: number,
  ): Promise<AppAnswer> {
    const check = app.check(request);
    assert.equal(check.problem, 'blocked', `the bridge sent ${what(request)} on`);
    assert.equal(
      check.problem === 'blocked' && check.gap,
      gap,
      `the bridge refused ${what(request)}, but not by the ${gap} gap: ${JSON.stringify(check)}`,
    );
    return stillAccepted(app, gap, request, status);
  }

  /**
   * Shows the bridge sends a request with a query the `gap` gap rewrote, then sends it as the
   * app wrote it and gives the server's answer, which has to be `status`.
   */
  async function onlyTheBridgeRewrites(
    app: App,
    gap: ServerGapName,
    request: AppRequest,
    status: number,
  ): Promise<AppAnswer> {
    const check = app.check(request);
    assert.equal(check.problem, undefined, `the bridge refused ${what(request)}`);
    assert.ok(
      !check.problem && check.gaps.includes(gap),
      `${gap} isn't applied to ${what(request)}`,
    );
    assert.ok(
      !check.problem && check.url.searchParams.has('include'),
      `the bridge sent ${what(request)} without naming its includes`,
    );
    return stillAccepted(app, gap, request, status);
  }

  async function draft(app: App, resource: 'posts' | 'pages') {
    const { status, body } = await app.raw({
      method: 'POST',
      path: `/${resource}/`,
      body: { [resource]: [{ title: 'From an app' }] },
    });
    assert.equal(status, 201);
    return body[resource][0] as { id: string; updated_at: string };
  }

  /**
   * Shows the bridge refuses a parameter its route's list leaves out, which the server reads or
   * ignores. The next change in this issue replaces these lists with refusals by name.
   */
  function unlistedParameter(
    scopes: AppPermissionKey[],
    gap: ServerGapName,
    requestFor: AppRequest | (() => Promise<AppRequest>),
  ) {
    return async () => {
      const app = await appWith(scopes);
      const request = typeof requestFor === 'function' ? await requestFor() : requestFor;
      const status = request.method === 'POST' ? 201 : request.method === 'DELETE' ? 204 : 200;
      await onlyTheBridgeRefuses(app, gap, request, status);
    };
  }

  // One test for each gap, so a gap added without one doesn't compile
  const gaps: Record<ServerGapName, () => Promise<void>> = {
    postListParameters: unlistedParameter(['post:browse'], 'postListParameters', {
      method: 'GET',
      path: '/posts/?limit=1&debug=true',
    }),
    postReadParameters: unlistedParameter(['post:read'], 'postReadParameters', async () => ({
      method: 'GET',
      path: `/posts/${fixtureManager.get('posts', 0).id}/?filter=status:published`,
    })),
    postWriteParameters: unlistedParameter(['post:add'], 'postWriteParameters', {
      method: 'POST',
      path: '/posts/?force_rerender=true',
      body: { posts: [{ title: 'From an app' }] },
    }),
    listParameters: unlistedParameter(['tag:browse'], 'listParameters', {
      method: 'GET',
      path: '/tags/?debug=true',
    }),
    tagReadParameters: unlistedParameter(['tag:read'], 'tagReadParameters', async () => ({
      method: 'GET',
      path: `/tags/${(await knex()('tags').first('id')).id}/?limit=5`,
    })),
    tagWriteParameters: unlistedParameter(['tag:add'], 'tagWriteParameters', {
      method: 'POST',
      path: '/tags/?formats=lexical',
      body: { tags: [{ name: 'From an app' }] },
    }),
    noParameters: unlistedParameter(['slug:generate'], 'noParameters', {
      method: 'GET',
      path: '/slugs/post/hello/?debug=true',
    }),

    // Ghost reads no query on the search index, so an include there gets nothing more
    searchIndexFields: unlistedParameter(['post:browse'], 'searchIndexFields', {
      method: 'GET',
      path: '/search-index/posts/?include=email',
    }),

    async scriptInContent() {
      const app = await appWith(['post:add', 'post:edit', 'tag:add', 'tag:edit']);
      const script = '<script>alert(1)</script>';

      for (const resource of ['posts', 'pages'] as const) {
        const { id, updated_at: updatedAt } = await draft(app, resource);
        const edited = await onlyTheBridgeRefuses(
          app,
          'scriptInContent',
          {
            method: 'PUT',
            path: `/${resource}/${id}/`,
            body: {
              [resource]: [
                { updated_at: updatedAt, codeinjection_head: script, codeinjection_foot: script },
              ],
            },
          },
          200,
        );
        assert.equal(edited.body[resource][0].codeinjection_head, script);

        const mobiledoc = JSON.stringify({
          version: '0.3.1',
          atoms: [],
          cards: [['html', { html: script }]],
          markups: [],
          sections: [[10, 0]],
        });
        await onlyTheBridgeRefuses(
          app,
          'scriptInContent',
          {
            method: 'POST',
            path: `/${resource}/`,
            body: { [resource]: [{ title: 'Mobiledoc', mobiledoc }] },
          },
          201,
        );
      }

      const tag = await onlyTheBridgeRefuses(
        app,
        'scriptInContent',
        {
          method: 'POST',
          path: '/tags/',
          body: { tags: [{ name: 'From an app', codeinjection_head: script }] },
        },
        201,
      );
      assert.equal(tag.body.tags[0].codeinjection_head, script);
      const editedTag = await onlyTheBridgeRefuses(
        app,
        'scriptInContent',
        {
          method: 'PUT',
          path: `/tags/${tag.body.tags[0].id}/`,
          body: { tags: [{ codeinjection_foot: script }] },
        },
        200,
      );
      assert.equal(editedTag.body.tags[0].codeinjection_foot, script);
    },

    // An app approved only to list posts gets how they performed, and their tags, for the asking
    async postFields() {
      const app = await appWith(['post:browse', 'post:read']);
      const postId = fixtureManager.get('posts', 0).id;

      const named = await onlyTheBridgeRefuses(
        app,
        'postFields',
        {
          method: 'GET',
          path: '/posts/?limit=1&include=tags,tiers,newsletter,email,count.clicks,sentiment,authors,authors.roles&order=sentiment%20desc',
        },
        200,
      );
      const [post] = named.body.posts;
      assert.ok('tags' in post && 'tiers' in post, 'tags and tiers were left out');
      assert.ok('count' in post && 'sentiment' in post, 'how the post performed was left out');
      assert.ok('roles' in post.authors[0], 'the authors’ roles were left out');

      // Each kind of thing the gap refuses, on its own: a relation that needs a scope, one apps
      // can't have, how a post performed, and a sort by it
      for (const query of [
        'include=tags',
        'include=authors.roles',
        'include=count.clicks',
        'order=sentiment%20desc',
      ]) {
        await onlyTheBridgeRefuses(
          app,
          'postFields',
          { method: 'GET', path: `/posts/?limit=1&${query}` },
          200,
        );
      }

      const defaults = await onlyTheBridgeRewrites(
        app,
        'postFields',
        { method: 'GET', path: `/posts/${postId}/` },
        200,
      );
      assert.ok(
        'tags' in defaults.body.posts[0] && 'count' in defaults.body.posts[0],
        'Ghost’s default includes no longer hold tags and how the post performed for an app without those scopes, so the bridge needn’t name the defaults itself',
      );
    },

    async pageFields() {
      const app = await appWith(['post:browse', 'post:read']);

      const named = await onlyTheBridgeRefuses(
        app,
        'pageFields',
        {
          method: 'GET',
          path: '/pages/?limit=1&include=tags,tiers,count.signups,count.paid_conversions',
        },
        200,
      );
      const [page] = named.body.pages;
      assert.ok('tags' in page && 'tiers' in page, 'tags and tiers were left out');
      assert.ok('count' in page, 'how the page performed was left out');

      const defaults = await onlyTheBridgeRewrites(
        app,
        'pageFields',
        { method: 'GET', path: '/pages/?limit=1' },
        200,
      );
      assert.ok(
        'tags' in defaults.body.pages[0] && 'count' in defaults.body.pages[0],
        'Ghost’s default includes no longer hold tags and how the page performed for an app without those scopes, so the bridge needn’t name the defaults itself',
      );
    },

    async newsletterFields() {
      const app = await appWith(['newsletter:browse']);

      const listed = await onlyTheBridgeRefuses(
        app,
        'newsletterFields',
        { method: 'GET', path: '/newsletters/?include=count.members,count.active_members' },
        200,
      );
      assert.ok(
        'members' in listed.body.newsletters[0].count,
        'the newsletters’ member counts were left out',
      );
    },
  };

  beforeAll(async function () {
    agent = (await agentProvider.getAdminAPIAgent()) as Agent;
    await fixtureManager.init('users', 'posts', 'newsletters');
    keys = await generateTestAppKeys();
    agent.clearCookies();
  });

  afterEach(async function () {
    await knex()('oauth_access_tokens').del();
    await knex()('oauth_clients').del();
    await knex()('app_installation_manifests').del();
    await knex()('app_installations').del();
    await knex()('user_sessions').del();
  });

  it('has a test for every gap the bridge covers', function () {
    assert.deepEqual(Object.keys(gaps).sort(), Object.keys(SERVER_GAPS).sort());
  });

  for (const [gap, sendWhatItActsOn] of Object.entries(gaps)) {
    it(`still accepts what the bridge refuses or rewrites by the ${gap} gap`, sendWhatItActsOn);
  }
});
