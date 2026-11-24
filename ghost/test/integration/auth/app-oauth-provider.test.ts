import assert from 'node:assert/strict';
import * as security from '@tryghost/security';
import { knex } from '../../../core/server/data/db';
import config from '../../../core/shared/config';
import urlUtils from '../../../core/shared/url-utils';
import { createAuth } from '../../../core/server/auth/better-auth/create-auth';

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

      const routes = [
        ['POST', '/oauth2/token'],
        ['GET', '/oauth2/authorize'],
        ['POST', '/oauth2/introspect'],
        ['POST', '/oauth2/revoke'],
        ['GET', '/token'],
        ['GET', '/jwks'],
        ['GET', '/.well-known/oauth-authorization-server'],
      ];
      for (const [method, path] of routes) {
        const response = await auth.handler(
          new Request(url(path), {
            method,
            headers: {
              cookie,
              origin,
              ...(method === 'POST' ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
            },
            ...(method === 'POST' ? { body: 'token=x' } : {}),
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

    it('serves no authorization server metadata, signed in or not', async function () {
      const auth = build({ apps: true });
      const { cookie } = await signIn(auth);

      for (const path of [
        '/.well-known/oauth-authorization-server',
        '/.well-known/openid-configuration',
      ]) {
        for (const headers of [{}, { cookie }]) {
          const response = await auth.handler(new Request(url(path), { headers }));
          assert.equal(response.status, 404, path);
        }
      }
    });

    it('supports none of the standard grants', async function () {
      const auth = build({ apps: true });

      for (const grantType of ['authorization_code', 'client_credentials', 'refresh_token']) {
        const response = await auth.handler(
          new Request(url('/oauth2/token'), {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded', origin },
            body: new URLSearchParams({
              grant_type: grantType,
              client_id: 'any',
              client_secret: 'any',
              code: 'any',
              refresh_token: 'any',
            }).toString(),
          }),
        );
        assert.equal(response.status, 400, grantType);
        assert.equal((await response.json()).error, 'unsupported_grant_type', grantType);
      }
      const authorize = await auth.handler(
        new Request(url('/oauth2/authorize?response_type=code&client_id=any')),
      );
      assert.equal(authorize.status, 404);
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
