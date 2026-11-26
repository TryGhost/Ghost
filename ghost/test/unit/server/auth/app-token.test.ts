import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import {
  authenticatesAppTokens,
  createAppTokenAuthentication,
  refuseUnauthenticatedAppToken,
  unlessAppToken,
  type AppTokenDeps,
} from '../../../../core/server/auth/app-token';
import type { AuthenticatedRequest } from '../../../../core/server/auth/principal';

const user = {
  id: 'user-id',
  get: (attribute: string) =>
    ({ email: 'owner@example.com', name: 'Owner', status: 'active' })[attribute],
  relations: { roles: { models: [{ id: 'role-id', get: () => 'Owner' }] } },
};

const session = {
  id: 'session-id',
  expiresAt: new Date(Date.now() + 60_000),
  origin: 'http://127.0.0.1:2369',
};

function deps(overrides: Partial<AppTokenDeps> = {}): AppTokenDeps {
  return {
    isAppsEnabled: () => true,
    validate: async () => ({ installationId: 'abc', userId: 'user-id', session }),
    findInstallation: async (id) => ({ id, status: 'active', scopes: ['post:browse'] }),
    findActiveUser: async () => user,
    ...overrides,
  };
}

async function run(
  appDeps: AppTokenDeps,
  authorization?: string,
): Promise<{ req: Request & AuthenticatedRequest; error: unknown }> {
  const req = { headers: authorization ? { authorization } : {} } as Request & AuthenticatedRequest;
  let error: unknown;
  await createAppTokenAuthentication(appDeps)(req, {} as Response, (err?: unknown) => {
    error = err;
  });
  return { req, error };
}

const refused = { statusCode: 401, code: 'APP_TOKEN_INVALID' };

describe('App token authentication', function () {
  it('leaves requests without an app token untouched', async function () {
    for (const header of [undefined, 'Ghost abc', 'Bearer ghost_pat_abc', 'Bearer abc']) {
      const { req, error } = await run(deps(), header);
      assert.equal(error, undefined);
      assert.equal(req.auth, undefined, header);
      assert.equal(req.user, undefined, header);
    }
  });

  it('acts for the user, with the scopes of the installation rather than the token', async function () {
    const { req, error } = await run(deps(), 'Bearer ghost_app_abc');

    assert.equal(error, undefined);
    assert.equal(req.user, user);
    assert.equal(req.api_key, null);
    assert.deepEqual(req.auth, {
      kind: 'app',
      method: 'app_user_token',
      app: { id: 'abc' },
      actingFor: {
        id: 'user-id',
        email: 'owner@example.com',
        name: 'Owner',
        status: 'active',
        roles: [{ id: 'role-id', name: 'Owner' }],
      },
      session: {
        id: 'session-id',
        userId: 'user-id',
        expiresAt: session.expiresAt.getTime(),
        verified: true,
        origin: 'http://127.0.0.1:2369',
      },
      scopes: ['post:browse'],
    });
  });

  it('refuses a malformed app token header, never passing it on to the key check or the cookie', async function () {
    let validated = 0;
    const appDeps = deps({
      validate: async () => {
        validated += 1;
        return null;
      },
    });
    for (const header of [
      'Bearer  ghost_app_abc',
      'Bearer ghost_app_abc extra',
      'Bearer GHOST_APP_abc',
      'Bearer\tghost_app_abc',
      'bearer Ghost_App_abc',
      'Bearer ghost_app_abc ',
    ]) {
      const { req, error } = await run(appDeps, header);
      assert.equal(req.auth, undefined, header);
      assert.equal((error as { statusCode?: number } | undefined)?.statusCode, 401, header);
      assert.equal((error as { code?: string }).code, 'APP_TOKEN_INVALID', header);
    }
    assert.equal(validated, 0);
  });

  it('accepts the scheme in any case', async function () {
    const { error } = await run(deps(), 'bearer ghost_app_abc');
    assert.equal(error, undefined);
  });

  const refusals: Array<[string, Partial<AppTokenDeps>]> = [
    ['the apps flag is off', { isAppsEnabled: () => false }],
    ['the provider refuses the token', { validate: async () => null }],
    ['the installation is gone', { findInstallation: async () => null }],
    [
      'the installation is suspended',
      { findInstallation: async (id) => ({ id, status: 'suspended', scopes: ['post:browse'] }) },
    ],
    ['the user is not active', { findActiveUser: async () => null }],
  ];

  for (const [when, overrides] of refusals) {
    it(`refuses when ${when}`, async function () {
      const { req, error } = await run(deps(overrides), 'Bearer ghost_app_abc');

      assert.equal(req.auth, undefined);
      assert.equal(req.user, undefined);
      assert.ok(error);
      assert.equal((error as { statusCode: number }).statusCode, refused.statusCode);
      assert.equal((error as { code: string }).code, refused.code);
    });
  }

  it('passes on a failure to read the installation as it is, not as a refused token', async function () {
    const failure = new Error('The database went away');
    const { req, error } = await run(
      deps({
        findInstallation: async () => {
          throw failure;
        },
      }),
      'Bearer ghost_app_abc',
    );

    assert.equal(req.auth, undefined);
    assert.equal(error, failure);
  });

  it('skips the key check and the cookie for an app', async function () {
    let called = 0;
    const handler = unlessAppToken(() => {
      called += 1;
    });
    const next = () => {};

    handler({ auth: { kind: 'app' } } as never, {} as Response, next);
    handler({} as never, {} as Response, next);

    assert.equal(called, 1);
  });

  it('refuses a request carrying an app token nothing authenticated, valid or not', function () {
    const answers = (requests: object[]) =>
      requests.map((req) => {
        let error: unknown = 'not called';
        refuseUnauthenticatedAppToken(req as never, {} as Response, (err?: unknown) => {
          error = err;
        });
        return error as { statusCode?: number; code?: string; message?: string } | undefined;
      });

    for (const error of answers([
      { headers: { authorization: 'Bearer ghost_app_abc' } },
      { headers: { authorization: 'bearer  GHOST_APP_abc def' } },
      { headers: { authorization: 'Bearer ghost_app_abc' }, auth: { kind: 'staff' } },
    ])) {
      assert.equal(error?.statusCode, 403);
      assert.equal(error?.code, 'APP_NOT_ALLOWED');
      assert.equal(error?.message, 'Apps are not allowed to access this endpoint');
    }

    assert.deepEqual(
      answers([
        { headers: {} },
        {},
        { headers: { authorization: 'Bearer ghost_pat_abc' } },
        { headers: { authorization: 'Ghost abc' } },
        { headers: { authorization: 'Bearer ghost_app_abc' }, auth: { kind: 'app' } },
      ]),
      [undefined, undefined, undefined, undefined, undefined],
    );
  });

  it('knows its own handlers from any other', function () {
    assert.ok(authenticatesAppTokens(createAppTokenAuthentication(deps())));
    assert.ok(!authenticatesAppTokens(refuseUnauthenticatedAppToken));
    assert.ok(!authenticatesAppTokens(unlessAppToken(() => undefined)));
    assert.ok(!authenticatesAppTokens(undefined));
  });
});
