import assert from 'node:assert/strict';
import * as security from '@tryghost/security';
import { knex } from '../../../core/server/data/db';
import config from '../../../core/shared/config';
import urlUtils from '../../../core/shared/url-utils';
import { createAuth } from '../../../core/server/auth/better-auth/create-auth';
import {
  APP_OAUTH_MOUNTED_PATHS,
  appOAuthPlugins,
} from '../../../core/server/auth/better-auth/plugins/apps';

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
    await knex('oauth_clients').del();
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
  });

  describe('with apps', function () {
    it('registers no OpenID scope, so it serves no OpenID configuration', async function () {
      const auth = build({ apps: true });

      await assert.rejects(auth.api.getOpenIdConfig(), { statusCode: 404 });
    });

    it('serves none of the provider or jwt routes but /jwks, signed in or not', async function () {
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
    });

    it('serves the public signing keys on /jwks to anyone', async function () {
      const auth = build({ apps: true });
      const { cookie } = await signIn(auth);

      const anonymous = await auth.handler(new Request(url('/jwks')));
      const signedIn = await auth.handler(new Request(url('/jwks'), { headers: { cookie } }));

      for (const response of [anonymous, signedIn]) {
        assert.equal(response.status, 200);
        const body = await response.json();
        assert.deepEqual(Object.keys(body), ['keys']);
        for (const key of body.keys) {
          assert.equal(key.d, undefined, 'a private key part');
        }
      }
    });

    it('leaves no provider or jwt route mounted that is neither disabled nor deliberately kept', async function () {
      const auth = build({ apps: true });
      const disabledPaths: string[] = auth.options.disabledPaths ?? [];

      assert.deepEqual(APP_OAUTH_MOUNTED_PATHS, ['/jwks']);
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
  });
});
