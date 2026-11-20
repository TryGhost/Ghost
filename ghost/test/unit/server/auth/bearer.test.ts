import assert from 'node:assert/strict';
import errors from '@tryghost/errors';
import {
  bearerToken,
  createBearerAuthenticator,
  PAT_CONFIG_ID,
  type BearerDeps,
  type VerifyApiKeyResult,
} from '../../../../core/server/auth/bearer';
import type { User } from '../../../../core/server/auth/principal';

const owner = {
  id: 'owner',
  get: (key: string) =>
    ({ email: 'owner@example.com', name: 'Owner', status: 'active' })[key as 'email'],
  relations: { roles: { models: [{ id: 'role-owner', get: () => 'Owner' }] } },
} as User;

const valid: VerifyApiKeyResult = {
  valid: true,
  error: null,
  key: { id: 'token', referenceId: 'owner' },
};
const failed = (code: string): VerifyApiKeyResult => ({ valid: false, error: { code }, key: null });

function setup(result: VerifyApiKeyResult = valid, overrides: Partial<BearerDeps> = {}) {
  const calls: { key: string; configId: string }[] = [];
  const authenticate = createBearerAuthenticator({
    getVerifyApiKey: () => async (body) => {
      calls.push(body);
      return result;
    },
    findActiveUser: async (id) => (id === 'owner' ? owner : null),
    ...overrides,
  });
  return { authenticate, calls };
}

async function rejection(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (err) {
    return err as InstanceType<typeof errors.UnauthorizedError>;
  }
  assert.fail('expected a rejection');
}

describe('bearerToken', function () {
  it('reads the Bearer scheme, case-insensitively', function () {
    assert.equal(bearerToken('Bearer ghost_pat_abc'), 'ghost_pat_abc');
    assert.equal(bearerToken('bearer  ghost_pat_abc'), 'ghost_pat_abc');
  });

  it('is empty for a Bearer header with no token', function () {
    assert.equal(bearerToken('Bearer'), '');
    assert.equal(bearerToken('Bearer '), '');
  });

  it('is null for other schemes', function () {
    assert.equal(bearerToken(undefined), null);
    assert.equal(bearerToken('Ghost abc'), null);
    assert.equal(bearerToken('Bearerish abc'), null);
  });
});

describe('createBearerAuthenticator', function () {
  it('resolves a Personal Access Token to a bearer_token user principal', async function () {
    const { authenticate, calls } = setup();
    const { principal, user } = await authenticate('ghost_pat_abc');

    assert.deepEqual(calls, [{ key: 'ghost_pat_abc', configId: PAT_CONFIG_ID }]);
    assert.equal(user, owner);
    assert.deepEqual(principal, {
      kind: 'user',
      method: 'bearer_token',
      user: {
        id: 'owner',
        email: 'owner@example.com',
        name: 'Owner',
        status: 'active',
        roles: [{ id: 'role-owner', name: 'Owner' }],
      },
      apiToken: { id: 'token' },
    });
  });

  it('refuses any other prefix without verifying it, including session tokens', async function () {
    const { authenticate, calls } = setup();

    for (const token of ['', 'abc123sessiontoken', 'ghost_app_abc', 'GHOST_PAT_abc']) {
      const err = await rejection(authenticate(token));
      assert.ok(err instanceof errors.UnauthorizedError, token);
      assert.equal(err.code, 'INVALID_BEARER_TOKEN');
    }
    assert.equal(calls.length, 0);
  });

  it('refuses every token where api_tokens does not exist', async function () {
    const { authenticate } = setup(valid, { getVerifyApiKey: () => null });
    const err = await rejection(authenticate('ghost_pat_abc'));

    assert.ok(err instanceof errors.UnauthorizedError);
    assert.equal(err.code, 'INVALID_BEARER_TOKEN');
  });

  it('maps verification failures to 401, expiry with its own code', async function () {
    for (const [code, expected] of [
      ['INVALID_API_KEY', 'INVALID_BEARER_TOKEN'],
      ['KEY_DISABLED', 'INVALID_BEARER_TOKEN'],
      ['KEY_NOT_FOUND', 'INVALID_BEARER_TOKEN'],
      ['KEY_EXPIRED', 'BEARER_TOKEN_EXPIRED'],
    ]) {
      const err = await rejection(setup(failed(code)).authenticate('ghost_pat_abc'));
      assert.ok(err instanceof errors.UnauthorizedError, code);
      assert.equal(err.code, expected);
    }
  });

  it('maps the per-key rate limit to 429', async function () {
    for (const code of ['RATE_LIMITED', 'USAGE_EXCEEDED']) {
      const err = await rejection(setup(failed(code)).authenticate('ghost_pat_abc'));
      assert.ok(err instanceof errors.TooManyRequestsError, code);
      assert.equal(err.code, 'BEARER_TOKEN_RATE_LIMITED');
    }
  });

  it('refuses a token whose user is not active', async function () {
    const { authenticate } = setup(valid, { findActiveUser: async () => null });
    const err = await rejection(authenticate('ghost_pat_abc'));

    assert.ok(err instanceof errors.UnauthorizedError);
    assert.equal(err.code, 'INVALID_BEARER_TOKEN');
  });
});
