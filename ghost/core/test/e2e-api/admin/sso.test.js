const {
  agentProvider,
  fixtureManager,
  matchers,
  configUtils,
} = require('../../utils/e2e-framework');
const { restore } = require('../../utils/e2e-framework-mock-manager');
const { stringMatching } = matchers;
const sinon = require('sinon');
const assert = require('node:assert/strict');
const models = require('../../../core/server/models');
const adapterManager = require('../../../core/server/services/adapter-manager').default;
const { SSOBase } = require('@tryghost/adapter-base-sso');

describe('SSO API', function () {
  let agent;
  let observedOwner;
  let ownerId;
  let enabled = true;

  beforeAll(async function () {
    // Mock SSO adapter that always returns the owner. The stub stays registered
    // before Ghost boots (the original ordering, in case the adapter resolves
    // during boot); the owner is looked up lazily per request via the user
    // repository Ghost injects into the adapter — exercising the same
    // dependency-injection path a real adapter uses, and avoiding an eager
    // lookup that (under per-file isolation, before fixtureManager.init() runs
    // below) would hit an unmigrated database.
    class MockSSOAdapter extends SSOBase {
      async getRequestCredentials() {
        return enabled ? { id: 'mock-credentials' } : null;
      }

      async getIdentityFromCredentials() {
        return {
          id: 'mock-identity',
        };
      }

      async getUserForIdentity() {
        observedOwner = await this.getOwnerUser();
        return observedOwner?.status === 'active' ? observedOwner : null;
      }
    }

    // Stub adapter manager to return mock SSO adapter
    const originalGetAdapter = adapterManager.getAdapter;
    sinon.stub(adapterManager, 'getAdapter').callsFake((name) => {
      if (name === 'sso') {
        return new MockSSOAdapter();
      }
      return originalGetAdapter.call(adapterManager, name);
    });

    agent = await agentProvider.getGhostAPIAgent();
    await fixtureManager.init();
  });

  afterAll(function () {
    restore();
    sinon.restore();
  });

  describe('SSO with 2FA enabled', function () {
    beforeEach(async function () {
      configUtils.set('security.staffDeviceVerification', true);
    });

    afterEach(async function () {
      configUtils.set('security.staffDeviceVerification', false);
      restore();
    });

    it('can sign in with SSO when 2FA is enabled', async function () {
      await agent
        .post('/')
        .expectEmptyBody()
        .matchHeaderSnapshot({
          'set-cookie': [stringMatching(/^ghost-admin-api-session=/)],
        });

      // Verify we can access authenticated endpoints after SSO login
      await agent.get('api/admin/users/me').expectStatus(200);
      assert.equal(observedOwner.status, 'active');
    });
  });
  describe('owner status and first-run setup', function () {
    beforeEach(async function () {
      const owner = await models.User.findOne({ role: 'Owner', status: 'all' });
      ownerId = owner.id;
      agent.resetAuthentication();
      enabled = true;
    });

    afterEach(async function () {
      enabled = true;
      await models.User.edit({ status: 'active' }, { id: ownerId, context: { internal: true } });
      agent.resetAuthentication();
    });

    it('does not grant a session to an inactive first-run owner', async function () {
      const owner = await models.User.findOne({ role: 'Owner', status: 'all' });
      await models.User.edit({ status: 'inactive' }, { id: owner.id, context: { internal: true } });
      const response = await agent.post('/').expectEmptyBody();
      assert.equal(response.headers['set-cookie'], undefined);
      assert.equal(observedOwner.status, 'inactive');
      const setup = await agent.get('api/admin/authentication/setup').expectStatus(200);
      assert.equal(setup.body.setup[0].status, false);
      await agent.get('api/admin/users/me').expectStatus(403);
    });

    it('preserves normal authentication when a preview does not activate SSO', async function () {
      enabled = false;
      const response = await agent.post('/').expectEmptyBody();
      assert.equal(response.headers['set-cookie'], undefined);
      await agent.get('api/admin/users/me').expectStatus(403);
    });
  });
});
