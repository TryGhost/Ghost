import assert from 'node:assert/strict';
import { generateTestAppKeys } from '../../utils/app-identity';
import { insertTestInstallation } from '../../utils/app-installations';
import { agentProvider, fixtureManager, resetRateLimits } from '../../utils/e2e-framework';
import { SESSION_COOKIE_NAME } from '../../../core/server/auth/better-auth/create-auth';

const models = require('../../../core/server/models');
const configUtils = require('../../utils/config-utils');

// Apps get tokens from Better Auth's OAuth provider, so they work only under its engine
const isBetterAuth = configUtils.config.get('auth:engine') === 'better-auth';

type Agent = Awaited<ReturnType<typeof agentProvider.getAdminAPIAgent>> & {
  [method: string]: any;
};

/**
 * The routes that all checked `post:browse`, or `post:destroy` for the bulk deletes, before
 * each got a permission key of its own. Grouped by the key each checks now.
 */
const ROUTES = {
  'post:browse': [
    { method: 'get', path: 'posts/' },
    { method: 'get', path: 'pages/' },
    { method: 'get', path: 'search-index/posts/' },
    { method: 'get', path: 'search-index/pages/' },
  ],
  'post:readStats': [
    { method: 'get', path: 'stats/posts/:id/stats/' },
    { method: 'get', path: 'feedback/:id/' },
    { method: 'post', path: 'stats/posts-visitor-counts/', body: { postUuids: [] } },
    { method: 'post', path: 'stats/posts-member-counts/', body: { postIds: [] } },
  ],
  'stat:browse': [
    { method: 'get', path: 'stats/top-posts-views/?date_from=2026-01-01&date_to=2026-01-02' },
    { method: 'get', path: 'stats/top-content/' },
    { method: 'get', path: 'stats/newsletter-stats/' },
    { method: 'get', path: 'stats/newsletter-basic-stats/' },
    { method: 'get', path: 'stats/newsletter-click-stats/' },
    { method: 'get', path: 'stats/subscriber-count/' },
  ],
  'post:export': [{ method: 'get', path: 'posts/export/' }],
  // The filter matches nothing, so an allowed delete removes nothing
  'post:bulkDestroy': [
    { method: 'delete', path: "posts/?filter=slug:'no-such-post'" },
    { method: 'delete', path: "pages/?filter=slug:'no-such-page'" },
  ],
} as const;

type Key = keyof typeof ROUTES;

const ALL = Object.keys(ROUTES) as Key[];
const without = (...keys: Key[]) => ALL.filter((key) => !keys.includes(key));

/**
 * Who could call each group before the keys were split, which is who may call it now. An
 * integration's key is also held to the Admin API's list of routes integrations may use, which
 * has neither `/stats` nor `/feedback`.
 */
const CALLERS: Array<{
  name: string;
  signIn(agent: Agent): Promise<void>;
  allowed: Key[];
}> = [
  { name: 'Owner', signIn: (agent) => agent.loginAsOwner(), allowed: ALL },
  { name: 'Administrator', signIn: (agent) => agent.loginAsAdmin(), allowed: ALL },
  { name: 'Editor', signIn: (agent) => agent.loginAsEditor(), allowed: ALL },
  {
    name: 'Super Editor',
    signIn: (agent) => agent.loginAs(null, null, 'superEditor'),
    allowed: ALL,
  },
  // An Author or Contributor deletes only their own posts, one at a time
  {
    name: 'Author',
    signIn: (agent) => agent.loginAsAuthor(),
    allowed: without('post:bulkDestroy'),
  },
  {
    name: 'Contributor',
    signIn: (agent) => agent.loginAsContributor(),
    allowed: without('post:bulkDestroy'),
  },
  {
    name: 'Admin Integration',
    signIn: (agent) => agent.useZapierAdminAPIKey(),
    allowed: ['post:browse', 'post:export', 'post:bulkDestroy'],
  },
  {
    name: 'DB Backup Integration',
    signIn: (agent) => agent.useBackupAdminAPIKey(),
    allowed: ['post:browse', 'post:export'],
  },
  {
    name: 'Self-Serve Migration Integration',
    signIn: (agent) => agent.useSelfServeMigrationAdminAPIKey(),
    allowed: [],
  },
  {
    name: 'Scheduler Integration',
    async signIn(agent) {
      const integration = await models.Integration.findOne(
        { slug: 'ghost-scheduler' },
        { withRelated: 'api_keys' },
      );
      const key = integration.related('api_keys').first();
      await agent.useToken(key.get('id'), key.get('secret'));
    },
    allowed: [],
  },
];

describe('The permission keys split out of post:browse and post:destroy', function () {
  let agent: Agent;
  let postId: string;

  beforeAll(async function () {
    agent = (await agentProvider.getAdminAPIAgent()) as Agent;
    await fixtureManager.init('users', 'posts', 'integrations', 'api_keys');
    postId = fixtureManager.get('posts', 0).id;
  });

  /** Which routes the agent reaches, as it is signed in, against which it should. */
  async function reach(allowed: Key[], header?: string) {
    const reached: Record<string, boolean> = {};
    const expected: Record<string, boolean> = {};
    for (const key of ALL) {
      for (const route of ROUTES[key]) {
        const path = route.path.replace(':id', postId);
        const request = agent[route.method](path);
        if (header) {
          request.header('Authorization', header);
        }
        const response = await ('body' in route ? request.body(route.body) : request);
        const name = `${key}: ${route.method.toUpperCase()} ${route.path}`;
        assert.ok(
          response.statusCode < 400 || response.statusCode === 403,
          `${name} answered ${response.statusCode}: ${JSON.stringify(response.body)}`,
        );
        reached[name] = response.statusCode !== 403;
        expected[name] = allowed.includes(key);
      }
    }
    assert.deepEqual(reached, expected);
  }

  for (const caller of CALLERS) {
    it(`lets ${caller.name} call exactly what it could before`, async function () {
      // Each staff role signs in, and sign-ins are rate limited
      await resetRateLimits();
      await caller.signIn(agent);
      await reach(caller.allowed);
    });
  }

  // Every staff role and integration that holds `post:browse` or `post:destroy` also holds the
  // keys split out of them. An app holds only the keys it was approved for, so it shows each
  // route checks its own key.
  describe.skipIf(!isBetterAuth)('for an app acting for the Owner', function () {
    const knex = () => models.Base.knex;
    const auth = () => require('../../../core/server/auth');

    async function appToken(scopes: string[]) {
      const keys = await generateTestAppKeys();
      const installationId = await insertTestInstallation(knex(), { scopes, keys });
      const userId = fixtureManager.get('users', 0).id;
      const setCookies: string[] = await auth().staffSessions.createVerifiedSession(userId);
      const cookie = setCookies.find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
      assert.ok(cookie);
      const value = cookie.split(';')[0].slice(SESSION_COOKIE_NAME.length + 1);
      const token = decodeURIComponent(value).split('.')[0];
      const session = await knex()('user_sessions').where({ token }).first();
      assert.ok(session);
      await auth().appTokens.reconcileClient({ id: installationId, active: true, scopes });
      const issued = await auth().appTokens.issue({
        installationId,
        userId,
        sessionId: session.id,
        scopes,
      });
      assert.ok('accessToken' in issued, `refused: ${JSON.stringify(issued)}`);
      return `Bearer ${issued.accessToken}`;
    }

    beforeEach(function () {
      agent.clearCookies();
    });

    afterAll(async function () {
      await knex()('oauth_access_tokens').del();
      await knex()('oauth_clients').del();
      await knex()('app_installation_manifests').del();
      await knex()('app_installations').del();
      await knex()('user_sessions').del();
    });

    it('refuses an app approved for post:browse every route split out of it', async function () {
      await reach(['post:browse'], await appToken(['post:browse']));
    });

    it('lets an app approved for post:readStats reach how each post performed', async function () {
      await reach(
        ['post:browse', 'post:readStats'],
        await appToken(['post:browse', 'post:readStats']),
      );
    });

    it('refuses an app approved for post:destroy a bulk delete, but not a delete', async function () {
      const header = await appToken(['post:destroy']);
      await reach([], header);

      const { id } = await models.Post.add(
        { title: 'Deleted by an app' },
        { context: { internal: true } },
      ).then((post: { toJSON(): { id: string } }) => post.toJSON());
      await agent.delete(`posts/${id}/`).header('Authorization', header).expectStatus(204);
    });
  });
});
