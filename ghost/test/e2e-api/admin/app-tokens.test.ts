import assert from 'node:assert/strict';
import { createServer, request as httpRequest, type RequestListener, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import ObjectId from 'bson-objectid';
import sinon from 'sinon';
import { generateTestAppKeys, type TestAppKeys } from '../../utils/app-identity';
import { insertTestInstallation } from '../../utils/app-installations';
import {
  agentProvider,
  fixtureManager,
  mockManager,
  resetRateLimits,
} from '../../utils/e2e-framework';
import { SESSION_COOKIE_NAME as SESSION_COOKIE } from '../../../core/server/auth/better-auth/create-auth';

const models = require('../../../core/server/models');
// Required, not imported, so the stub reaches the copy Ghost loaded
const {
  AppInstallationsRepository,
} = require('../../../core/server/services/app-installations/app-installations-repository');
const configUtils = require('../../utils/config-utils');

// Apps get tokens from Better Auth's OAuth provider, so they work only under its engine
const isBetterAuth = configUtils.config.get('auth:engine') === 'better-auth';

describe.skipIf(!isBetterAuth)('App tokens on the Admin API', function () {
  let agent: Awaited<ReturnType<typeof agentProvider.getAdminAPIAgent>> & {
    clearCookies(): void;
    jar: { setCookies(cookies: string[]): void };
    get(path: string): any;
    post(path: string): any;
    delete(path: string): any;
    put(path: string): any;
  };
  let keys: TestAppKeys;
  const knex = () => models.Base.knex;
  const appTokens = () => require('../../../core/server/auth').appTokens;
  const owner = () => fixtureManager.get('users', 0);

  const installation = (scopes: string[], status: 'active' | 'suspended' = 'active') =>
    insertTestInstallation(knex(), { scopes, status, keys });

  /**
   * A new verified staff session for the user (the Owner unless named), and the cookies that sign
   * a browser into it. Made directly, as signing in over HTTP is rate limited.
   */
  async function staffSession(userId: string = owner().id) {
    const setCookies: string[] =
      await require('../../../core/server/auth').staffSessions.createVerifiedSession(userId);
    const cookies = setCookies.map((c) => c.split(';')[0]);
    const sessionCookie = cookies.find((c) => c.startsWith(`${SESSION_COOKIE}=`));
    assert.ok(sessionCookie);
    const token = decodeURIComponent(sessionCookie.slice(SESSION_COOKIE.length + 1)).split('.')[0];
    const session = await knex()('user_sessions').where({ token }).first();
    assert.ok(session);
    return { id: session.id as string, setCookies };
  }

  /** Signs the agent into a new staff session of the Owner's, as a browser would be. */
  async function signInOwner() {
    const session = await staffSession();
    agent.jar.setCookies(session.setCookies);
    return session;
  }

  /**
   * An app user token for the installation, bound to a new staff session of the user's (the Owner
   * unless named).
   */
  async function tokenFor(
    installationId: string,
    {
      clientScopes,
      tokenScopes,
      userId = owner().id,
    }: { clientScopes: string[]; tokenScopes?: string[]; userId?: string },
  ) {
    const session = await staffSession(userId);
    await appTokens().reconcileClient({ id: installationId, active: true, scopes: clientScopes });
    const issued = await appTokens().issue({
      installationId,
      userId,
      sessionId: session.id,
      scopes: tokenScopes ?? clientScopes,
    });
    assert.ok('accessToken' in issued, `refused: ${JSON.stringify(issued)}`);
    return { token: issued.accessToken as string, session };
  }

  const bearer = (token: string) => `Bearer ${token}`;
  const refusedAs = (body: { errors: Array<{ code: string }> }) => body.errors[0].code;

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users', 'posts');
    keys = await generateTestAppKeys();
  });

  // Every request names its own credentials
  beforeEach(function () {
    agent.clearCookies();
  });

  afterEach(async function () {
    sinon.restore();
    mockManager.restore();
    await knex()('oauth_access_tokens').del();
    await knex()('oauth_clients').del();
    await knex()('app_installation_manifests').del();
    await knex()('app_installations').del();
    await knex()('users').where({ id: owner().id }).update({ status: 'active' });
    await knex()('user_sessions').del();
  });

  it('refuses an invalid token, never falling back to the staff cookie it was sent with', async function () {
    await signInOwner();

    const { body } = await agent
      .get('posts/')
      .header('Authorization', bearer('ghost_app_not-a-token'))
      .expectStatus(401);

    assert.equal(refusedAs(body), 'APP_TOKEN_INVALID');
    // The cookie still works on its own
    await agent.get('posts/').expectStatus(200);
  });

  it('refuses a malformed app token header, never falling back to the staff cookie', async function () {
    await signInOwner();

    for (const header of [
      'Bearer  ghost_app_x',
      'Bearer ghost_app_x extra',
      'Bearer GHOST_APP_x',
    ]) {
      const { body } = await agent.get('posts/').header('Authorization', header).expectStatus(401);
      assert.equal(refusedAs(body), 'APP_TOKEN_INVALID', header);
    }
  });

  it('refuses an expired token', async function () {
    const id = await installation(['post:browse']);
    const { token } = await tokenFor(id, { clientScopes: ['post:browse'] });
    await knex()('oauth_access_tokens').update({ expires_at: new Date(Date.now() - 1000) });

    const { body } = await agent
      .get('posts/')
      .header('Authorization', bearer(token))
      .expectStatus(401);

    assert.equal(refusedAs(body), 'APP_TOKEN_INVALID');
  });

  for (const status of ['suspended', 'uninstalled']) {
    it(`refuses a token once the installation is ${status}, even with its client still enabled`, async function () {
      const id = await installation(['post:browse']);
      const { token } = await tokenFor(id, { clientScopes: ['post:browse'] });
      await knex()('app_installations').where({ id }).update({ status });

      const { body } = await agent
        .get('posts/')
        .header('Authorization', bearer(token))
        .expectStatus(401);

      assert.equal(refusedAs(body), 'APP_TOKEN_INVALID');
    });
  }

  it('refuses a token once the installation is suspended, whatever its stored manifest', async function () {
    const id = await installation(['post:browse']);
    const { token } = await tokenFor(id, { clientScopes: ['post:browse'] });
    await knex()('app_installations').where({ id }).update({ status: 'suspended' });
    await knex()('app_installation_manifests')
      .where({ installation_id: id })
      .update({ manifest: 'not json' });

    const { body } = await agent
      .get('posts/')
      .header('Authorization', bearer(token))
      .expectStatus(401);

    assert.equal(refusedAs(body), 'APP_TOKEN_INVALID');
  });

  it('refuses a token once the user is suspended', async function () {
    const id = await installation(['post:browse']);
    const { token } = await tokenFor(id, { clientScopes: ['post:browse'] });
    // Directly, as a suspension that lands while a session is being created leaves one
    await knex()('users').where({ id: owner().id }).update({ status: 'inactive' });

    const { body } = await agent
      .get('posts/')
      .header('Authorization', bearer(token))
      .expectStatus(401);

    assert.equal(refusedAs(body), 'APP_TOKEN_INVALID');
  });

  it('refuses app tokens from the next request once the apps flag is off', async function () {
    const id = await installation(['post:browse']);
    const { token } = await tokenFor(id, { clientScopes: ['post:browse'] });
    await agent.get('posts/').header('Authorization', bearer(token)).expectStatus(200);

    mockManager.mockLabsDisabled('apps');

    const { body } = await agent
      .get('posts/')
      .header('Authorization', bearer(token))
      .expectStatus(401);
    assert.equal(refusedAs(body), 'APP_TOKEN_INVALID');
  });

  it('answers a failure to read the installation as an error, not a refused token', async function () {
    const id = await installation(['post:browse']);
    const { token } = await tokenFor(id, { clientScopes: ['post:browse'] });
    sinon
      .stub(AppInstallationsRepository.prototype, 'findAccess')
      .rejects(new Error('The database went away'));

    await agent.get('posts/').header('Authorization', bearer(token)).expectStatus(500);
  });

  it('leaves other Bearer tokens to the key check, as before', async function () {
    const { body } = await agent
      .get('posts/')
      .header('Authorization', 'Bearer not-an-app-token')
      .expectStatus(401);

    assert.equal(refusedAs(body), 'INVALID_AUTH_HEADER');
  });

  it('acts for the staff user within the installation’s approved scopes, with no cookie', async function () {
    const id = await installation(['post:browse']);
    const { token } = await tokenFor(id, { clientScopes: ['post:browse'] });

    await agent.get('posts/').header('Authorization', bearer(token)).expectStatus(200);
    await agent.get('tags/').header('Authorization', bearer(token)).expectStatus(403);
  });

  it('leaves an app on a router authenticated in front to its method’s own check', async function () {
    const id = await installation(['post:browse']);
    const { token } = await tokenFor(id, { clientScopes: ['post:browse'] });

    // No app scope opens these yet, so the method's standard check is what answers
    for (const [path, message] of [
      ['apps/installations/', 'Permission error, cannot list app_installations.'],
      [
        'members/metafields/custom/favourite/values/',
        'You do not have permission to browse member',
      ],
    ]) {
      const { body } = await agent
        .get(path)
        .header('Authorization', bearer(token))
        .expectStatus(403);
      assert.equal(body.errors[0].message, message, path);
    }
  });

  it('holds a call to the installation’s scopes when its OAuth client is out of step', async function () {
    const id = await installation(['post:browse']);
    const { token } = await tokenFor(id, { clientScopes: ['post:browse', 'tag:browse'] });

    await agent.get('tags/').header('Authorization', bearer(token)).expectStatus(403);
    await agent.get('posts/').header('Authorization', bearer(token)).expectStatus(200);
  });

  it('refuses a token once the staff session ends', async function () {
    const id = await installation(['post:browse']);
    const { token, session } = await tokenFor(id, { clientScopes: ['post:browse'] });

    await knex()('user_sessions').where({ id: session.id }).del();

    const { body } = await agent
      .get('posts/')
      .header('Authorization', bearer(token))
      .expectStatus(401);
    assert.equal(refusedAs(body), 'APP_TOKEN_INVALID');
  });

  describe('when the installation’s approved scopes change', function () {
    /** Approves a manifest with `scopes` for the installation, as approving an update does */
    async function approveScopes(installationId: string, scopes: string[]) {
      const current = await knex()('app_installation_manifests')
        .where({ installation_id: installationId })
        .orderBy('created_at', 'desc')
        .first();
      const id = new ObjectId().toHexString();
      await knex()('app_installation_manifests').insert({
        ...current,
        id,
        manifest: JSON.stringify({ ...JSON.parse(current.manifest), scopes }),
        source: 'update',
        created_at: new Date(),
      });
      await knex()('app_installations').where({ id: installationId }).update({ manifest_id: id });
    }

    it('refuses a scope from the next request once it is removed', async function () {
      const scopes = ['post:browse', 'tag:browse'];
      const id = await installation(scopes);
      const { token } = await tokenFor(id, { clientScopes: scopes });
      await agent.get('tags/').header('Authorization', bearer(token)).expectStatus(200);

      await approveScopes(id, ['post:browse']);

      await agent.get('tags/').header('Authorization', bearer(token)).expectStatus(403);
      await agent.get('posts/').header('Authorization', bearer(token)).expectStatus(200);
    });

    it('allows a scope from the next request once it is added', async function () {
      const id = await installation(['post:browse']);
      const { token } = await tokenFor(id, { clientScopes: ['post:browse'] });
      await agent.get('tags/').header('Authorization', bearer(token)).expectStatus(403);

      await approveScopes(id, ['post:browse', 'tag:browse']);

      await agent.get('tags/').header('Authorization', bearer(token)).expectStatus(200);
    });
  });

  describe('when the staff user the app acts for changes', function () {
    const administrator = () => fixtureManager.get('users', 1);
    const roleId = async (name: string) => (await knex()('roles').where({ name }).first()).id;
    let rolesBefore: Array<Record<string, unknown>>;

    beforeEach(async function () {
      rolesBefore = await knex()('roles_users').where({ user_id: administrator().id });
    });

    afterEach(async function () {
      await knex()('roles_users').where({ user_id: administrator().id }).del();
      await knex()('roles_users').insert(rolesBefore);
      await knex()('users').where({ id: administrator().id }).update({ status: 'active' });
    });

    /** The Owner's change to the Administrator, through the Admin API with their own session */
    async function ownerEdits(changes: Record<string, unknown>) {
      await signInOwner();
      await agent
        .put(`users/${administrator().id}/`)
        .body({ users: [changes] })
        .expectStatus(200);
      agent.clearCookies();
    }

    it('holds the app to the user’s role from the next request once the user is demoted', async function () {
      const scopes = ['post:browse', 'member:browse'];
      const id = await installation(scopes);
      const { token } = await tokenFor(id, { clientScopes: scopes, userId: administrator().id });
      await agent.get('members/').header('Authorization', bearer(token)).expectStatus(200);

      await ownerEdits({ roles: [{ id: await roleId('Contributor') }] });

      // A Contributor may browse posts but not members, whatever the app's scopes
      await agent.get('members/').header('Authorization', bearer(token)).expectStatus(403);
      await agent.get('posts/').header('Authorization', bearer(token)).expectStatus(200);
    });

    it('holds the app to the user’s role when the role changes with the session intact', async function () {
      const scopes = ['post:browse', 'member:browse'];
      const id = await installation(scopes);
      const { token } = await tokenFor(id, { clientScopes: scopes, userId: administrator().id });
      await agent.get('members/').header('Authorization', bearer(token)).expectStatus(200);

      // Directly, so nothing else the API does on a role change refuses the token first
      await knex()('roles_users')
        .where({ user_id: administrator().id })
        .update({ role_id: await roleId('Contributor') });

      await agent.get('members/').header('Authorization', bearer(token)).expectStatus(403);
      await agent.get('posts/').header('Authorization', bearer(token)).expectStatus(200);
    });

    it('refuses the app from the next request once the user is suspended', async function () {
      const id = await installation(['post:browse']);
      const { token } = await tokenFor(id, {
        clientScopes: ['post:browse'],
        userId: administrator().id,
      });
      await agent.get('posts/').header('Authorization', bearer(token)).expectStatus(200);

      await ownerEdits({ status: 'inactive' });

      const { body } = await agent
        .get('posts/')
        .header('Authorization', bearer(token))
        .expectStatus(401);
      assert.equal(refusedAs(body), 'APP_TOKEN_INVALID');
    });
  });

  describe('with more than one credential', function () {
    let server: Server;

    // Over a real connection, as the test agent hands headers to Express as given rather than as
    // Node parses them
    beforeAll(async function () {
      server = createServer((agent as unknown as { app: RequestListener }).app);
      await new Promise<void>((resolve) => {
        server.listen(0, '127.0.0.1', resolve);
      });
    });

    afterAll(async function () {
      await new Promise((resolve) => {
        server.close(resolve);
      });
    });

    /** GETs an Admin API path with the headers as sent, a list sending the header once per item */
    function send(
      path: string,
      headers: Record<string, string | string[]>,
    ): Promise<{ status: number; body: any }> {
      const site = new URL(configUtils.config.get('url'));
      return new Promise((resolve, reject) => {
        const request = httpRequest(
          {
            host: '127.0.0.1',
            port: (server.address() as AddressInfo).port,
            path: `/ghost/api/admin/${path}`,
            headers: { host: site.host, origin: site.origin, ...headers },
          },
          (response) => {
            let data = '';
            response.on('data', (chunk) => (data += chunk));
            response.on('end', () =>
              resolve({ status: response.statusCode!, body: JSON.parse(data) }),
            );
          },
        );
        request.on('error', reject);
        request.end();
      });
    }

    /** The Owner's session cookie, sent alongside, which no refused credential may fall back to */
    async function ownerCookie() {
      const { setCookies } = await staffSession();
      return setCookies.map((c) => c.split(';')[0]).join('; ');
    }

    it('reads only the first of two Authorization headers', async function () {
      const id = await installation(['post:browse']);
      const { token } = await tokenFor(id, { clientScopes: ['post:browse'] });
      const cookie = await ownerCookie();
      // On its own, the cookie signs the Owner in
      assert.equal((await send('tags/', { cookie })).status, 200);

      // The app token first: the app, held to its scopes, not the Owner's cookie
      const asApp = { authorization: [bearer(token), 'Bearer not-an-app-token'], cookie };
      assert.equal((await send('posts/', asApp)).status, 200);
      assert.equal((await send('tags/', asApp)).status, 403);

      // Another credential first: the app token is never read, and the cookie isn't used
      const other = await send('posts/', {
        authorization: ['Bearer not-an-app-token', bearer(token)],
        cookie,
      });
      assert.equal(other.status, 401);
      assert.equal(refusedAs(other.body), 'INVALID_AUTH_HEADER');
    });

    it('never falls back to a second header or the cookie for a refused app token', async function () {
      const id = await installation(['post:browse']);
      const { token } = await tokenFor(id, { clientScopes: ['post:browse'] });

      const { status, body } = await send('posts/', {
        authorization: [bearer('ghost_app_not-a-token'), bearer(token)],
        cookie: await ownerCookie(),
      });
      assert.equal(status, 401);
      assert.equal(refusedAs(body), 'APP_TOKEN_INVALID');
    });

    it('refuses an Authorization header joined from two, either way round', async function () {
      const id = await installation(['post:browse']);
      const { token } = await tokenFor(id, { clientScopes: ['post:browse'] });
      const cookie = await ownerCookie();

      for (const [joined, code] of [
        [`${bearer(token)}, Bearer not-an-app-token`, 'APP_TOKEN_INVALID'],
        [`${bearer(token)},Bearer not-an-app-token`, 'APP_TOKEN_INVALID'],
        [`Bearer not-an-app-token, ${bearer(token)}`, 'INVALID_AUTH_HEADER'],
      ]) {
        const { status, body } = await send('posts/', { authorization: joined, cookie });
        assert.equal(status, 401, joined);
        assert.equal(refusedAs(body), code, joined);
      }
    });
  });

  describe('on the routes staff tokens are refused on', function () {
    const blocked = [
      { method: 'delete', paths: ['db/', 'db', 'DB/', 'Db'] },
      { method: 'put', paths: ['users/owner/', 'users/owner', 'USERS/OWNER/', 'Users/Owner'] },
      {
        method: 'post',
        paths: [
          'authentication/reset/',
          'authentication/reset',
          'AUTHENTICATION/RESET/',
          'Authentication/Reset',
        ],
      },
    ];
    // The permissions the Owner's role holds for each route, which would otherwise let it through
    const scopeSets = [
      ['post:browse'],
      ['db:deleteAllContent', 'authentication:reset', 'role:assign'],
    ];

    for (const scopes of scopeSets) {
      it(`refuses an app acting for the Owner with ${scopes.join(', ')}`, async function () {
        const id = await installation(scopes);
        const { token } = await tokenFor(id, { clientScopes: scopes });
        const postsBefore = await knex()('posts').count({ count: '*' });
        const ownerBefore = await knex()('users').where({ id: owner().id }).first();

        for (const { method, paths } of blocked) {
          for (const path of paths) {
            const send = (agent as any)[method].bind(agent);
            const { body } = await send(path)
              .header('Authorization', bearer(token))
              .expectStatus(403);
            assert.equal(
              body.errors[0].message,
              'Apps are not allowed to access this endpoint',
              `${method} ${path}`,
            );
          }
        }

        assert.deepEqual(await knex()('posts').count({ count: '*' }), postsBefore);
        assert.deepEqual(await knex()('users').where({ id: owner().id }).first(), ownerBefore);
      });
    }
  });

  describe('before a route does any work', function () {
    const editing = () => ({
      presence: [{ editing: { id: fixtureManager.get('posts', 0).id, type: 'post' } }],
    });
    // A file each route's own upload checks would refuse with a different error
    const notAnUpload = (route: string) =>
      route.startsWith('images')
        ? join(__dirname, '../../utils/fixtures/csv/valid-members-import.csv')
        : __filename;

    beforeEach(resetRateLimits);
    afterEach(resetRateLimits);

    it('refuses an app on presence without spending the staff user’s budget', async function () {
      const id = await installation(['post:browse']);
      const { token } = await tokenFor(id, { clientScopes: ['post:browse'] });

      // More than the user's budget of 12 every 10 seconds
      for (let i = 0; i < 15; i++) {
        const { body } = await agent
          .post('presence/')
          .header('Authorization', bearer(token))
          .body(editing())
          .expectStatus(403);
        assert.equal(body.errors[0].type, 'NoPermissionError');
      }

      await signInOwner();
      await agent.post('presence/').body(editing()).expectStatus(200);
    });

    it('refuses an app on upgrades without spending the staff user’s budget', async function () {
      const id = await installation(['post:browse']);
      const { token } = await tokenFor(id, { clientScopes: ['post:browse'] });
      const upgrade = {
        upgrades: [
          {
            component: 'ghost',
            to_version: '6.71.0',
            idempotency_key: 'f76543a0-c052-45e8-b020-03c86a809b93',
          },
        ],
      };

      // More than the user's budget of 3 a minute
      for (let i = 0; i < 5; i++) {
        const { body } = await agent
          .post('upgrades/')
          .header('Authorization', bearer(token))
          .body(upgrade)
          .expectStatus(403);
        assert.equal(body.errors[0].type, 'NoPermissionError');
      }

      await signInOwner();
      // Unsupported without an upgrade adapter, but not limited
      const { body } = await agent.post('upgrades/').body(upgrade).expectStatus(409);
      assert.equal(body.errors[0].code, 'UPGRADE_UNSUPPORTED');
    });

    for (const { route, field } of [
      { route: 'images/upload/', field: 'file' },
      { route: 'members/upload/', field: 'membersfile' },
    ]) {
      it(`refuses an app on ${route} before reading the upload`, async function () {
        const id = await installation(['post:browse']);
        const { token } = await tokenFor(id, { clientScopes: ['post:browse'] });

        const { body } = await agent
          .post(route)
          .header('Authorization', bearer(token))
          .attach(field, notAnUpload(route))
          .expectStatus(403);
        assert.equal(body.errors[0].type, 'NoPermissionError');
      });
    }

    it('lets an app with the scope through to the route', async function () {
      const id = await installation(['member:add']);
      const { token } = await tokenFor(id, { clientScopes: ['member:add'] });

      // The upload's own check now answers
      const { body } = await agent
        .post('members/upload/')
        .header('Authorization', bearer(token))
        .attach('membersfile', notAnUpload('members/upload/'))
        .expectStatus(415);
      assert.equal(body.errors[0].type, 'UnsupportedMediaTypeError');
    });
  });

  describe('on routes with no standard permission check', function () {
    // Each acts for the Owner in ways no scope covers
    const refusedRoutes = (ownerId: string) => [
      {
        method: 'put',
        path: 'authentication/setup/',
        body: {
          setup: [
            {
              name: 'Taken Over',
              email: 'taken-over@example.com',
              password: 'Sl1m3rson99-taken!',
              blogTitle: 'Taken over',
            },
          ],
        },
      },
      { method: 'get', path: `users/${ownerId}/token/` },
      { method: 'put', path: `users/${ownerId}/token/` },
      { method: 'get', path: 'featurebase/token/' },
      { method: 'post', path: 'slack/test/' },
      { method: 'delete', path: 'session/' },
      // Mounts a method the API doesn't have
      { method: 'get', path: 'config/featurebase/' },
    ];

    for (const withCookie of [false, true]) {
      it(`refuses an app acting for the Owner${withCookie ? ', with the staff cookie also sent' : ''}`, async function () {
        const id = await installation(['post:browse']);
        const { token } = await tokenFor(id, { clientScopes: ['post:browse'] });
        const signedIn = withCookie ? await signInOwner() : null;
        const ownerBefore = await knex()('users').where({ id: owner().id }).first();
        const staffTokenBefore = await knex()('api_keys').where({ user_id: owner().id }).first();

        for (const { method, path, body } of refusedRoutes(owner().id)) {
          const request = (agent as any)[method](path).header('Authorization', bearer(token));
          const { body: response } = await (body ? request.body(body) : request).expectStatus(403);
          assert.match(response.errors[0].message, /^Apps do not have permission/, path);
        }

        const ownerAfter = await knex()('users').where({ id: owner().id }).first();
        assert.equal(ownerAfter.email, ownerBefore.email);
        assert.equal(ownerAfter.password, ownerBefore.password);
        assert.deepEqual(
          await knex()('api_keys').where({ user_id: owner().id }).first(),
          staffTokenBefore,
        );
        if (signedIn) {
          assert.ok(await knex()('user_sessions').where({ id: signedIn.id }).first());
        }
      });
    }

    it('still signs a staff user out', async function () {
      const signedIn = await signInOwner();

      await agent.delete('session/').expectStatus(204);
      assert.equal(await knex()('user_sessions').where({ id: signedIn.id }).first(), undefined);
    });
  });

  // A token for a staff user comes only from a staff session, never from an app's own token
  describe('on the app session routes', function () {
    const routes = [
      { name: 'renewing a token', path: (id: string) => `apps/installations/${id}/tokens/` },
      { name: 'starting a session', path: (id: string) => `apps/installations/${id}/sessions/` },
    ];

    for (const { name, path } of routes) {
      it(`refuses an app ${name} for itself`, async function () {
        const id = await installation(['post:browse']);
        const { token } = await tokenFor(id, { clientScopes: ['post:browse'] });
        const { revision } = await knex()('app_installations').where({ id }).first();

        const { body } = await agent
          .post(path(id))
          .header('Authorization', bearer(token))
          .body({ app_tokens: [{ revision }] })
          .expectStatus(403);

        assert.equal(body.errors[0].type, 'NoPermissionError');
        assert.equal((await knex()('oauth_access_tokens')).length, 1);
      });
    }
  });
});
