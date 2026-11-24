import assert from 'node:assert/strict';
import * as security from '@tryghost/security';
import { betterAuth } from 'better-auth/minimal';
import { jwt } from 'better-auth/plugins';
import { oauthProvider } from '@better-auth/oauth-provider';
import ObjectId from 'bson-objectid';
import { knex } from '../../../core/server/data/db';
import config from '../../../core/shared/config';
import urlUtils from '../../../core/shared/url-utils';
import { createAuth } from '../../../core/server/auth/better-auth/create-auth';
import {
  APP_OAUTH_MOUNTED_PATHS,
  appOAuthPlugins,
} from '../../../core/server/auth/better-auth/plugins/apps';
import { createKnexAdapter } from '../../../core/server/auth/better-auth/knex-adapter';
import {
  generateGhostId,
  ghostJwtSchema,
  ghostModelOptions,
} from '../../../core/server/auth/better-auth/ghost-models';
import { appProviderOptions } from '../../../core/server/auth/better-auth/plugins/apps';
import {
  APP_SESSION_GRANT,
  appClientId,
  appUserClient,
} from '../../../core/server/auth/better-auth/plugins/app-clients';
import { APP_TOKEN_PREFIX } from '../../../core/server/auth/app-token-prefix';
import { appTokensAuth, createAppTokens } from '../../../core/server/auth/better-auth/app-tokens';

// @ts-expect-error Test utilities do not have type definitions.
import testUtils from '../../utils';

const allow = () => ({ consume: async () => ({ allowed: true as const }), reset: async () => {} });
const limiters = {
  globalBlock: allow,
  globalReset: allow,
  userLogin: allow,
  userReset: allow,
  sendVerificationCode: allow,
  userVerification: allow,
  verificationEmail: allow,
};

function build({ apps }: { apps: boolean }) {
  return createAuth({
    db: knex,
    secret: 'a'.repeat(64),
    sessionMaxAgeMs: config.get('admin:sessionMaxAgeMs'),
    urlUtils,
    password: security.password,
    logger: { debug() {}, info() {}, warn() {}, error() {} },
    limiters,
    sendPasswordResetEmail: async () => {},
    isStaffDeviceVerificationEnabled: () => false,
    isEmailMfaRequired: () => false,
    sendDeviceVerificationCode: async () => {},
    getRequestOrigin: (headers) => headers.get('origin'),
    apps,
  });
}

type AppRoute = { method: string; path: string; serverOnly: boolean };

/** Every route the provider and jwt plugins declare, one per method */
function appRoutes(): AppRoute[] {
  return appOAuthPlugins({ adminOrigin: urlUtils.getAdminOrigin() }).flatMap((plugin) =>
    Object.values(plugin.endpoints).flatMap(({ path, options }) => {
      if (!path) {
        return [];
      }
      const methods = Array.isArray(options.method) ? options.method : [options.method];
      const serverOnly = options.metadata?.SERVER_ONLY === true;
      return methods.map((method: string) => ({ method, path, serverOnly }));
    }),
  );
}

describe("Better Auth's OAuth provider for apps", function () {
  const owner = testUtils.DataGenerator.Content.users[0];
  const origin = urlUtils.getAdminOrigin();
  const url = (path: string) => `${origin}${urlUtils.getSubdir()}/ghost/api/admin/auth${path}`;

  beforeAll(testUtils.teardownDb);
  beforeAll(testUtils.setup('users:roles'));

  afterEach(async function () {
    await knex('oauth_access_tokens').del();
    await knex('oauth_clients').del();
    await knex('oauth_jwks').del();
    await knex('user_sessions').del();
  });

  async function signIn(auth: ReturnType<typeof build>) {
    const response = await auth.handler(
      new Request(url('/sign-in/email'), {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin },
        body: JSON.stringify({ email: owner.email, password: owner.password }),
      }),
    );
    assert.equal(response.status, 200);
    return {
      response,
      cookie: response.headers
        .getSetCookie()
        .map((c) => c.split(';')[0])
        .join('; '),
    };
  }

  async function staffSession(auth: ReturnType<typeof build>) {
    const { session } = await auth.api.createVerifiedSession({
      body: { userId: owner.id, origin },
    });
    return session;
  }

  const installationId = () => new ObjectId().toHexString();
  const userClientId = (id: string) => appClientId({ installationId: id, kind: 'user' });

  async function issue(
    auth: ReturnType<typeof build>,
    {
      id,
      sessionId,
      scopes = ['post:browse'],
    }: { id: string; sessionId: string; scopes?: string[] },
  ) {
    const { token } = await auth.api.issueAppUserToken({
      body: { installationId: id, userId: owner.id, sessionId, scopes },
    });
    assert.ok(token);
    return token;
  }

  const validate = async (auth: ReturnType<typeof build>, token: string) =>
    (await auth.api.validateAppToken({ body: { token } })).token;

  const tokenCount = async () =>
    Number((await knex('oauth_access_tokens').count({ count: '*' }))[0].count);

  /**
   * Cuts every token row loose from its staff session, as if tokens or sessions were stored
   * apart, so revoking sessions can't cascade to them and only an explicit delete removes them.
   */
  async function unbindTokens() {
    await knex('oauth_access_tokens').update({ session_id: null });
    assert.ok((await tokenCount()) > 0);
  }

  describe('without apps', function () {
    it('serves none of the provider routes and sends no JWT on session reads', async function () {
      const auth = build({ apps: false });
      const { cookie } = await signIn(auth);

      for (const { method, path } of appRoutes()) {
        const response = await auth.handler(
          new Request(url(path.replace(/:[^/]+/g, 'x')), {
            method,
            headers: {
              cookie,
              origin,
              ...(method === 'GET' ? {} : { 'content-type': 'application/json' }),
            },
            ...(method === 'GET' ? {} : { body: '{}' }),
          }),
        );
        assert.equal(response.status, 404, `${method} ${path}`);
      }
      const session = await auth.handler(new Request(url('/get-session'), { headers: { cookie } }));
      assert.equal(session.status, 200);
      assert.equal(session.headers.get('set-auth-jwt'), null);
    });

    it('says app tokens need a restart, and issues, validates and writes nothing', async function () {
      const auth = build({ apps: false });
      const tokens = createAppTokens({
        isBetterAuth: () => true,
        getAuth: () => appTokensAuth(auth),
      });
      const id = installationId();
      const session = await staffSession(auth);

      assert.equal(tokens.availability(), 'needs_restart');
      await tokens.reconcileClient({ id, active: true, scopes: ['post:browse'] });
      await assert.rejects(
        tokens.issue({ installationId: id, userId: owner.id, sessionId: session.id, scopes: [] }),
        { statusCode: 500 },
      );
      assert.equal(await tokens.validate(`${APP_TOKEN_PREFIX}unknown`), null);
      assert.equal((await knex('oauth_clients').count({ count: '*' }))[0].count, 0);
    });

    it('revokes sessions without touching app tokens', async function () {
      const auth = build({ apps: false });
      await staffSession(auth);

      await auth.api.revokeUserSessions({ body: { userId: owner.id } });
      await auth.api.revokeAllSessions();

      assert.equal((await knex('user_sessions').count({ count: '*' }))[0].count, 0);
    });
  });

  describe('with apps', function () {
    it('says app tokens are ready', async function () {
      const auth = build({ apps: true });
      const tokens = createAppTokens({
        isBetterAuth: () => true,
        getAuth: () => appTokensAuth(auth),
      });

      assert.equal(tokens.availability(), 'ready');
    });

    it('registers no OpenID scope, so it serves no OpenID configuration', async function () {
      const auth = build({ apps: true });

      await assert.rejects(auth.api.getOpenIdConfig(), { statusCode: 404 });
    });

    it('serves none of the provider or jwt routes, signed in or not', async function () {
      const auth = build({ apps: true });
      const { cookie } = await signIn(auth);

      const disabled = appRoutes().filter(({ path }) => !APP_OAUTH_MOUNTED_PATHS.includes(path));
      assert.ok(disabled.length > 0);
      for (const { method, path } of disabled) {
        const requestPath = path.replace(/:[^/]+/g, 'x');
        for (const variant of [requestPath, `${requestPath}/`, requestPath.toUpperCase()]) {
          for (const headers of [{}, { cookie }] as Array<Record<string, string>>) {
            const response = await auth.handler(
              new Request(url(variant), {
                method,
                headers: {
                  origin,
                  ...headers,
                  ...(method === 'GET' ? {} : { 'content-type': 'application/json' }),
                },
                ...(method === 'GET' ? {} : { body: '{}' }),
              }),
            );
            assert.equal(response.status, 404, `${method} ${variant}`);
          }
        }
      }
      assert.equal((await knex('oauth_clients').count({ count: '*' }))[0].count, 0);
      assert.equal((await knex('oauth_jwks').count({ count: '*' }))[0].count, 0);
    });

    it('leaves no provider or jwt route mounted that is neither disabled nor deliberately kept', async function () {
      const auth = build({ apps: true });
      const disabledPaths: string[] = auth.options.disabledPaths ?? [];

      assert.deepEqual(APP_OAUTH_MOUNTED_PATHS, [] as string[]);
      for (const { path, serverOnly } of appRoutes()) {
        if (serverOnly || APP_OAUTH_MOUNTED_PATHS.includes(path)) {
          continue;
        }
        // disabledPaths compares whole paths, so it can't disable a route with a parameter
        assert.ok(!path.includes(':'), `${path} takes a parameter`);
        assert.ok(disabledPaths.includes(path), `${path} is mounted`);
      }
    });

    it('supports none of the standard grants', async function () {
      const auth = build({ apps: true });

      for (const grantType of ['authorization_code', 'client_credentials', 'refresh_token']) {
        await assert.rejects(
          auth.api.oauth2Token({
            body: {
              grant_type: grantType,
              client_id: 'any',
              client_secret: 'any',
              code: 'any',
              refresh_token: 'any',
            },
          } as never),
          (err: { body?: { error?: string } }) => err.body?.error === 'unsupported_grant_type',
          grantType,
        );
      }
    });

    it('sends no JWT on session reads and serves no session JWT', async function () {
      const auth = build({ apps: true });
      const { cookie } = await signIn(auth);

      const session = await auth.handler(new Request(url('/get-session'), { headers: { cookie } }));
      const jwtToken = await auth.handler(new Request(url('/token'), { headers: { cookie } }));

      assert.equal(session.status, 200);
      assert.equal(session.headers.get('set-auth-jwt'), null);
      assert.equal(jwtToken.status, 404);
    });

    it('writes an unowned, lowercase user client, and repeating it changes nothing', async function () {
      const auth = build({ apps: true });
      const id = installationId();
      const body = { installationId: id, active: true, scopes: ['post:browse', 'tag:browse'] };

      await auth.api.reconcileAppClient({ body });
      const first = await knex('oauth_clients')
        .where({ client_id: userClientId(id) })
        .first();
      await auth.api.reconcileAppClient({ body });
      const rows = await knex('oauth_clients');

      assert.equal(rows.length, 1);
      assert.deepEqual(rows[0], first);
      assert.equal(first.client_id, first.client_id.toLowerCase());
      assert.equal(first.user_id, null);
      assert.equal(first.disabled, 0);
      assert.deepEqual(JSON.parse(first.redirect_uris), []);
      assert.deepEqual(JSON.parse(first.scopes), ['post:browse', 'tag:browse']);
    });

    it('updates the client when the installation changes', async function () {
      const auth = build({ apps: true });
      const id = installationId();

      await auth.api.reconcileAppClient({
        body: { installationId: id, active: true, scopes: ['post:browse'] },
      });
      await auth.api.reconcileAppClient({
        body: { installationId: id, active: false, scopes: ['tag:browse'] },
      });
      const row = await knex('oauth_clients')
        .where({ client_id: userClientId(id) })
        .first();

      assert.equal(row.disabled, 1);
      assert.deepEqual(JSON.parse(row.scopes), ['tag:browse']);
    });

    it("keeps the client row in the provider's own layout", async function () {
      // The provider's create-client, on the same tables, with what Ghost's client sets
      const reference = betterAuth({
        baseURL: origin,
        basePath: `${urlUtils.getSubdir()}/ghost/api/admin/auth`,
        secret: 'a'.repeat(64),
        database: createKnexAdapter({ db: knex }),
        ...ghostModelOptions,
        emailAndPassword: {
          enabled: true,
          password: {
            hash: (password) => security.password.hash(password),
            verify: ({ hash, password }) => security.password.compare(password, hash),
          },
        },
        plugins: [
          jwt({ schema: ghostJwtSchema, disableSettingJwtHeader: true }),
          oauthProvider({
            ...appProviderOptions({ adminOrigin: origin }),
            scopes: ['post:browse'],
            clientPrivileges: () => true,
          }),
        ],
        telemetry: { enabled: false },
        advanced: { database: { generateId: generateGhostId } },
      });
      const { headers } = await reference.api.signInEmail({
        body: { email: owner.email, password: owner.password },
        returnHeaders: true,
      });
      const cookie = headers
        .getSetCookie()
        .map((c) => c.split(';')[0])
        .join('; ');
      const id = installationId();
      const ghostClient = appUserClient({ installationId: id, active: true, scopes: [] });
      const created = await reference.api.adminCreateOAuthClient({
        headers: new Headers({ cookie }),
        body: {
          // The provider only registers grants its token endpoint serves
          grant_types: ['authorization_code'],
          response_types: ['code'],
          redirect_uris: ['https://app.example/callback'],
          scope: 'post:browse',
          token_endpoint_auth_method: 'none',
          application_type: 'web',
          skip_consent: true,
          enable_end_session: false,
          require_pkce: true,
          metadata: ghostClient.metadata,
        },
      });
      await build({ apps: true }).api.reconcileAppClient({
        body: { installationId: id, active: true, scopes: ['post:browse'] },
      });

      const providerRow = await knex('oauth_clients')
        .where({ client_id: created.client_id })
        .first();
      const ghostRow = await knex('oauth_clients')
        .where({ client_id: ghostClient.clientId })
        .first();
      const shape = (value: unknown) => {
        if (value === null || value === undefined) {
          return 'null';
        }
        if (typeof value === 'string' && /^[[{]/.test(value)) {
          return Array.isArray(JSON.parse(value)) ? 'array' : 'object';
        }
        return typeof value;
      };
      const shapes = (row: Record<string, unknown>) =>
        Object.fromEntries(Object.entries(row).map(([column, value]) => [column, shape(value)]));

      // Ghost's client is the only unowned one
      assert.equal(providerRow.user_id, owner.id);
      assert.deepEqual(
        { ...shapes(ghostRow), user_id: 'string' },
        { ...shapes(providerRow), user_id: 'string' },
      );
      assert.deepEqual(JSON.parse(ghostRow.metadata), JSON.parse(providerRow.metadata));
    });

    it('issues a prefixed, opaque user token for an hour, with no refresh or ID token', async function () {
      const auth = build({ apps: true });
      const id = installationId();
      const session = await staffSession(auth);
      await auth.api.reconcileAppClient({
        body: { installationId: id, active: true, scopes: ['post:browse'] },
      });

      const before = Date.now();
      const token = await issue(auth, { id, sessionId: session.id });
      const rows = await knex('oauth_access_tokens');
      const validated = await validate(auth, token.accessToken);

      assert.ok(token.accessToken.startsWith(APP_TOKEN_PREFIX));
      assert.equal(rows.length, 1);
      assert.equal(rows[0].session_id, session.id);
      assert.equal(rows[0].user_id, owner.id);
      // Stored hashed
      assert.notEqual(rows[0].token, token.accessToken.slice(APP_TOKEN_PREFIX.length));
      assert.equal(
        await knex('oauth_refresh_tokens')
          .count({ count: '*' })
          .first()
          .then((r) => r?.count),
        0,
      );
      assert.equal(token.expiresIn, 3600);
      const lifetime = new Date(rows[0].expires_at).getTime() - before;
      assert.ok(lifetime > 3590_000 && lifetime <= 3601_000, `lifetime ${lifetime}`);
      assert.deepEqual(validated, {
        installationId: id,
        userId: owner.id,
        session: { id: session.id, expiresAt: new Date(session.expiresAt), origin },
      });
    });

    it("holds a token to the client's scopes", async function () {
      const auth = build({ apps: true });
      const id = installationId();
      const session = await staffSession(auth);
      await auth.api.reconcileAppClient({
        body: { installationId: id, active: true, scopes: ['post:browse'] },
      });

      const token = await issue(auth, {
        id,
        sessionId: session.id,
        scopes: ['post:browse', 'post:destroy', 'openid', 'offline_access'],
      });

      const row = await knex('oauth_access_tokens').first();
      assert.ok(await validate(auth, token.accessToken));
      assert.deepEqual(JSON.parse(row.scopes), ['post:browse']);
    });

    it('issues nothing for a disabled or missing client', async function () {
      const auth = build({ apps: true });
      const id = installationId();
      const session = await staffSession(auth);
      const body = { installationId: id, userId: owner.id, sessionId: session.id, scopes: [] };

      assert.deepEqual(await auth.api.issueAppUserToken({ body }), {
        token: null,
        refused: 'client_unavailable',
      });
      await auth.api.reconcileAppClient({
        body: { installationId: id, active: false, scopes: ['post:browse'] },
      });
      assert.deepEqual(await auth.api.issueAppUserToken({ body }), {
        token: null,
        refused: 'client_unavailable',
      });
    });

    it('issues nothing for a user who is gone', async function () {
      const auth = build({ apps: true });
      const id = installationId();
      await auth.api.reconcileAppClient({
        body: { installationId: id, active: true, scopes: ['post:browse'] },
      });

      assert.deepEqual(
        await auth.api.issueAppUserToken({
          body: {
            installationId: id,
            userId: new ObjectId().toHexString(),
            sessionId: (await staffSession(auth)).id,
            scopes: [],
          },
        }),
        { token: null, refused: 'user_not_found' },
      );
    });

    it('refuses a token once its session, client or installation is gone', async function () {
      const auth = build({ apps: true });
      const id = installationId();
      await auth.api.reconcileAppClient({
        body: { installationId: id, active: true, scopes: ['post:browse'] },
      });

      const signedOut = await issue(auth, { id, sessionId: (await staffSession(auth)).id });
      await knex('user_sessions').del();
      assert.equal(await validate(auth, signedOut.accessToken), null);

      const deactivated = await issue(auth, { id, sessionId: (await staffSession(auth)).id });
      await auth.api.reconcileAppClient({
        body: { installationId: id, active: false, scopes: ['post:browse'] },
      });
      assert.equal(await validate(auth, deactivated.accessToken), null);
      assert.equal((await knex('oauth_access_tokens').count({ count: '*' }))[0].count, 0);
    });

    it('refuses a token once its staff session is unverified or has expired', async function () {
      const auth = build({ apps: true });
      const id = installationId();
      await auth.api.reconcileAppClient({
        body: { installationId: id, active: true, scopes: ['post:browse'] },
      });
      const session = await staffSession(auth);
      const token = await issue(auth, { id, sessionId: session.id });
      assert.ok(await validate(auth, token.accessToken));

      await knex('user_sessions').where({ id: session.id }).update({ verified: false });
      assert.equal(await validate(auth, token.accessToken), null);

      await knex('user_sessions')
        .where({ id: session.id })
        .update({ verified: true, expires_at: new Date(Date.now() - 1000) });
      assert.equal(await validate(auth, token.accessToken), null);
    });

    it("refuses a token bound to another user's staff session", async function () {
      const auth = build({ apps: true });
      const id = installationId();
      const editor = testUtils.DataGenerator.Content.users[2];
      await auth.api.reconcileAppClient({
        body: { installationId: id, active: true, scopes: ['post:browse'] },
      });
      const { session } = await auth.api.createVerifiedSession({
        body: { userId: editor.id, origin },
      });

      const token = await issue(auth, { id, sessionId: session.id });

      assert.equal(await validate(auth, token.accessToken), null);
    });

    it("deletes a user's tokens across every app with their staff sessions", async function () {
      const auth = build({ apps: true });
      const [first, second] = [installationId(), installationId()];
      const session = await staffSession(auth);
      for (const id of [first, second]) {
        await auth.api.reconcileAppClient({
          body: { installationId: id, active: true, scopes: ['post:browse'] },
        });
      }
      const firstToken = await issue(auth, { id: first, sessionId: session.id });
      const secondToken = await issue(auth, { id: second, sessionId: session.id });
      assert.ok(await validate(auth, firstToken.accessToken));
      await unbindTokens();

      await auth.api.revokeUserSessions({ body: { userId: owner.id } });

      assert.equal(await validate(auth, firstToken.accessToken), null);
      assert.equal(await validate(auth, secondToken.accessToken), null);
      assert.equal(await tokenCount(), 0);
    });

    it("deletes a user's app tokens itself, not through their staff sessions", async function () {
      const auth = build({ apps: true });
      const id = installationId();
      const editor = testUtils.DataGenerator.Content.users[2];
      await auth.api.reconcileAppClient({
        body: { installationId: id, active: true, scopes: ['post:browse'] },
      });
      await issue(auth, { id, sessionId: (await staffSession(auth)).id });
      const { session: editorSession } = await auth.api.createVerifiedSession({
        body: { userId: editor.id, origin },
      });
      await auth.api.issueAppUserToken({
        body: { installationId: id, userId: editor.id, sessionId: editorSession.id, scopes: [] },
      });
      await unbindTokens();

      await auth.api.revokeUserSessions({ body: { userId: owner.id } });

      const left = await knex('oauth_access_tokens').select('user_id');
      assert.deepEqual(
        left.map((row) => row.user_id),
        [editor.id],
      );
    });

    it('deletes every app token with every staff session', async function () {
      const auth = build({ apps: true });
      const id = installationId();
      await auth.api.reconcileAppClient({
        body: { installationId: id, active: true, scopes: ['post:browse'] },
      });
      await issue(auth, { id, sessionId: (await staffSession(auth)).id });
      await unbindTokens();

      await auth.api.revokeAllSessions();

      assert.equal(await tokenCount(), 0);
    });

    it("deletes the user's app tokens when they change their password natively", async function () {
      const auth = build({ apps: true });
      const id = installationId();
      const { cookie } = await signIn(auth);
      await auth.api.reconcileAppClient({
        body: { installationId: id, active: true, scopes: ['post:browse'] },
      });
      await issue(auth, { id, sessionId: (await staffSession(auth)).id });
      await unbindTokens();

      const response = await auth.handler(
        new Request(url('/change-password'), {
          method: 'POST',
          headers: { 'content-type': 'application/json', origin, cookie },
          body: JSON.stringify({ currentPassword: owner.password, newPassword: owner.password }),
        }),
      );

      assert.equal(response.status, 200);
      assert.equal(await tokenCount(), 0);
    });

    it("refuses a token whose client doesn't say it is that installation's user client", async function () {
      const auth = build({ apps: true });
      const [id, other] = [installationId(), installationId()];
      await auth.api.reconcileAppClient({
        body: { installationId: id, active: true, scopes: ['post:browse'] },
      });
      const token = await issue(auth, { id, sessionId: (await staffSession(auth)).id });

      await knex('oauth_clients')
        .where({ client_id: userClientId(id) })
        .update({
          metadata: JSON.stringify({ ghost_app_installation_id: other, ghost_app_client: 'user' }),
        });

      assert.equal(await validate(auth, token.accessToken), null);
      assert.deepEqual(
        await auth.api.issueAppUserToken({
          body: {
            installationId: id,
            userId: owner.id,
            sessionId: (await staffSession(auth)).id,
            scopes: [],
          },
        }),
        { token: null, refused: 'client_unavailable' },
      );
    });

    it('refuses an unknown or unprefixed token', async function () {
      const auth = build({ apps: true });

      assert.equal(await validate(auth, `${APP_TOKEN_PREFIX}unknown`), null);
      assert.equal(await validate(auth, 'not-a-token'), null);
    });

    it("shuts the user client out of the provider's endpoints", async function () {
      const auth = build({ apps: true });
      const id = installationId();
      const { cookie } = await signIn(auth);
      await auth.api.reconcileAppClient({
        body: { installationId: id, active: true, scopes: ['post:browse'] },
      });
      const clientId = userClientId(id);

      const authorize = await auth.handler(
        new Request(
          url(
            `/oauth2/authorize?${new URLSearchParams({
              client_id: clientId,
              response_type: 'code',
              scope: 'post:browse',
              code_challenge: 'a'.repeat(43),
              code_challenge_method: 'S256',
              prompt: 'none',
            })}`,
          ),
          { headers: { cookie, accept: 'application/json' } },
        ),
      );
      const token = await auth.handler(
        new Request(url('/oauth2/token'), {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: clientId,
            scope: 'post:browse',
          }),
        }),
      );

      // Sent to the provider's error page, not to the app with a code
      const { url: redirect } = await authorize.json();
      assert.equal(new URL(redirect).searchParams.get('error'), 'unauthorized_client');
      assert.equal(new URL(redirect).searchParams.has('code'), false);
      assert.ok(token.status >= 400, `token answered ${token.status}`);
      assert.equal((await knex('oauth_access_tokens').count({ count: '*' }))[0].count, 0);
    });

    it('refuses the user client’s own grant at the token endpoint', async function () {
      const auth = build({ apps: true });
      const id = installationId();
      await auth.api.reconcileAppClient({
        body: { installationId: id, active: true, scopes: ['post:browse'] },
      });

      const response = await auth.handler(
        new Request(url('/oauth2/token'), {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: APP_SESSION_GRANT,
            client_id: userClientId(id),
            scope: 'post:browse',
          }),
        }),
      );

      assert.equal(response.status, 400);
      assert.equal((await response.json()).error, 'unsupported_grant_type');
      assert.equal((await knex('oauth_access_tokens').count({ count: '*' }))[0].count, 0);
    });

    it('registers no clients dynamically, signed in or not', async function () {
      const auth = build({ apps: true });
      const { cookie } = await signIn(auth);
      const register = (headers: Record<string, string>) =>
        auth.handler(
          new Request(url('/oauth2/register'), {
            method: 'POST',
            headers: { 'content-type': 'application/json', origin, ...headers },
            body: JSON.stringify({
              redirect_uris: ['https://app.example/callback'],
              token_endpoint_auth_method: 'none',
            }),
          }),
        );

      for (const response of [await register({}), await register({ cookie })]) {
        assert.ok(response.status >= 400, `register answered ${response.status}`);
      }
      assert.equal((await knex('oauth_clients').count({ count: '*' }))[0].count, 0);
    });
  });
});
