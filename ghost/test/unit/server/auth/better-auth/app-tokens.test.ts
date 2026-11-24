import assert from 'node:assert/strict';
import { createAppTokens } from '../../../../../core/server/auth/better-auth/app-tokens';

describe('App tokens', function () {
  it('says the legacy engine has none, without loading Better Auth', async function () {
    const tokens = createAppTokens({
      isBetterAuth: () => false,
      getAuth: () => assert.fail('Better Auth loaded under the legacy engine'),
    });

    assert.equal(tokens.availability(), 'legacy_engine');
    assert.equal(await tokens.validate('ghost_app_x'), null);
    await tokens.reconcileClient({ id: 'abc', active: true, scopes: [] });
    await assert.rejects(
      tokens.issue({ installationId: 'abc', userId: 'user-id', sessionId: 's', scopes: [] }),
      { statusCode: 500 },
    );
  });
});
