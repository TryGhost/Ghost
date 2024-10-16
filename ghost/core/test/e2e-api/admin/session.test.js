const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {mockLabsEnabled, mockLabsDisabled, mockMail, assert, restore} = require('../../utils/e2e-framework-mock-manager');
const {anyContentVersion, anyEtag, anyErrorId, stringMatching, anyISODateTime, anyUuid} = matchers;

describe('Sessions API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init();
    });

    it('can create session (log in)', async function () {
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
    });

    it('can read session now the owner is logged in', async function () {
        await agent
            .get('session/')
            .expectStatus(200)
            .matchBodySnapshot({
                // id is 1, but should be anyObjectID :(
                last_seen: anyISODateTime,
                created_at: anyISODateTime,
                updated_at: anyISODateTime
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('can delete session (log out)', async function () {
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
    });

    it('errors when reading session again now owner is not logged in', async function () {
        await agent
            .get('session/')
            .expectStatus(403)
            .matchBodySnapshot({
                errors: [{
                    id: anyErrorId
                }]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    describe('Staff 2FA', function () {
        let mail;

        beforeEach(async function () {
            mockLabsEnabled('staff2fa');
            mail = mockMail();

            // Setup the agent & fixtures again, to ensure no cookies are set
            agent = await agentProvider.getAdminAPIAgent();
            await fixtureManager.init();
        });

        afterEach(async function () {
            mockLabsDisabled('staff2fa');
            restore();
        });

        it('sends verification email if labs flag enabled', async function () {
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
                        code: '2FA_TOKEN_REQUIRED',
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
                        code: '2FA_TOKEN_REQUIRED',
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
    });
});
