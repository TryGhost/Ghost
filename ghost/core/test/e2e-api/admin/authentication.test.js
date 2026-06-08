const {agentProvider, fixtureManager, matchers, configUtils} = require('../../utils/e2e-framework');
const {mockMail, restore} = require('../../utils/e2e-framework-mock-manager');
const models = require('../../../core/server/models');
const security = require('@tryghost/security');
const settingsCache = require('../../../core/shared/settings-cache');
const moment = require('moment');
const {anyErrorId} = matchers;

describe('Authentication API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users');
        await agent.loginAsOwner();
    });

    describe('generateResetToken', function () {
        it('Cannot generate reset token without required info', async function () {
            await agent
                .post('authentication/password_reset')
                .expectStatus(400)
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                });
        });
    });

    describe('resetPassword', function () {
        beforeEach(function () {
            mockMail();
        });

        afterEach(function () {
            configUtils.set('security:staffDeviceVerification', false);
            restore();
        });

        it('creates a verified session after password reset', async function () {
            // Enable 2FA for this test
            configUtils.set('security:staffDeviceVerification', true);

            const ownerUser = await fixtureManager.get('users', 0);
            const newPassword = 'thisissupersafe';

            // Generate a valid reset token manually (simulating the email link)
            const dbHash = settingsCache.get('db_hash');
            const user = await models.User.getByEmail(ownerUser.email, {context: {internal: true}});
            const resetToken = security.tokens.resetToken.generateHash({
                expires: moment().add(1, 'days').valueOf(),
                email: ownerUser.email,
                dbHash: dbHash,
                password: user.get('password')
            });
            const encodedToken = security.url.encodeBase64(resetToken);

            // Reset should start from an unauthenticated session.
            agent.clearCookies();

            // Reset the password and verify response mode
            await agent
                .put('authentication/password_reset')
                .body({
                    password_reset: [{
                        token: encodedToken,
                        newPassword: newPassword,
                        ne2Password: newPassword
                    }]
                })
                .expectStatus(200)
                .matchBodySnapshot({
                    password_reset: [{
                        message: 'Password updated'
                    }]
                });

            // Verify we can access protected resources (session is verified)
            await agent
                .get('/users/me/')
                .expectStatus(200);
        });
    });
});
