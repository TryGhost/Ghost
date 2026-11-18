import assert from 'node:assert/strict';
import type { NextFunction, Request, Response } from 'express';
import type { ApiKey, Principal, Session, User } from '../../../../core/server/auth/principal';
import { applyPrincipal, userView } from '../../../../core/server/auth/principal';
import {
  createPrincipalResolver,
  fromApiKey,
  legacyAdminApi,
  unlessKeyed,
  type ResolvePrincipalDeps,
} from '../../../../core/server/auth/resolve-principal';

const ADMIN = 'https://admin.example.com';

function model(id: string, attributes: Record<string, unknown> = {}) {
  // toJSON so a raw model leaking into req.auth would serialize its secrets
  return { id, get: (key: string) => attributes[key], toJSON: () => ({ id, ...attributes }) };
}

const owner = model('owner', {
  email: 'owner@example.com',
  name: 'Owner',
  status: 'active',
  password: 'hash',
}) as User;
const ownerView = { id: 'owner', email: 'owner@example.com', name: 'Owner', status: 'active' };

const integration = model('integration', { type: 'custom', slug: 'zapier', secret: 'shh' });
const integrationView = { id: 'integration', type: 'custom', slug: 'zapier' };

const staffKey = model('key', { user_id: 'owner', type: 'admin', secret: 'shh' }) as ApiKey;
const staffKeyView = { id: 'key', type: 'admin', user_id: 'owner', integration_id: null };

function integrationKey(type: string) {
  return Object.assign(model('key', { integration_id: 'integration', type, secret: 'shh' }), {
    relations: { integration },
  }) as ApiKey;
}
const integrationKeyView = (type: string) => ({
  id: 'key',
  type,
  user_id: null,
  integration_id: 'integration',
});

function session(overrides: Partial<Session> = {}): Session {
  return {
    id: 'session',
    userId: 'owner',
    expiresAt: new Date(Date.now() + 60_000),
    verified: true,
    origin: ADMIN,
    ...overrides,
  };
}

function setup(overrides: Partial<ResolvePrincipalDeps> = {}) {
  const deps: ResolvePrincipalDeps = {
    getSession: async () => ({ session: session() }),
    getOriginOfRequest: (req) => (req.headers.origin as string) ?? null,
    getAdminOrigin: () => ADMIN,
    findActiveUser: async (id) => (id === 'owner' ? owner : null),
    ...overrides,
  };
  return createPrincipalResolver(deps);
}

type TestRequest = Request & { auth?: Principal; user?: User | null; api_key?: ApiKey | null };

async function run(
  handler: (req: Request, res: Response, next: NextFunction) => unknown,
  req: Partial<TestRequest>,
  locals: Record<string, unknown> = {},
) {
  const request = { headers: {}, ...req } as TestRequest;
  const error = await new Promise<unknown>((resolve) => {
    handler(request, { locals } as unknown as Response, resolve);
  });
  return { req: request, error };
}

const withCookie = (origin: string | undefined = ADMIN) => ({
  headers: { cookie: 'ghost-admin-api-session=abc', ...(origin ? { origin } : {}) },
});

describe('resolvePrincipal', function () {
  describe('admin API, cookie', function () {
    it('resolves a verified session to its user', async function () {
      const { req, error } = await run(setup().adminApi, withCookie());

      assert.equal(error, undefined);
      assert.equal(req.auth?.kind, 'user');
      assert.equal(req.auth?.kind === 'user' && req.auth.method, 'session');
      assert.deepEqual(req.auth?.kind === 'user' && req.auth.user, ownerView);
      assert.equal(req.user, owner);
      assert.equal(req.api_key, null);
    });

    it('treats an unverified session as anonymous', async function () {
      const resolver = setup({
        getSession: async () => ({ session: session({ verified: false }) }),
      });
      const { req, error } = await run(resolver.adminApi, withCookie());

      assert.equal(error, undefined);
      assert.deepEqual(req.auth, { kind: 'anonymous' });
      assert.equal(req.user, undefined);
    });

    it('is anonymous with no cookie, without reading a session', async function () {
      let read = false;
      const resolver = setup({
        getSession: async () => {
          read = true;
          return null;
        },
      });
      const { req } = await run(resolver.adminApi, { headers: { origin: 'https://evil.example' } });

      assert.equal(read, false);
      assert.deepEqual(req.auth, { kind: 'anonymous' });
    });

    it('is anonymous when the cookie has no session', async function () {
      const { req } = await run(setup({ getSession: async () => null }).adminApi, withCookie());

      assert.deepEqual(req.auth, { kind: 'anonymous' });
    });

    it('is anonymous when the user is no longer active', async function () {
      const resolver = setup({ findActiveUser: async () => null });
      const { req } = await run(resolver.adminApi, withCookie());

      assert.deepEqual(req.auth, { kind: 'anonymous' });
    });

    it('is anonymous when the user lookup fails', async function () {
      const resolver = setup({
        findActiveUser: async () => {
          throw new Error('NotFound');
        },
      });
      const { req, error } = await run(resolver.adminApi, withCookie());

      assert.equal(error, undefined);
      assert.deepEqual(req.auth, { kind: 'anonymous' });
    });

    it('keeps a user an earlier middleware set when anonymous', async function () {
      const resolver = setup({ getSession: async () => null });
      const { req } = await run(resolver.adminApi, { ...withCookie(), user: owner });

      assert.equal(req.user, owner);
    });

    it('rejects a cookie sent from another origin', async function () {
      const { error } = await run(setup().adminApi, withCookie('https://site.example.com'));

      assert.equal((error as { errorType?: string }).errorType, 'BadRequestError');
      assert.match(
        (error as Error).message,
        /Expected 'https:\/\/admin\.example\.com' received 'https:\/\/site\.example\.com'/,
      );
    });

    it("rejects a request from an origin other than the session's", async function () {
      const resolver = setup({
        getSession: async () => ({ session: session({ origin: 'https://old.example.com' }) }),
      });
      const { error } = await run(resolver.adminApi, withCookie());

      assert.equal((error as { errorType?: string }).errorType, 'BadRequestError');
    });

    it('treats a session with no stored origin as anonymous', async function () {
      const resolver = setup({ getSession: async () => ({ session: session({ origin: null }) }) });
      const { req, error } = await run(resolver.adminApi, withCookie());

      assert.equal(error, undefined);
      assert.deepEqual(req.auth, { kind: 'anonymous' });
    });

    it('keeps only the session fields it needs, dropping the token', async function () {
      const stored = session();
      const resolver = setup({
        getSession: async () => ({ session: { ...stored, token: 'secret' } as Session }),
      });
      const { req } = await run(resolver.adminApi, withCookie());

      assert.equal(req.auth?.kind, 'user');
      assert.deepEqual(req.auth?.kind === 'user' && req.auth.session, {
        id: stored.id,
        userId: stored.userId,
        expiresAt: stored.expiresAt.getTime(),
        verified: true,
        origin: ADMIN,
      });
    });

    it('never falls back to the cookie when an Authorization header was sent', async function () {
      let read = false;
      const resolver = setup({
        getSession: async () => {
          read = true;
          return { session: session() };
        },
      });
      const { req } = await run(resolver.adminApi, {
        headers: { ...withCookie().headers, authorization: 'Bearer unverified' },
        api_key: null,
      });

      assert.equal(read, false);
      assert.deepEqual(req.auth, { kind: 'anonymous' });
    });

    it('skips the origin checks when the route bypasses CSRF protection', async function () {
      const { req, error } = await run(setup().adminApi, withCookie('https://site.example.com'), {
        bypassCsrfProtection: true,
      });

      assert.equal(error, undefined);
      assert.equal(req.auth?.kind, 'user');
    });
  });

  describe('admin API, verified keys', function () {
    it('resolves a staff token to its user, ignoring any cookie', async function () {
      let read = false;
      const resolver = setup({
        getSession: async () => {
          read = true;
          return null;
        },
      });
      const apiKey = staffKey;
      const { req } = await run(resolver.adminApi, {
        ...withCookie(),
        api_key: apiKey,
        user: owner,
      });

      assert.equal(read, false);
      assert.deepEqual(req.auth, {
        kind: 'user',
        method: 'staff_token',
        user: ownerView,
        apiKey: staffKeyView,
      });
      assert.equal(req.user, owner);
      assert.equal(req.api_key, apiKey);
    });

    it('resolves an integration key to its integration', async function () {
      const apiKey = integrationKey('admin');
      const { req } = await run(setup().adminApi, { api_key: apiKey, user: null });

      assert.deepEqual(req.auth, {
        kind: 'integration',
        method: 'admin_api_key',
        apiKey: integrationKeyView('admin'),
        integration: integrationView,
      });
      assert.equal(req.user, null);
      assert.equal(req.api_key, apiKey);
    });

    it('resolves a URL token the same way, with no cookie fallback', async function () {
      const apiKey = model('key', { type: 'admin' }) as ApiKey;
      const keyed = await run(setup().adminApiWithUrl, { api_key: apiKey, user: null });
      const anonymous = await run(setup().adminApiWithUrl, withCookie());

      assert.equal(keyed.req.auth?.kind, 'integration');
      assert.deepEqual(anonymous.req.auth, { kind: 'anonymous' });
    });
  });

  describe('content API', function () {
    it('resolves a content key to its integration', async function () {
      const apiKey = model('key', { type: 'content' }) as ApiKey;
      const { req } = await run(setup().contentApi, { api_key: apiKey });

      assert.equal(req.auth?.kind, 'integration');
      assert.equal(req.auth?.kind === 'integration' && req.auth.method, 'content_api_key');
      assert.equal(req.user, undefined);
    });

    it('is anonymous without a key, leaving members auth to run', async function () {
      const { req } = await run(setup().contentApi, withCookie());

      assert.deepEqual(req.auth, { kind: 'anonymous' });
    });
  });
});

describe('legacy principal', function () {
  it('skips the session middleware when a key was verified', async function () {
    let ran = false;
    const sessionStep = unlessKeyed((_req, _res, next) => {
      ran = true;
      next();
    });

    await run(sessionStep, { ...withCookie(), api_key: staffKey, user: owner });
    assert.equal(ran, false);

    await run(sessionStep, { ...withCookie(), api_key: null });
    assert.equal(ran, true);
  });

  it('gives a key with a missing integration row no integration', async function () {
    const apiKey = Object.assign(model('key', { integration_id: 'gone', type: 'admin' }), {
      relations: { integration: { get: () => undefined } },
    }) as unknown as ApiKey;
    const { req } = await run(legacyAdminApi, { api_key: apiKey, user: null });

    assert.equal(req.auth?.kind === 'integration' && req.auth.integration, null);
  });

  it('reads a session user the session middleware set', async function () {
    const { req, error } = await run(legacyAdminApi, {
      ...withCookie(),
      api_key: null,
      user: owner,
    });

    assert.equal(error, undefined);
    assert.deepEqual(req.auth, { kind: 'user', method: 'session', user: ownerView });
    assert.equal(req.user, owner);
    assert.equal(req.api_key, null);
  });

  it('reads a staff token', async function () {
    const apiKey = staffKey;
    const { req } = await run(legacyAdminApi, { api_key: apiKey, user: owner });

    assert.deepEqual(req.auth, {
      kind: 'user',
      method: 'staff_token',
      user: ownerView,
      apiKey: staffKeyView,
    });
    assert.equal(req.user, owner);
    assert.equal(req.api_key, apiKey);
  });

  it('reads an integration key', async function () {
    const apiKey = integrationKey('admin');
    const { req } = await run(legacyAdminApi, { api_key: apiKey, user: null });

    assert.deepEqual(req.auth, {
      kind: 'integration',
      method: 'admin_api_key',
      apiKey: integrationKeyView('admin'),
      integration: integrationView,
    });
    assert.equal(req.user, null);
    assert.equal(req.api_key, apiKey);
  });

  it('is anonymous when nothing authenticated', async function () {
    const { req } = await run(legacyAdminApi, { ...withCookie(), api_key: null });

    assert.deepEqual(req.auth, { kind: 'anonymous' });
    assert.equal(req.user, undefined);
    assert.equal(req.api_key, null);
  });

  it('reads a content key', async function () {
    const apiKey = integrationKey('content');
    const { req } = await run(fromApiKey('content_api_key'), { api_key: apiKey });

    assert.deepEqual(req.auth, {
      kind: 'integration',
      method: 'content_api_key',
      apiKey: integrationKeyView('content'),
      integration: integrationView,
    });
    assert.equal(req.user, undefined);
    assert.equal(req.api_key, apiKey);
  });
});

describe('applyPrincipal', function () {
  it('leaves req.user alone for an anonymous principal', function () {
    const req: { auth?: Principal; user?: User | null; api_key?: ApiKey | null } = {
      user: owner,
    };
    applyPrincipal(req, { kind: 'anonymous' });

    assert.equal(req.user, owner);
    assert.deepEqual(req.auth, { kind: 'anonymous' });
  });

  it('throws on a kind with no request mapping', function () {
    const req: { auth?: Principal; user?: User | null; api_key?: ApiKey | null } = {};

    assert.throws(() => applyPrincipal(req, { kind: 'internal' }), {
      errorType: 'IncorrectUsageError',
    });
    assert.equal(req.auth, undefined);
  });

  it('throws when a principal comes without its model', function () {
    const req: { auth?: Principal; user?: User | null; api_key?: ApiKey | null } = {};

    assert.throws(
      () => applyPrincipal(req, { kind: 'user', method: 'session', user: userView(owner) }),
      { errorType: 'IncorrectUsageError' },
    );
    assert.equal(req.auth, undefined);
  });

  it('freezes its own copy of scopes, even from a principal the caller froze', function () {
    const req: { auth?: Principal; user?: User | null; api_key?: ApiKey | null } = {};
    const scopes = ['post:read'];
    const principal = Object.freeze({
      kind: 'user' as const,
      method: 'session' as const,
      user: userView(owner),
      scopes,
    });
    applyPrincipal(req, principal, { user: owner });

    assert.ok(req.auth?.kind === 'user' && req.auth.scopes);
    assert.deepEqual(req.auth.scopes, ['post:read']);
    assert.equal(Object.isFrozen(req.auth.scopes), true);
    // The caller's array stays its own
    assert.equal(Object.isFrozen(scopes), false);
  });

  it('freezes req.auth and the views on it', async function () {
    const { req } = await run(legacyAdminApi, { api_key: staffKey, user: owner });

    assert.ok(req.auth?.kind === 'user' && req.auth.apiKey);
    assert.equal(req.auth.apiKey.id, staffKey.id);
    assert.equal(Object.isFrozen(req.auth), true);
    assert.equal(Object.isFrozen(req.auth.user), true);
    assert.equal(Object.isFrozen(req.auth.apiKey), true);
  });

  it('keeps passwords and key secrets out of req.auth', async function () {
    const staff = await run(legacyAdminApi, { api_key: staffKey, user: owner });
    const keyed = await run(legacyAdminApi, { api_key: integrationKey('admin'), user: null });

    assert.equal(staff.req.auth?.kind, 'user');
    assert.equal(keyed.req.auth?.kind, 'integration');
    assert.doesNotMatch(JSON.stringify([staff.req.auth, keyed.req.auth]), /hash|shh/);
  });
});
