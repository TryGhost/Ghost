const {agentProvider, fixtureManager, resetRateLimits} = require('../../utils/e2e-framework');
const {mockMail, restore} = require('../../utils/e2e-framework-mock-manager');
const models = require('../../../core/server/models');
const security = require('@tryghost/security');
const settingsCache = require('../../../core/shared/settings-cache');
const moment = require('moment');

const DEFAULT_PASSWORD = 'Sl1m3rson99';

async function stealCookiesAs(agent, role) {
    return agent.loginAs(null, null, role);
}

function injectStolenCookies(agent, setCookieHeaders) {
    agent.jar.setCookies(setCookieHeaders);
}

describe('Session invalidation on password change', function () {
    let agentA;
    let agentB;
    let ownerAgent;
    let ownerId;
    let adminId;

    before(async function () {
        agentA = await agentProvider.getAdminAPIAgent();
        agentB = await agentProvider.getAdminAPIAgent();
        ownerAgent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users');
        ownerId = fixtureManager.get('users', 0).id;
        adminId = fixtureManager.get('users', 1).id;
    });

    beforeEach(async function () {
        await resetRateLimits();
        agentA.resetAuthentication();
        agentB.resetAuthentication();
        ownerAgent.resetAuthentication();

        await models.User.edit(
            {password: DEFAULT_PASSWORD},
            {id: ownerId, context: {internal: true}}
        );
        await models.User.edit(
            {password: DEFAULT_PASSWORD},
            {id: adminId, context: {internal: true}}
        );
    });

    afterEach(function () {
        restore();
    });

    it('Changing password invalidates other concurrent sessions for the same user', async function () {
        await agentA.loginAsOwner();
        await agentB.loginAsOwner();

        await agentA.get('users/me/').expectStatus(200);
        await agentB.get('users/me/').expectStatus(200);

        const newPassword = 'Sl1m3rson99-rotated!';

        await agentA.put('users/password/')
            .body({
                password: [{
                    newPassword,
                    ne2Password: newPassword,
                    oldPassword: DEFAULT_PASSWORD,
                    user_id: ownerId
                }]
            })
            .expectStatus(200);

        await agentA.get('users/me/').expectStatus(200);
        await agentB.get('users/me/').expectStatus(403);
    });

    it('Stolen-cookie scenario: a cloned session cookie is invalidated by password change', async function () {
        const victim = agentA;
        const attacker = agentB;

        const stolenCookies = await stealCookiesAs(victim, 'owner');
        injectStolenCookies(attacker, stolenCookies);

        await victim.get('users/me/').expectStatus(200);
        await attacker.get('users/me/').expectStatus(200);

        const newPassword = 'Sl1m3rson99-after-theft!';

        await victim.put('users/password/')
            .body({
                password: [{
                    newPassword,
                    ne2Password: newPassword,
                    oldPassword: DEFAULT_PASSWORD,
                    user_id: ownerId
                }]
            })
            .expectStatus(200);

        await victim.get('users/me/').expectStatus(200);
        await attacker.get('users/me/').expectStatus(403);
    });

    it('Owner changing another user\'s password invalidates all of that user\'s sessions', async function () {
        await ownerAgent.loginAsOwner();
        await agentA.loginAsAdmin();
        await agentB.loginAsAdmin();

        await agentA.get('users/me/').expectStatus(200);
        await agentB.get('users/me/').expectStatus(200);

        const newPassword = 'Sl1m3rson99-by-owner!';

        await ownerAgent.put('users/password/')
            .body({
                password: [{
                    newPassword,
                    ne2Password: newPassword,
                    user_id: adminId
                }]
            })
            .expectStatus(200);

        await ownerAgent.get('users/me/').expectStatus(200);
        await agentA.get('users/me/').expectStatus(403);
        await agentB.get('users/me/').expectStatus(403);
    });

    it('Password reset invalidates all prior sessions including stolen cookies', async function () {
        const victimCookies = await stealCookiesAs(agentA, 'owner');
        await agentB.loginAsOwner();

        await agentA.get('users/me/').expectStatus(200);
        await agentB.get('users/me/').expectStatus(200);

        mockMail();

        const ownerFixture = fixtureManager.get('users', 0);
        const dbHash = settingsCache.get('db_hash');
        const user = await models.User.getByEmail(ownerFixture.email, {context: {internal: true}});

        const resetToken = security.tokens.resetToken.generateHash({
            expires: moment().add(1, 'days').valueOf(),
            email: ownerFixture.email,
            dbHash,
            password: user.get('password')
        });
        const encodedToken = security.url.encodeBase64(resetToken);
        const newPassword = 'Sl1m3rson99-reset!';

        agentA.clearCookies();

        await agentA.put('authentication/password_reset')
            .body({
                password_reset: [{
                    token: encodedToken,
                    newPassword,
                    ne2Password: newPassword
                }]
            })
            .expectStatus(200);

        await agentA.get('users/me/').expectStatus(200);
        await agentB.get('users/me/').expectStatus(403);

        ownerAgent.resetAuthentication();
        injectStolenCookies(ownerAgent, victimCookies);
        await ownerAgent.get('users/me/').expectStatus(403);
    });

    it('PUT /users/:id strips password from the request body and does not affect sessions', async function () {
        await agentA.loginAsAdmin();

        await agentA.get('users/me/').expectStatus(200);

        await agentA.put(`users/${adminId}/`)
            .body({
                users: [{
                    id: adminId,
                    password: 'attempt-to-change-via-edit'
                }]
            })
            .expectStatus(200);

        await agentA.get('users/me/').expectStatus(200);

        await agentB.resetAuthentication();
        await agentB.loginAsAdmin();
        await agentB.get('users/me/').expectStatus(200);
    });

    describe('Failed attempts leave sessions untouched', function () {
        it('Wrong old password: sessions are not destroyed', async function () {
            await agentA.loginAsOwner();
            await agentB.loginAsOwner();

            await agentA.put('users/password/')
                .body({
                    password: [{
                        newPassword: 'Sl1m3rson99-wrong-old!',
                        ne2Password: 'Sl1m3rson99-wrong-old!',
                        oldPassword: 'not-the-right-password',
                        user_id: ownerId
                    }]
                })
                .expectStatus(422);

            await agentA.get('users/me/').expectStatus(200);
            await agentB.get('users/me/').expectStatus(200);
        });

        it('Unauthorized caller (author changing owner): sessions are not destroyed', async function () {
            await ownerAgent.loginAsOwner();
            await agentA.loginAs(null, null, 'author');

            await agentA.put('users/password/')
                .body({
                    password: [{
                        newPassword: 'Sl1m3rson99-nope!',
                        ne2Password: 'Sl1m3rson99-nope!',
                        user_id: ownerId
                    }]
                })
                .expectStatus(403);

            await ownerAgent.get('users/me/').expectStatus(200);
            await agentA.get('users/me/').expectStatus(200);
        });

        it('Invalid password reset token: sessions are not destroyed', async function () {
            await agentA.loginAsOwner();
            await agentB.loginAsOwner();

            await ownerAgent.put('authentication/password_reset')
                .body({
                    password_reset: [{
                        token: 'this-is-not-a-valid-token',
                        newPassword: 'Sl1m3rson99-nope!',
                        ne2Password: 'Sl1m3rson99-nope!'
                    }]
                })
                .expectStatus(401);

            await agentA.get('users/me/').expectStatus(200);
            await agentB.get('users/me/').expectStatus(200);
        });
    });
});
