import assert from 'node:assert/strict';
import path from 'node:path';
import { APP_PERMISSION_KEYS } from '@tryghost/app-contracts';
import ObjectId from 'bson-objectid';
import { generateTestAppKeys, type TestAppKeys } from '../../utils/app-identity';
import { insertTestInstallation, issueTestAppToken } from '../../utils/app-installations';
import { adminApiRoutes, appTokenAccess, examplePath } from '../../utils/admin-api-routes';
import {
  agentProvider,
  fixtureManager,
  mockManager,
  resetRateLimits,
} from '../../utils/e2e-framework';

const models = require('../../../core/server/models');
const configUtils = require('../../utils/config-utils');

// Apps get tokens from Better Auth's OAuth provider, so they work only under its engine
const isBetterAuth = configUtils.config.get('auth:engine') === 'better-auth';

const fixture = (...parts: string[]) => path.join(__dirname, '../../utils/fixtures', ...parts);

interface RefusedRoute {
  method: 'get' | 'post' | 'put' | 'delete';
  path: string;
  body?: unknown;
  /** An upload's field name and file, for a route that reads one before it checks permissions */
  attach?: [field: string, file: string];
}

/**
 * The routes no scope may ever open: those that return or create credentials, and the writes
 * that create access outlasting an uninstall. Each sits under a permission key the scope
 * registry doesn't offer, or checks no standard permission, so every app is refused.
 */
function lastingAccessRoutes(ids: {
  owner: string;
  member: string;
  installation: string;
}): Record<string, RefusedRoute[]> {
  const id = new ObjectId().toHexString();
  return {
    'staff tokens': [
      { method: 'get', path: `users/${ids.owner}/token/` },
      { method: 'put', path: `users/${ids.owner}/token/` },
    ],
    'integrations and their API keys': [
      { method: 'get', path: 'integrations/' },
      { method: 'get', path: `integrations/${id}/` },
      { method: 'post', path: 'integrations/', body: { integrations: [{ name: 'From an app' }] } },
      { method: 'put', path: `integrations/${id}/`, body: { integrations: [{ name: 'Renamed' }] } },
      {
        method: 'post',
        path: `integrations/${id}/api_key/${id}/refresh/`,
        body: { integrations: [{ id }] },
      },
      { method: 'delete', path: `integrations/${id}/` },
    ],
    'member sign-in URLs': [{ method: 'get', path: `members/${ids.member}/signin_urls/` }],
    identities: [{ method: 'get', path: 'identities/' }],
    'the Tinybird and Featurebase tokens': [
      { method: 'get', path: 'tinybird/token/' },
      { method: 'get', path: 'featurebase/token/' },
    ],
    'app sessions, tokens and installs': [
      { method: 'post', path: `apps/installations/${ids.installation}/sessions/` },
      {
        method: 'post',
        path: `apps/installations/${ids.installation}/tokens/`,
        body: { app_tokens: [{ revision: 0 }] },
      },
      {
        method: 'post',
        path: 'apps/installations/preview/',
        body: { app_installation_previews: [{ manifest_url: 'https://app.example.com/a.json' }] },
      },
      {
        method: 'post',
        path: 'apps/installations/',
        body: {
          app_installations: [{ manifest_url: 'https://app.example.com/a.json', digest: 'x' }],
        },
      },
      {
        method: 'put',
        path: `apps/installations/${ids.installation}/`,
        body: {
          app_installations: [
            { manifest_url: 'https://app.example.com/a.json', digest: 'x', revision: 0 },
          ],
        },
      },
      { method: 'get', path: 'apps/installations/' },
      { method: 'delete', path: `apps/installations/${ids.installation}/` },
    ],
    'staff invites': [
      { method: 'get', path: 'invites/' },
      {
        method: 'post',
        path: 'invites/',
        body: { invites: [{ email: 'invited-by-app@example.com', role_id: id }] },
      },
      { method: 'delete', path: `invites/${id}/` },
    ],
    'role changes': [
      { method: 'get', path: 'roles/' },
      {
        method: 'put',
        path: `users/${ids.owner}/`,
        body: { users: [{ roles: [{ name: 'Contributor' }] }] },
      },
      {
        method: 'put',
        path: 'users/owner/',
        body: { owner: [{ id }] },
      },
      {
        method: 'put',
        path: 'users/password/',
        body: {
          password: [
            {
              user_id: ids.owner,
              oldPassword: 'Sl1m3rson99',
              newPassword: 'Sl1m3rson99-changed!',
              ne2Password: 'Sl1m3rson99-changed!',
            },
          ],
        },
      },
    ],
    webhooks: [
      {
        method: 'post',
        path: 'webhooks/',
        body: {
          webhooks: [
            {
              event: 'post.published',
              target_url: 'https://app.example.com/hook',
              integration_id: id,
            },
          ],
        },
      },
      { method: 'put', path: `webhooks/${id}/`, body: { webhooks: [{ name: 'Renamed' }] } },
      { method: 'delete', path: `webhooks/${id}/` },
    ],
    themes: [
      { method: 'get', path: 'themes/' },
      { method: 'get', path: 'themes/casper/download/' },
      { method: 'post', path: 'themes/upload/', attach: ['file', fixture('themes', 'casper.zip')] },
      { method: 'post', path: 'themes/install/?source=github&ref=TryGhost/Casper' },
      { method: 'put', path: 'themes/casper/activate/' },
      { method: 'delete', path: 'themes/casper/' },
    ],
    'the routes file': [
      { method: 'get', path: 'settings/routes/yaml/' },
      {
        method: 'post',
        path: 'settings/routes/yaml/',
        attach: ['routes', fixture('settings', 'newroutes.yaml')],
      },
    ],
    redirects: [
      { method: 'get', path: 'redirects/download/' },
      {
        method: 'post',
        path: 'redirects/upload/',
        attach: ['redirects', fixture('data', 'redirects.json')],
      },
    ],
    'bulk delete of posts and pages': [
      { method: 'delete', path: 'posts/?filter=status:[draft,published,scheduled,sent]' },
      { method: 'delete', path: 'pages/?filter=status:[draft,published,scheduled,sent]' },
    ],
    'what post:browse used to open': [
      { method: 'get', path: 'posts/export/' },
      { method: 'get', path: 'stats/top-content/' },
      { method: 'get', path: 'stats/top-posts-views/?date_from=2026-01-01&date_to=2026-01-02' },
      { method: 'get', path: 'stats/newsletter-stats/' },
      { method: 'get', path: 'stats/newsletter-basic-stats/' },
      { method: 'get', path: 'stats/newsletter-click-stats/' },
      { method: 'get', path: 'stats/subscriber-count/' },
    ],
    'settings, members and the database': [
      { method: 'get', path: 'settings/' },
      { method: 'put', path: 'settings/', body: { settings: [{ key: 'title', value: 'Taken' }] } },
      { method: 'get', path: 'members/' },
      { method: 'get', path: 'db/' },
      { method: 'delete', path: 'db/' },
    ],
  };
}

describe.skipIf(!isBetterAuth)('An app holding every scope', function () {
  type Agent = Awaited<ReturnType<typeof agentProvider.getAdminAPIAgent>> & { [key: string]: any };
  let agent: Agent;
  let keys: TestAppKeys;
  let token: string;
  let routes: Record<string, RefusedRoute[]>;
  const knex = () => models.Base.knex;
  const owner = () => fixtureManager.get('users', 0);

  /** What an app could have changed, were one of these routes to let it through */
  const state = async () => ({
    integrations: await knex()('integrations').select('id', 'name').orderBy('id'),
    apiKeys: await knex()('api_keys').select('id', 'secret').orderBy('id'),
    webhooks: await knex()('webhooks').select('id').orderBy('id'),
    invites: await knex()('invites').select('id').orderBy('id'),
    roles: await knex()('roles_users').select('role_id', 'user_id').orderBy('user_id'),
    owner: await knex()('users').where({ id: owner().id }).first('email', 'password'),
    posts: await knex()('posts').count({ count: '*' }),
    installations: await knex()('app_installations').select('id', 'status').orderBy('id'),
    activeTheme: await knex()('settings').where({ key: 'active_theme' }).first('value'),
    title: await knex()('settings').where({ key: 'title' }).first('value'),
  });

  beforeAll(async function () {
    agent = (await agentProvider.getAdminAPIAgent()) as Agent;
    await fixtureManager.init('users', 'posts', 'members', 'integrations', 'api_keys', 'webhooks');
    keys = await generateTestAppKeys();

    const scopes = [...APP_PERMISSION_KEYS];
    const installation = await insertTestInstallation(knex(), { scopes, keys });
    ({ token } = await issueTestAppToken(knex(), {
      installationId: installation,
      userId: owner().id,
      clientScopes: scopes,
    }));
    routes = lastingAccessRoutes({
      owner: owner().id,
      member: fixtureManager.get('members', 0).id,
      installation,
    });
    agent.clearCookies();
  });

  afterAll(async function () {
    await knex()('oauth_access_tokens').del();
    await knex()('oauth_clients').del();
    await knex()('app_installation_manifests').del();
    await knex()('app_installations').del();
    await knex()('user_sessions').del();
  });

  it('can call what its scopes open, so the refusals below are not the token’s', async function () {
    await agent.get('posts/').header('Authorization', `Bearer ${token}`).expectStatus(200);
    await agent.get('tags/').header('Authorization', `Bearer ${token}`).expectStatus(200);
  });

  // Named here so a group can't be dropped from the list above unnoticed
  for (const group of [
    'staff tokens',
    'integrations and their API keys',
    'member sign-in URLs',
    'identities',
    'the Tinybird and Featurebase tokens',
    'app sessions, tokens and installs',
    'staff invites',
    'role changes',
    'webhooks',
    'themes',
    'the routes file',
    'redirects',
    'bulk delete of posts and pages',
    'what post:browse used to open',
    'settings, members and the database',
  ]) {
    it(`is refused ${group}`, async function () {
      const before = await state();

      assert.ok(routes[group]?.length, `no routes listed for ${group}`);
      for (const route of routes[group]) {
        let request = agent[route.method](route.path).header('Authorization', `Bearer ${token}`);
        if (route.body) {
          request = request.body(route.body);
        }
        if (route.attach) {
          request = request.attach(...route.attach);
        }
        const response = await request;
        const what = `${route.method.toUpperCase()} ${route.path}`;
        assert.equal(
          response.statusCode,
          403,
          `${what} answered ${response.statusCode}: ${JSON.stringify(response.body)}`,
        );
        // Refused as an app: for a scope no app can hold, or where no app may call at all.
        // Never for the Owner's role, which allows all of these.
        assert.ok(
          ['APP_SCOPE_REQUIRED', 'APP_NOT_ALLOWED'].includes(response.body.errors[0].code),
          `${what} was refused as ${response.body.errors[0].code}`,
        );
      }

      assert.deepEqual(await state(), before);
    });
  }
});

/**
 * An app's token is authenticated by the Admin API's authentication, which the routes for
 * signing in, resetting a password, accepting an invitation and setting up the site don't run:
 * they take whoever calls. Admin's bridge sends an app's request to any path, from the
 * publisher's browser, so on those routes an app would act as the publisher's browser does: its
 * wrong passwords would count against the publisher's IP, and it could send staff their
 * password reset emails. The server refuses a request carrying an app token on every route
 * that doesn't start by authenticating it, before anything else on the route runs. That takes
 * in the routes that run a rate limiter ahead of authentication, so an app's calls count
 * against none of the site's limits.
 */
describe.skipIf(!isBetterAuth)('An app’s token where nothing authenticates it', function () {
  type Agent = Awaited<ReturnType<typeof agentProvider.getAdminAPIAgent>> & { [key: string]: any };
  let agent: Agent;
  let token: string;
  const knex = () => models.Base.knex;
  const owner = () => fixtureManager.get('users', 0);

  // Read from the router the Admin API mounts, so a route added without authentication, or with
  // something ahead of it, is here from the start
  const routes = adminApiRoutes();
  const closed = routes.filter(({ handlers }) => appTokenAccess(handlers) !== 'open');

  const { ROUTES: BETTER_AUTH_ROUTES } = require('../../../core/server/auth/better-auth/routes');

  const refused = (response: { statusCode: number; body: any }, what: string) => {
    assert.equal(
      response.statusCode,
      403,
      `${what} answered ${response.statusCode}: ${JSON.stringify(response.body)}`,
    );
    assert.equal(response.body.errors?.[0]?.code, 'APP_NOT_ALLOWED', what);
    assert.equal(
      response.body.errors?.[0]?.message,
      'Apps are not allowed to access this endpoint',
      what,
    );
  };

  /** What a request to one of these routes could have left behind */
  const state = async () => ({
    rateLimits: await knex()('rate_limits').select('key', 'points').orderBy('key'),
    sessions: await knex()('user_sessions').count({ count: '*' }),
    tokens: await knex()('tokens').count({ count: '*' }),
    owner: await knex()('users').where({ id: owner().id }).first('email', 'password', 'status'),
    users: await knex()('users').count({ count: '*' }),
  });

  beforeAll(async function () {
    agent = (await agentProvider.getAdminAPIAgent()) as Agent;
    await fixtureManager.init('users');
    const keys = await generateTestAppKeys();
    const scopes = [...APP_PERMISSION_KEYS];
    const installation = await insertTestInstallation(knex(), { scopes, keys });
    ({ token } = await issueTestAppToken(knex(), {
      installationId: installation,
      userId: owner().id,
      clientScopes: scopes,
    }));
    agent.clearCookies();
  });

  beforeEach(async function () {
    await resetRateLimits();
    mockManager.mockMail();
  });

  afterEach(function () {
    mockManager.restore();
  });

  afterAll(async function () {
    await knex()('oauth_access_tokens').del();
    await knex()('oauth_clients').del();
    await knex()('app_installation_manifests').del();
    await knex()('app_installations').del();
    await knex()('user_sessions').del();
    await resetRateLimits();
  });

  it('finds the routes that don’t authenticate it first in the mounted router', function () {
    const found = closed.map(({ route }) => route);
    for (const route of [
      'POST /session',
      'PUT /session/verify',
      'POST /authentication/password_reset',
      'POST /authentication/invitation',
      'POST /authentication/setup',
      // Authenticated by a key in the URL, which is never an app's
      'PUT /schedules/:resource/:id',
      // Authenticated, but only after a rate limiter has counted the request
      'POST /email_previews/posts/:id',
      'POST /automated_emails/:id/test',
      'POST /automations/:id/email_test',
      'GET /upgrades',
      'POST /upgrades',
      'GET /upgrades/:id',
    ]) {
      assert.ok(found.includes(route), `${route} isn't among ${found.join(', ')}`);
    }
    assert.ok(!found.includes('GET /site') && !found.includes('GET /posts'));
  });

  it('is refused on every route that doesn’t authenticate it first, which leaves nothing behind', async function () {
    const before = await state();

    for (const { route } of closed) {
      const [method = '', routePath = ''] = route.split(' ');
      let request = agent[method.toLowerCase()](`${examplePath(routePath).slice(1)}/`).header(
        'Authorization',
        `Bearer ${token}`,
      );
      if (method !== 'GET') {
        request = request.body({});
      }
      refused(await request, route);
    }

    assert.deepEqual(await state(), before);
    mockManager.assert.sentEmailCount(0);
  });

  it('is refused on Better Auth’s own routes, which leaves nothing behind', async function () {
    const before = await state();

    for (const routePath of [...Object.values(BETTER_AUTH_ROUTES), '/get-session', '/no-such']) {
      for (const method of ['get', 'post'] as const) {
        let request = agent[method](`auth${routePath}`).header('Authorization', `Bearer ${token}`);
        if (method === 'post') {
          request = request.body({ email: owner().email, password: 'not-the-password' });
        }
        refused(await request, `${method.toUpperCase()} /auth${routePath}`);
      }
    }

    assert.deepEqual(await state(), before);
    mockManager.assert.sentEmailCount(0);
  });

  // More wrong passwords than the limiter allows one address, more reset emails, and more test
  // emails than the site may send in an hour
  it('can’t count against the publisher’s sign-in, password reset or test email limits', async function () {
    const wrong = { username: owner().email, password: 'not-the-password' };
    const postId = new ObjectId().toHexString();

    for (let attempt = 0; attempt < 12; attempt += 1) {
      refused(
        await agent.post('session/').header('Authorization', `Bearer ${token}`).body(wrong),
        'POST /session/',
      );
      refused(
        await agent
          .post('authentication/password_reset/')
          .header('Authorization', `Bearer ${token}`)
          .body({ password_reset: [{ email: owner().email }] }),
        'POST /authentication/password_reset/',
      );
      refused(
        await agent
          .post(`email_previews/posts/${postId}/`)
          .header('Authorization', `Bearer ${token}`)
          .body({ emails: [owner().email] }),
        'POST /email_previews/posts/:id/',
      );
      refused(
        await agent
          .post('auth/sign-in/email')
          .header('Authorization', `Bearer ${token}`)
          .body({ email: owner().email, password: 'not-the-password' }),
        'POST /auth/sign-in/email',
      );
    }
    assert.deepEqual(await knex()('rate_limits').select('key'), []);
    mockManager.assert.sentEmailCount(0);

    // The same request without an app's token is counted before it's authenticated, so
    // nothing above was
    await agent.post(`email_previews/posts/${postId}/`).body({ emails: [owner().email] });
    assert.equal((await knex()('rate_limits').select('key')).length, 1);
    await resetRateLimits();

    // The publisher's own wrong password is still answered as one, not as too many attempts
    const signIn = await agent.post('session/').body(wrong);
    assert.notEqual(signIn.statusCode, 429, JSON.stringify(signIn.body));
    assert.notEqual(signIn.statusCode, 403, JSON.stringify(signIn.body));
  });

  it('is still refused when it isn’t a valid token', async function () {
    refused(
      await agent.post('session/').header('Authorization', 'Bearer ghost_app_made_up').body({}),
      'POST /session/',
    );
    refused(
      await agent.get('authentication/setup/').header('Authorization', 'bearer  GHOST_APP_x y'),
      'GET /authentication/setup/',
    );
  });

  it('is authenticated on GET /site, the one public route apps use', async function () {
    await agent.get('site/').header('Authorization', `Bearer ${token}`).expectStatus(200);
    const invalid = await agent.get('site/').header('Authorization', 'Bearer ghost_app_made_up');
    assert.equal(invalid.statusCode, 401);
    assert.equal(invalid.body.errors[0].code, 'APP_TOKEN_INVALID');
    // Anyone else still reads it without signing in
    await agent.get('site/').expectStatus(200);
  });
});
