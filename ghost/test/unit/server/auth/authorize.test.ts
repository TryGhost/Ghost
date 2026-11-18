import assert from 'node:assert/strict';
import type { NextFunction, Request, Response } from 'express';
import { authorizeAdminApi } from '../../../../core/server/auth/authorize';
import type { Principal } from '../../../../core/server/auth/principal';

function authorize(req: Record<string, unknown>) {
  let error: unknown = 'not called';
  authorizeAdminApi(
    req as unknown as Request,
    {} as Response,
    ((err?: unknown) => {
      error = err;
    }) as NextFunction,
  );
  return error;
}

const app = { id: 'installation' };
const user = { id: 'owner', email: 'owner@example.com', name: 'Owner', status: 'active' };
const appPrincipal = (actingFor: typeof user | null): Principal => ({
  kind: 'app',
  method: actingFor ? 'oauth_authorization_code' : 'oauth_client_credentials',
  app,
  actingFor,
  scopes: ['post:read'],
});

describe('authorizeAdminApi', function () {
  it('lets a user or an API key through', function () {
    assert.equal(authorize({ user: { id: 'owner' } }), undefined);
    assert.equal(authorize({ api_key: { id: 'key' } }), undefined);
  });

  it('refuses a request with neither', function () {
    assert.equal((authorize({}) as { errorType: string }).errorType, 'NoPermissionError');
  });

  it('refuses an app with no user, even beside a stray API key', function () {
    for (const req of [
      { auth: appPrincipal(null), user: null, api_key: null },
      { auth: appPrincipal(null), user: null, api_key: { id: 'key' } },
    ]) {
      assert.equal((authorize(req) as { errorType: string }).errorType, 'NoPermissionError');
    }
  });

  it('lets an app acting for a user through', function () {
    assert.equal(
      authorize({ auth: appPrincipal(user), user: { id: 'owner' }, api_key: null }),
      undefined,
    );
  });
});
