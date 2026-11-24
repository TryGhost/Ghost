import assert from 'node:assert/strict';
import sinon from 'sinon';
import { generateTestAppKeys, type TestAppKeys } from '../../utils/app-identity';
import { insertTestInstallation } from '../../utils/app-installations';
import { agentProvider, fixtureManager, mockManager } from '../../utils/e2e-framework';
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
  };
  let keys: TestAppKeys;
  const knex = () => models.Base.knex;
  const appTokens = () => require('../../../core/server/auth').appTokens;
  const owner = () => fixtureManager.get('users', 0);

  const installation = (scopes: string[], status: 'active' | 'suspended' = 'active') =>
    insertTestInstallation(knex(), { scopes, status, keys });

  /**
   * A new verified staff session for the Owner, and the cookies that sign a browser into it.
   * Made directly, as signing in over HTTP is rate limited.
   */
  async function ownerSession() {
    const setCookies: string[] =
      await require('../../../core/server/auth').staffSessions.createVerifiedSession(owner().id);
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
    const session = await ownerSession();
    agent.jar.setCookies(session.setCookies);
    return session;
  }

  /** A user token for the installation, bound to a new staff session of the Owner's. */
  async function tokenFor(
    installationId: string,
    { clientScopes, tokenScopes }: { clientScopes: string[]; tokenScopes?: string[] },
  ) {
    const session = await ownerSession();
    await appTokens().reconcileClient({ id: installationId, active: true, scopes: clientScopes });
    const issued = await appTokens().issue({
      installationId,
      userId: owner().id,
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

    it('allows an app on a route on the allowlist', async function () {
      const id = await installation(['post:browse']);
      const { token } = await tokenFor(id, { clientScopes: ['post:browse'] });

      await agent.get('site/').header('Authorization', bearer(token)).expectStatus(200);
    });
  });
});
