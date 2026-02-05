const {agentProvider, fixtureManager, matchers, configUtils} = require('../../utils/e2e-framework');
const {mockMail, assert, restore} = require('../../utils/e2e-framework-mock-manager');
const {anyContentVersion, anyEtag, stringMatching, anyUuid} = matchers;

describe('Sessions API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init();
    });

    it('can create session (log in) and access user data', async function () {
        const owner = await fixtureManager.get('users', 0);
        await agent
            .post('session/')
            .body({
                grant_type: 'password',
                username: owner.email,
                password: owner.password
            })
            .expectStatus(201)
            .expectEmptyBody()
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag,
                'set-cookie': [
                    stringMatching(/^ghost-admin-api-session=/)
                ]
            });

        await agent
            .get('/users/me/')
            .expectStatus(200);
    });

    it('can delete session (log out) and requests will fail', async function () {
        await agent
            .delete('session/')
            .expectStatus(204)
            .expectEmptyBody()
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag,
                'set-cookie': [
                    stringMatching(/^ghost-admin-api-session=/)
                ]
            });

        await agent
            .get('/users/me/')
            .expectStatus(403);
    });

    describe('Staff 2FA', function () {
        let mail;

        beforeEach(async function () {
            configUtils.set('security:staffDeviceVerification', true);
            mail = mockMail();

            // Setup the agent & fixtures again, to ensure no cookies are set
            agent = await agentProvider.getAdminAPIAgent();
            await fixtureManager.init();
        });

        afterEach(async function () {
            configUtils.set('security:staffDeviceVerification', false);
            restore();
        });

        it('sends verification email if staffDeviceVerification is enabled', async function () {
            const owner = await fixtureManager.get('users', 0);

            await agent
                .post('session/')
                .body({
                    grant_type: 'password',
                    username: owner.email,
                    password: owner.password
                })
                .expectStatus(403)
                .matchBodySnapshot({
                    errors: [{
                        code: '2FA_NEW_DEVICE_DETECTED',
                        id: anyUuid,
                        message: 'User must verify session to login.',
                        type: 'Needs2FAError'
                    }]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag,
                    'set-cookie': [
                        stringMatching(/^ghost-admin-api-session=/)
                    ]
                });

            mail.assertSentEmailCount(1);
        });

        it('can verify a session with 2FA code', async function () {
            const owner = await fixtureManager.get('users', 0);
            await agent
                .post('session/')
                .body({
                    grant_type: 'password',
                    username: owner.email,
                    password: owner.password
                })
                .expectStatus(403)
                .matchBodySnapshot({
                    errors: [{
                        code: '2FA_NEW_DEVICE_DETECTED',
                        id: anyUuid,
                        message: 'User must verify session to login.',
                        type: 'Needs2FAError'
                    }]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag,
                    'set-cookie': [
                        stringMatching(/^ghost-admin-api-session=/)
                    ]
                });

            const email = assert.sentEmail({
                subject: /[0-9]{6} is your Ghost sign in verification code/
            });

            const token = email.subject.match(/[0-9]{6}/)[0];
            await agent
                .post('session/verify')
                .body({
                    token
                })
                .expectStatus(200)
                .expectEmptyBody();
        });

        it('can login with 2FA code in session creation request', async function () {
            const owner = await fixtureManager.get('users', 0);

            // First login to trigger 2FA and get a verification code
            await agent
                .post('session/')
                .body({
                    grant_type: 'password',
                    username: owner.email,
                    password: owner.password
                })
                .expectStatus(403);

            const email = assert.sentEmail({
                subject: /[0-9]{6} is your Ghost sign in verification code/
            });

            const token = email.subject.match(/[0-9]{6}/)[0];

            // Clear cookies to simulate fresh login attempt with token
            agent.clearCookies();

            // Login with token included - should succeed in one request
            await agent
                .post('session/')
                .body({
                    grant_type: 'password',
                    username: owner.email,
                    password: owner.password,
                    token
                })
                .expectStatus(201)
                .expectEmptyBody()
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag,
                    'set-cookie': [
                        stringMatching(/^ghost-admin-api-session=/)
                    ]
                });

            // Verify we can access protected resources
            await agent
                .get('/users/me/')
                .expectStatus(200);
        });
    });
});
