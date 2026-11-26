import assert from 'node:assert/strict';
import { agentProvider, fixtureManager, resetRateLimits } from '../../utils/e2e-framework';

const models = require('../../../core/server/models');

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

  for (const caller of CALLERS) {
    it(`lets ${caller.name} call exactly what it could before`, async function () {
      // Each staff role signs in, and sign-ins are rate limited
      await resetRateLimits();
      await caller.signIn(agent);

      const reached: Record<string, boolean> = {};
      const expected: Record<string, boolean> = {};
      for (const key of ALL) {
        for (const route of ROUTES[key]) {
          const path = route.path.replace(':id', postId);
          const request = agent[route.method](path);
          const response = await ('body' in route ? request.body(route.body) : request);
          const name = `${key}: ${route.method.toUpperCase()} ${route.path}`;
          assert.ok(
            response.statusCode < 400 || response.statusCode === 403,
            `${name} answered ${response.statusCode}: ${JSON.stringify(response.body)}`,
          );
          reached[name] = response.statusCode !== 403;
          expected[name] = caller.allowed.includes(key);
        }
      }

      assert.deepEqual(reached, expected);
    });
  }
});
