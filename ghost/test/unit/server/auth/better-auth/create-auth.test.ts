import assert from 'node:assert/strict';
import type { Knex } from 'knex';
import {
  assertDatabaseSupported,
  createAuth,
  type CreateAuthDeps,
} from '../../../../../core/server/auth/better-auth/create-auth';

const SESSION_MAX_AGE_MS = 15552000000;

// Building the instance runs no queries
const fakeKnex = () => ({}) as Knex;

// Never blocks; the rate limits have their own tests
const allow = () => ({ consume: async () => ({ allowed: true as const }), reset: async () => {} });
const limiters = { globalBlock: allow, globalReset: allow, userLogin: allow, userReset: allow };

function deps({
  siteUrl = 'https://example.com/',
  adminUrl,
}: { siteUrl?: string; adminUrl?: string } = {}): CreateAuthDeps {
  const subdir = new URL(siteUrl).pathname.replace(/\/$/, '');
  return {
    db: fakeKnex(),
    secret: 'a'.repeat(64),
    sessionMaxAgeMs: SESSION_MAX_AGE_MS,
    urlUtils: {
      getAdminOrigin: () => new URL(adminUrl ?? siteUrl).origin,
      getSubdir: () => subdir,
      isSSL: (url) => url.startsWith('https://'),
    },
    password: {
      hash: async (password) => `hashed:${password}`,
      compare: async (password, hash) => hash === `hashed:${password}`,
    },
    logger: { debug() {}, info() {}, warn() {}, error() {} },
    limiters,
    sendPasswordResetEmail: async () => {},
  };
}

describe('createAuth', function () {
  it('serves under the subdirectory on a subdirectory install', async function () {
    const auth = createAuth(deps({ siteUrl: 'https://example.com/blog/' }));
    const context = await auth.$context;

    assert.equal(context.baseURL, 'https://example.com/blog/ghost/api/admin/auth');
    assert.deepEqual(new Set(context.trustedOrigins), new Set(['https://example.com']));
    assert.equal(context.authCookies.sessionToken.attributes.path, '/blog/ghost');

    // Ghost mounts at the subdirectory, so requests arrive with it in the path
    const ok = await auth.handler(new Request('https://example.com/blog/ghost/api/admin/auth/ok'));
    assert.equal(ok.status, 200);
    const unprefixed = await auth.handler(
      new Request('https://example.com/ghost/api/admin/auth/ok'),
    );
    assert.equal(unprefixed.status, 404);
  });

  it('serves at the root path without a subdirectory', async function () {
    const auth = createAuth(deps());

    assert.equal((await auth.$context).baseURL, 'https://example.com/ghost/api/admin/auth');
    const ok = await auth.handler(new Request('https://example.com/ghost/api/admin/auth/ok'));
    assert.equal(ok.status, 200);
  });

  it('keeps the subdirectory with a separate admin URL', async function () {
    const auth = createAuth(
      deps({ siteUrl: 'https://example.com/blog/', adminUrl: 'https://admin.example.com/blog/' }),
    );

    assert.equal(
      (await auth.$context).baseURL,
      'https://admin.example.com/blog/ghost/api/admin/auth',
    );
  });

  it('uses a separate admin URL when configured', async function () {
    const auth = createAuth(
      deps({ siteUrl: 'https://example.com/', adminUrl: 'https://admin.example.com/' }),
    );
    const context = await auth.$context;

    assert.equal(context.baseURL, 'https://admin.example.com/ghost/api/admin/auth');
    assert.deepEqual(new Set(context.trustedOrigins), new Set(['https://admin.example.com']));
  });

  it('prefixes the session cookie with __Secure- only on HTTPS', async function () {
    const secure = (await createAuth(deps()).$context).authCookies.sessionToken;
    assert.equal(secure.name, '__Secure-ghost-admin-api-session');
    assert.equal(secure.attributes.path, '/ghost');
    assert.equal(secure.attributes.sameSite, 'none');
    assert.equal(secure.attributes.secure, true);
    assert.equal(secure.attributes.httpOnly, true);

    const insecure = (await createAuth(deps({ siteUrl: 'http://localhost:2368/' })).$context)
      .authCookies.sessionToken;
    assert.equal(insecure.name, 'ghost-admin-api-session');
    assert.equal(insecure.attributes.sameSite, 'lax');
    assert.equal(insecure.attributes.secure, false);
  });

  it('follows the admin URL, not the site URL, for cookie security', async function () {
    const httpsAdmin = (
      await createAuth(
        deps({ siteUrl: 'http://example.com/', adminUrl: 'https://admin.example.com/' }),
      ).$context
    ).authCookies.sessionToken;
    assert.equal(httpsAdmin.name, '__Secure-ghost-admin-api-session');
    assert.equal(httpsAdmin.attributes.secure, true);
    assert.equal(httpsAdmin.attributes.sameSite, 'none');

    // A Secure cookie set over plain HTTP would be dropped by the browser
    const httpAdmin = (
      await createAuth(
        deps({ siteUrl: 'https://example.com/', adminUrl: 'http://admin.example.com/' }),
      ).$context
    ).authCookies.sessionToken;
    assert.equal(httpAdmin.name, 'ghost-admin-api-session');
    assert.equal(httpAdmin.attributes.secure, false);
    assert.equal(httpAdmin.attributes.sameSite, 'lax');
  });

  it('expires sessions after admin:sessionMaxAgeMs without refreshing them', async function () {
    const context = await createAuth(deps()).$context;

    assert.equal(context.sessionConfig.expiresIn, SESSION_MAX_AGE_MS / 1000);
    assert.equal(context.authCookies.sessionToken.attributes.maxAge, SESSION_MAX_AGE_MS / 1000);
    assert.equal(context.options.session?.disableSessionRefresh, true);
  });

  it('disables sign-up, account and password changes, social sign-in and telemetry', async function () {
    const { options } = await createAuth(deps()).$context;

    assert.equal(options.emailAndPassword?.disableSignUp, true);
    assert.equal(options.emailAndPassword?.requireEmailVerification, false);
    assert.deepEqual(options.disabledPaths, [
      '/sign-up/email',
      '/update-user',
      '/change-email',
      '/delete-user',
      '/sign-in/social',
      '/change-password',
    ]);
    assert.equal(options.telemetry?.enabled, false);
  });

  it("rate limits on Ghost's limiters in every environment", async function () {
    const { options } = await createAuth(deps()).$context;

    assert.equal(options.rateLimit?.enabled, true);
    assert.equal(typeof options.rateLimit?.customStorage?.consume, 'function');
  });

  it('never exposes the legacy password hash as a user field', async function () {
    const { options } = await createAuth(deps()).$context;

    assert.deepEqual(Object.keys(options.user?.additionalFields ?? {}).sort(), [
      'last_seen',
      'slug',
      'status',
    ]);
  });

  it('uses admin_session_secret whatever the Better Auth secret env vars say', async function () {
    vi.stubEnv('BETTER_AUTH_SECRETS', `1:${'b'.repeat(64)}`);
    vi.stubEnv('BETTER_AUTH_SECRET', 'c'.repeat(64));
    vi.stubEnv('AUTH_SECRET', 'd'.repeat(64));
    try {
      const context = await createAuth(deps()).$context;

      assert.equal(context.secret, 'a'.repeat(64));
      assert.ok(typeof context.secretConfig === 'object');
      assert.deepEqual([...context.secretConfig.keys.values()], ['a'.repeat(64)]);
      assert.equal(context.secretConfig.legacySecret, 'a'.repeat(64));
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('rejects a sign-in from an untrusted origin even under NODE_ENV=test', async function () {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('TEST', 'true');
    try {
      const auth = createAuth(
        deps({ siteUrl: 'https://example.com/', adminUrl: 'https://admin.example.com/' }),
      );
      const response = await auth.handler(
        new Request('https://admin.example.com/ghost/api/admin/auth/sign-in/email', {
          method: 'POST',
          headers: { 'content-type': 'application/json', origin: 'https://example.com' },
          body: JSON.stringify({ email: 'owner@example.com', password: 'password' }),
        }),
      );

      assert.equal(response.status, 403);
      assert.equal((await response.json()).code, 'INVALID_ORIGIN');
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('generates ObjectIds', async function () {
    const context = await createAuth(deps()).$context;
    assert.match(context.generateId({ model: 'session' }) as string, /^[0-9a-f]{24}$/);
  });
});

describe('assertDatabaseSupported', function () {
  it('accepts MySQL with the in-development tables', function () {
    assertDatabaseSupported({ client: 'mysql2', inDevelopmentTables: true });
  });

  for (const client of ['sqlite3', 'better-sqlite3']) {
    it(`refuses ${client}`, function () {
      assert.throws(() => assertDatabaseSupported({ client, inDevelopmentTables: true }), {
        name: 'IncorrectUsageError',
        message: 'auth:engine better-auth requires MySQL; SQLite is not supported.',
      });
    });
  }

  it('refuses a database without the in-development tables', function () {
    assert.throws(() => assertDatabaseSupported({ client: 'mysql2', inDevelopmentTables: false }), {
      name: 'IncorrectUsageError',
      message: /requires the in-development auth tables/,
    });
  });
});
