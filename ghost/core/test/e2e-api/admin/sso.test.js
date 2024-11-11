const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {mockLabsEnabled, mockLabsDisabled, restore} = require('../../utils/e2e-framework-mock-manager');
const {stringMatching} = matchers;
const sinon = require('sinon');
const adapterManager = require('../../../core/server/services/adapter-manager');
const models = require('../../../core/server/models');

describe('SSO API', function () {
    let agent;

    before(async function () {
        // Configure mock SSO adapter that always returns owner
        const owner = await models.User.getOwnerUser();

        // Create a mock adapter that always returns the owner
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
                return owner;
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

    after(function () {
        restore();
        sinon.restore();
    });

    describe('SSO with 2FA enabled', function () {
        beforeEach(async function () {
            mockLabsEnabled('staff2fa');
        });

        afterEach(async function () {
            mockLabsDisabled('staff2fa');
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
