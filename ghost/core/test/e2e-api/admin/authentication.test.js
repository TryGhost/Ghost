const {agentProvider, fixtureManager, matchers, configUtils} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');
const security = require('@tryghost/security');
const settingsCache = require('../../../core/shared/settings-cache');
const moment = require('moment');
const {anyErrorId, stringMatching} = matchers;

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
        it('returns emailVerificationToken that can be used to bypass 2FA on login', async function () {
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

            // Reset the password and capture the emailVerificationToken
            const resetResponse = await agent
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
                        message: 'Password updated',
                        emailVerificationToken: stringMatching(/^[0-9]{6}$/)
                    }]
                });

            const emailVerificationToken = resetResponse.body.password_reset[0].emailVerificationToken;

            // Clear cookies to simulate a fresh login attempt
            agent.clearCookies();

            // Now login with the emailVerificationToken - should bypass 2FA
            await agent
                .post('session/')
                .body({
                    grant_type: 'password',
                    username: ownerUser.email,
                    password: newPassword,
                    token: emailVerificationToken
                })
                .expectStatus(201)
                .expectEmptyBody();

            // Verify we can access protected resources (session is verified)
            await agent
                .get('/users/me/')
                .expectStatus(200);

            // Cleanup: reset the password back to original and disable 2FA
            configUtils.set('security:staffDeviceVerification', false);
        });
    });
});
