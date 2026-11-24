import assert from 'node:assert/strict';
import { AppSessionTokens } from '../../../../../core/server/services/app-installations/session-tokens';
import type { Installation } from '../../../../../core/server/services/app-installations/codec';
import type { AppTokens } from '../../../../../core/server/auth/better-auth/app-tokens';
import type { Principal } from '../../../../../core/server/auth/principal';

const principal: Principal = {
  kind: 'user',
  method: 'session',
  user: {
    id: 'user-id',
    email: 'owner@example.com',
    name: 'Owner',
    status: 'active',
    roles: [{ id: 'role-id', name: 'Owner' }],
  },
  session: {
    id: 'session-id',
    userId: 'user-id',
    expiresAt: Date.now() + 60_000,
    verified: true,
    origin: 'http://127.0.0.1:2369',
  },
};

function tokensIssuing(
  issued: Awaited<ReturnType<AppTokens['issue']>>,
  availability: ReturnType<AppTokens['availability']> = 'ready',
) {
  return new AppSessionTokens({
    appTokens: {
      availability: () => availability,
      reconcileClient: async () => {},
      issue: async () => issued,
      validate: async () => null,
    },
    findInstallation: async (id) =>
      ({
        id,
        status: 'active',
        revision: 2,
        manifest: { scopes: ['post:browse'] },
      }) as Installation,
    logging: { error() {} },
  });
}

describe('App session tokens', function () {
  it('says apps need a restart when the provider was not loaded at boot', async function () {
    await assert.rejects(
      tokensIssuing({ refused: 'client_unavailable' }, 'needs_restart').renew(
        'installation-id',
        2,
        principal,
      ),
      { statusCode: 409, code: 'APP_TOKENS_UNAVAILABLE' },
    );
  });

  it('says apps need the new auth engine under the legacy one', async function () {
    await assert.rejects(
      tokensIssuing({ refused: 'client_unavailable' }, 'legacy_engine').renew(
        'installation-id',
        2,
        principal,
      ),
      { statusCode: 409, code: 'APP_AUTH_ENGINE_UNSUPPORTED' },
    );
  });

  it('fails with its own message when the client or the user is missing', async function () {
    await assert.rejects(
      tokensIssuing({ refused: 'client_unavailable' }).renew('installation-id', 2, principal),
      { statusCode: 500, message: /OAuth client is missing or disabled/ },
    );
    await assert.rejects(
      tokensIssuing({ refused: 'user_not_found' }).renew('installation-id', 2, principal),
      { statusCode: 500, message: /staff user was not found/ },
    );
  });

  it('ends the session once the installation is suspended or at another revision', async function () {
    await assert.rejects(
      tokensIssuing({ accessToken: 'ghost_app_x', expiresIn: 3600 }).renew('id', 1, principal),
      {
        statusCode: 409,
        code: 'APP_SESSION_ENDED',
      },
    );
  });

  it('refuses anything but a verified staff session of an Administrator or the Owner', async function () {
    await assert.rejects(
      tokensIssuing({ accessToken: 'ghost_app_x', expiresIn: 3600 }).renew('id', 2, null),
      {
        statusCode: 403,
        code: 'APP_STAFF_SESSION_REQUIRED',
      },
    );
  });

  it('returns the token it was issued', async function () {
    assert.deepEqual(
      await tokensIssuing({ accessToken: 'ghost_app_x', expiresIn: 3600 }).renew(
        'installation-id',
        2,
        principal,
      ),
      { access_token: 'ghost_app_x', expires_in: 3600 },
    );
  });
});
