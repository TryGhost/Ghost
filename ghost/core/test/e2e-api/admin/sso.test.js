const {agentProvider, fixtureManager, matchers, configUtils} = require('../../utils/e2e-framework');
const {restore} = require('../../utils/e2e-framework-mock-manager');
const {stringMatching} = matchers;
const sinon = require('sinon');
const adapterManager = require('../../../core/server/services/adapter-manager');
const models = require('../../../core/server/models');

describe('SSO API', function () {
    let agent;

    beforeAll(async function () {
        // Mock SSO adapter that always returns the owner. The stub stays registered
        // before Ghost boots (the original ordering, in case the adapter resolves
        // during boot); the owner is looked up lazily per request, because under
        // per-file isolation the DB isn't seeded until getGhostAPIAgent() /
        // fixtureManager.init() run below — an eager lookup hits an unmigrated
        // database (the old serial suite inherited a prior file's schema). (PLA-153)
        class MockSSOAdapter {
            async getRequestCredentials() {
                return {
                    id: 'mock-credentials'
                };
            }

            async getIdentityFromCredentials() {
                return {
                    id: 'mock-identity'
                };
            }

            async getUserForIdentity() {
                return models.User.getOwnerUser();
            }
        }

        // Stub adapter manager to return mock SSO adapter
        const originalGetAdapter = adapterManager.getAdapter;
        sinon.stub(adapterManager, 'getAdapter').callsFake((name) => {
            if (name === 'sso') {
                return new MockSSOAdapter();
            }
            return originalGetAdapter.call(this, name);
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
                    'set-cookie': [
                        stringMatching(/^ghost-admin-api-session=/)
                    ]
                });

            // Verify we can access authenticated endpoints after SSO login
            await agent
                .get('api/admin/users/me')
                .expectStatus(200);
        });
    });
});
