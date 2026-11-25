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

const installationAt = (status: Installation['status'], id = 'installation-id', revision = 2) =>
  ({ id, status, revision, manifest: { scopes: ['post:browse'] } }) as Installation;

type Read =
  | Installation['status']
  | { status: Installation['status']; revision: number }
  | undefined;

type Issued = Awaited<ReturnType<AppTokens['issue']>>;

/**
 * Session tokens whose provider answers `issued`, or each of a list of answers in turn and the
 * last from then on, reading the installation as each of `reads` in turn, and active once they
 * run out; `undefined` is an uninstalled one.
 */
function tokensIssuing(
  issued: Issued | Issued[],
  availability: ReturnType<AppTokens['availability']> = 'ready',
  reads: Read[] = [],
) {
  const reconciled: Array<{ id: string; active: boolean }> = [];
  const answers = Array.isArray(issued) ? [...issued] : [issued];
  let issues = 0;
  const tokens = new AppSessionTokens({
    appTokens: {
      availability: () => availability,
      reconcileClient: async ({ id, active }) => {
        reconciled.push({ id, active });
      },
      issue: async () => {
        issues += 1;
        return answers.length > 1 ? answers.shift()! : answers[0]!;
      },
      validate: async () => null,
    },
    findInstallation: async (id) => {
      const read = reads.length ? reads.shift() : 'active';
      if (!read) {
        return undefined;
      }
      return typeof read === 'string'
        ? installationAt(read, id)
        : installationAt(read.status, id, read.revision);
    },
    logging: { error() {} },
  });
  return Object.assign(tokens, { reconciled, issues: () => issues });
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

  it('brings the client of an active installation back in step and issues again', async function () {
    const tokens = tokensIssuing([
      { refused: 'client_unavailable' },
      { accessToken: 'ghost_app_x', expiresIn: 3600 },
    ]);

    assert.deepEqual(await tokens.renew('installation-id', 2, principal), {
      access_token: 'ghost_app_x',
      expires_in: 3600,
    });
    assert.deepEqual(tokens.reconciled, [{ id: 'installation-id', active: true }]);
  });

  it('issues again only once for a client still out of step', async function () {
    const tokens = tokensIssuing({ refused: 'client_unavailable' });

    await assert.rejects(tokens.renew('installation-id', 2, principal), { statusCode: 500 });
    assert.equal(tokens.issues(), 2);
  });

  it('ends the session when the client is out of step and the installation moved to another revision', async function () {
    const tokens = tokensIssuing({ refused: 'client_unavailable' }, 'ready', [
      'active',
      { status: 'active', revision: 3 },
    ]);

    await assert.rejects(tokens.renew('installation-id', 2, principal), {
      statusCode: 409,
      code: 'APP_SESSION_ENDED',
    });
    assert.equal(tokens.issues(), 1);
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

  it('refuses a staff session that ended before the token was issued', async function () {
    await assert.rejects(
      tokensIssuing({ refused: 'session_unavailable' }).renew('installation-id', 2, principal),
      { statusCode: 403, code: 'APP_STAFF_SESSION_REQUIRED' },
    );
  });

  it('ends the session when the installation is suspended while renewing', async function () {
    await assert.rejects(
      tokensIssuing({ refused: 'client_unavailable' }, 'ready', ['active', 'suspended']).renew(
        'installation-id',
        2,
        principal,
      ),
      { statusCode: 409, code: 'APP_SESSION_ENDED' },
    );
  });

  it('ends the session when the installation moves to another revision while renewing', async function () {
    const tokens = tokensIssuing({ accessToken: 'ghost_app_x', expiresIn: 3600 }, 'ready', [
      'active',
      { status: 'active', revision: 3 },
    ]);

    await assert.rejects(tokens.renew('installation-id', 2, principal), {
      statusCode: 409,
      code: 'APP_SESSION_ENDED',
    });
  });

  it('says the app is not installed when it is uninstalled while renewing', async function () {
    await assert.rejects(
      tokensIssuing({ refused: 'client_unavailable' }, 'ready', ['active', undefined]).renew(
        'installation-id',
        2,
        principal,
      ),
      { statusCode: 404, code: 'APP_NOT_INSTALLED' },
    );
  });

  it('gives no token at session start when the installation is suspended while issuing', async function () {
    const tokens = tokensIssuing({ refused: 'client_unavailable' }, 'ready', ['suspended']);

    assert.equal(
      await tokens.issue(installationAt('active'), { userId: 'u', sessionId: 's' }),
      null,
    );
  });

  it('withdraws a token issued while the installation was uninstalled', async function () {
    const tokens = tokensIssuing({ accessToken: 'ghost_app_x', expiresIn: 3600 }, 'ready', [
      undefined,
    ]);

    await assert.rejects(tokens.issue(installationAt('active'), { userId: 'u', sessionId: 's' }), {
      statusCode: 404,
      code: 'APP_NOT_INSTALLED',
    });
    assert.deepEqual(tokens.reconciled, [{ id: 'installation-id', active: false }]);
  });

  it('withdraws a token issued while the installation was suspended', async function () {
    const tokens = tokensIssuing({ accessToken: 'ghost_app_x', expiresIn: 3600 }, 'ready', [
      'suspended',
    ]);

    assert.equal(
      await tokens.issue(installationAt('active'), { userId: 'u', sessionId: 's' }),
      null,
    );
    assert.deepEqual(tokens.reconciled, [{ id: 'installation-id', active: false }]);
  });
});
