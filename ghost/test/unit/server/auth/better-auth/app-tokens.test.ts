import assert from 'node:assert/strict';
import sinon from 'sinon';
import {
  appTokensAuth,
  createAppTokens,
  type AppTokensDeps,
} from '../../../../../core/server/auth/better-auth/app-tokens';
import type { GhostAuth } from '../../../../../core/server/auth/better-auth/create-auth';

type AppApi = ReturnType<AppTokensDeps['getAuth']>['api'];

const request = { installationId: 'abc', userId: 'user-id', sessionId: 's', scopes: ['posts'] };

function betterAuthTokens(
  api: Partial<Record<keyof AppApi, sinon.SinonStub>>,
  hasAppProvider = true,
) {
  return createAppTokens({
    isBetterAuth: () => true,
    getAuth: () => ({ api: api as unknown as AppApi, hasAppProvider }),
  });
}

describe('App tokens', function () {
  afterEach(function () {
    sinon.restore();
  });

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

  it('calls no endpoint while the provider awaits a restart', async function () {
    const api = {
      reconcileAppClient: sinon.stub(),
      issueAppUserToken: sinon.stub(),
      validateAppToken: sinon.stub(),
    };
    const tokens = betterAuthTokens(api, false);

    assert.equal(tokens.availability(), 'needs_restart');
    assert.equal(await tokens.validate('ghost_app_x'), null);
    await tokens.reconcileClient({ id: 'abc', active: true, scopes: [] });
    await assert.rejects(tokens.issue(request), {
      statusCode: 500,
      message: 'App tokens are unavailable (needs_restart), so none can be issued.',
    });
    sinon.assert.notCalled(api.reconcileAppClient);
    sinon.assert.notCalled(api.issueAppUserToken);
    sinon.assert.notCalled(api.validateAppToken);
  });

  describe('once the provider is registered', function () {
    it('keeps the installation client in step by its installation id', async function () {
      const reconcileAppClient = sinon.stub().resolves({ status: true });
      const tokens = betterAuthTokens({ reconcileAppClient });

      assert.equal(tokens.availability(), 'ready');
      await tokens.reconcileClient({ id: 'abc', active: false, scopes: ['posts'] });

      sinon.assert.calledOnceWithExactly(reconcileAppClient, {
        body: { installationId: 'abc', active: false, scopes: ['posts'] },
      });
    });

    it('answers an issued token or why none was issued', async function () {
      const issueAppUserToken = sinon.stub();
      issueAppUserToken
        .onFirstCall()
        .resolves({ refused: null, token: { accessToken: 'ghost_app_t', expiresIn: 60 } });
      issueAppUserToken.onSecondCall().resolves({ token: null, refused: 'session_unavailable' });
      const tokens = betterAuthTokens({ issueAppUserToken });

      assert.deepEqual(await tokens.issue(request), { accessToken: 'ghost_app_t', expiresIn: 60 });
      assert.deepEqual(await tokens.issue(request), { refused: 'session_unavailable' });
      sinon.assert.alwaysCalledWithExactly(issueAppUserToken, { body: request });
    });

    it('answers who a valid token acts for, with its session expiry as a date', async function () {
      const expiresAt = '2030-01-01T00:00:00.000Z';
      const validateAppToken = sinon.stub();
      validateAppToken.onFirstCall().resolves({
        token: {
          installationId: 'abc',
          userId: 'user-id',
          session: { id: 's', expiresAt, origin: null },
        },
      });
      validateAppToken.onSecondCall().resolves({ token: null });
      const tokens = betterAuthTokens({ validateAppToken });

      assert.deepEqual(await tokens.validate('ghost_app_t'), {
        installationId: 'abc',
        userId: 'user-id',
        session: { id: 's', expiresAt: new Date(expiresAt), origin: null },
      });
      assert.equal(await tokens.validate('ghost_app_gone'), null);
      sinon.assert.calledWithExactly(validateAppToken, { body: { token: 'ghost_app_t' } });
    });
  });

  it('reads whether boot registered the provider from the instance', function () {
    const auth = (plugins?: { id: string }[]) =>
      ({ api: {}, options: { plugins } }) as unknown as GhostAuth;

    assert.equal(
      appTokensAuth(auth([{ id: 'ghost-apps' }, { id: 'oauth-provider' }])).hasAppProvider,
      true,
    );
    assert.equal(appTokensAuth(auth([{ id: 'ghost-apps' }])).hasAppProvider, false);
    assert.equal(appTokensAuth(auth()).hasAppProvider, false);
  });
});
