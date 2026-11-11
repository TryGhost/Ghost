import assert from 'node:assert/strict';
import type { NextFunction, Request, Response } from 'express';
import type { ApiKey, Principal, Session, User } from '../../../../core/server/auth/principal';
import { applyPrincipal } from '../../../../core/server/auth/principal';
import {
  createPrincipalResolver,
  type ResolvePrincipalDeps,
} from '../../../../core/server/auth/resolve-principal';

const ADMIN = 'https://admin.example.com';

function model(id: string, attributes: Record<string, unknown> = {}) {
  return { id, get: (key: string) => attributes[key] };
}

const owner = model('owner') as User;

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

    it('accepts a session with no stored origin', async function () {
      const resolver = setup({ getSession: async () => ({ session: session({ origin: null }) }) });
      const { req } = await run(resolver.adminApi, withCookie());

      assert.equal(req.auth?.kind, 'user');
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
      const apiKey = model('key', { user_id: 'owner', type: 'admin' }) as ApiKey;
      const { req } = await run(resolver.adminApi, {
        ...withCookie(),
        api_key: apiKey,
        user: owner,
      });

      assert.equal(read, false);
      assert.deepEqual(req.auth, { kind: 'user', method: 'staff_token', user: owner, apiKey });
      assert.equal(req.user, owner);
      assert.equal(req.api_key, apiKey);
    });

    it('resolves an integration key to its integration', async function () {
      const integration = model('integration');
      const apiKey = Object.assign(model('key', { integration_id: 'integration', type: 'admin' }), {
        relations: { integration },
      }) as ApiKey;
      const { req } = await run(setup().adminApi, { api_key: apiKey, user: null });

      assert.deepEqual(req.auth, {
        kind: 'integration',
        method: 'admin_api_key',
        apiKey,
        integration,
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

describe('applyPrincipal', function () {
  it('leaves req.user alone for a non-user principal', function () {
    const req: { auth?: Principal; user?: User | null; api_key?: ApiKey | null } = {
      user: owner,
    };
    applyPrincipal(req, { kind: 'internal' });

    assert.equal(req.user, owner);
    assert.deepEqual(req.auth, { kind: 'internal' });
  });
});
