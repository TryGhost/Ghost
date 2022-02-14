const nock = require('nock');
const assert = require('assert');
const {agentProvider, mockManager, fixtureManager, matchers} = require('../../../utils/e2e-framework');
const {anyEtag, anyDate, anyErrorId} = matchers;

const {tokens} = require('@tryghost/security');
const models = require('../../../../core/server/models');
const settingsCache = require('../../../../core/shared/settings-cache');

describe('Authentication API', function () {
    let agent;

    describe('Blog setup', function () {
        before(async function () {
            agent = await agentProvider.getAdminAPIAgent();
        });

        beforeEach(function () {
            mockManager.mockMail();
        });

        afterEach(function () {
            mockManager.restore();
            nock.cleanAll();
        });

        it('is setup? no', async function () {
            await agent
                .get('authentication/setup')
                .expectStatus(200)
                .matchBodySnapshot()
                .matchHeaderSnapshot({
                    etag: anyEtag
                });
        });

        it('complete setup', async function () {
            const requestMock = nock('https://api.github.com')
                .get('/repos/tryghost/dawn/zipball')
                .query(true)
                .replyWithFile(200, __dirname + '/../../../utils/fixtures/themes/valid.zip');

            await agent
                .post('authentication/setup')
                .body({
                    setup: [{
                        name: 'test user',
                        email: 'test@example.com',
                        password: 'thisissupersafe',
                        blogTitle: 'a test blog',
                        theme: 'TryGhost/Dawn'
                    }]
                })
                .expectStatus(201)
                .matchBodySnapshot({
                    users: [{
                        created_at: anyDate,
                        updated_at: anyDate
                    }]
                })
                .matchHeaderSnapshot({
                    etag: anyEtag
                });

            // Test our side effects
            mockManager.assert.sentEmail({
                subject: 'Your New Ghost Site',
                to: 'test@example.com'
            });
            assert.equal(requestMock.isDone(), true, 'The dawn github URL should have been used');

            const activeTheme = await settingsCache.get('active_theme');
            assert.equal(activeTheme, 'dawn', 'The theme dawn should have been installed');
        });

        it('is setup? yes', async function () {
            await agent
                .get('authentication/setup')
                .matchBodySnapshot()
                .matchHeaderSnapshot({
                    etag: anyEtag
                });
        });

        it('complete setup again', function () {
            return agent
                .post('authentication/setup')
                .body({
                    setup: [{
                        name: 'test user',
                        email: 'test-leo@example.com',
                        password: 'thisissupersafe',
                        blogTitle: 'a test blog'
                    }]
                })
                .expectStatus(403)
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                })
                .matchHeaderSnapshot({
                    etag: anyEtag
                });
        });

        it('update setup', async function () {
            await fixtureManager.init();
            await agent.loginAsOwner();

            await agent
                .put('authentication/setup')
                .body({
                    setup: [{
                        name: 'test user edit',
                        email: 'test-edit@example.com',
                        password: 'thisissupersafe',
                        blogTitle: 'a test blog'
                    }]
                })
                .expectStatus(200)
                .matchBodySnapshot({
                    users: [{
                        created_at: anyDate,
                        last_seen: anyDate,
                        updated_at: anyDate
                    }]
                })
                .matchHeaderSnapshot({
                    etag: anyEtag
                });
        });
    });

    describe('Invitation', function () {
        before(async function () {
            agent = await agentProvider.getAdminAPIAgent();
            await fixtureManager.init('invites');
            await agent.loginAsOwner();
        });

        it('check invite with invalid email', function () {
            return agent
                .get('authentication/invitation?email=invalidemail')
                .expectStatus(400)
                .matchHeaderSnapshot({
                    etag: anyEtag
                });
        });

        it('check valid invite', async function () {
            await agent
                .get(`authentication/invitation?email=${fixtureManager.get('invites', 0).email}`)
                .expectStatus(200)
                .matchBodySnapshot()
                .matchHeaderSnapshot({
                    etag: anyEtag
                });
        });

        it('check invalid invite', async function () {
            await agent
                .get(`authentication/invitation?email=notinvited@example.org`)
                .expectStatus(200)
                .matchBodySnapshot()
                .matchHeaderSnapshot({
                    etag: anyEtag
                });
        });

        it('try to accept without invite', function () {
            return agent
                .post('authentication/invitation')
                .body({
                    invitation: [{
                        token: 'lul11111',
                        password: 'lel123456',
                        email: 'not-invited@example.org',
                        name: 'not invited'
                    }]
                })
                .expectStatus(404)
                .matchHeaderSnapshot({
                    etag: anyEtag
                });
        });

        it('try to accept with invite and existing email address', function () {
            return agent
                .post('authentication/invitation')
                .body({
                    invitation: [{
                        token: fixtureManager.get('invites', 0).token,
                        password: '12345678910',
                        email: fixtureManager.get('users', 0).email,
                        name: 'invited'
                    }]
                })
                .expectStatus(422)
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                })
                .matchHeaderSnapshot({
                    etag: anyEtag
                });
        });

        it('try to accept with invite', async function () {
            await agent
                .post('authentication/invitation')
                .body({
                    invitation: [{
                        token: fixtureManager.get('invites', 0).token,
                        password: '12345678910',
                        email: fixtureManager.get('invites', 0).email,
                        name: 'invited'
                    }]
                })
                .expectStatus(200)
                .matchBodySnapshot()
                .matchHeaderSnapshot({
                    etag: anyEtag
                });
        });
    });

    describe('Password reset', function () {
        const email = fixtureManager.get('users', 0).email;

        before(async function () {
            agent = await agentProvider.getAdminAPIAgent();
            await fixtureManager.init('invites');
            await agent.loginAsOwner();
        });

        beforeEach(function () {
            mockManager.mockMail();
        });

        afterEach(function () {
            mockManager.restore();
        });

        it('reset password', async function () {
            const ownerUser = await fixtureManager.getCurrentOwnerUser();

            const token = tokens.resetToken.generateHash({
                expires: Date.now() + (1000 * 60),
                email: email,
                dbHash: settingsCache.get('db_hash'),
                password: ownerUser.get('password')
            });

            await agent.put('authentication/passwordreset')
                .header('Accept', 'application/json')
                .body({
                    passwordreset: [{
                        token: token,
                        newPassword: 'thisissupersafe',
                        ne2Password: 'thisissupersafe'
                    }]
                })
                .expectStatus(200)
                .matchBodySnapshot()
                .matchHeaderSnapshot({
                    etag: anyEtag
                });
        });

        it('reset password: invalid token', async function () {
            await agent
                .put('authentication/passwordreset')
                .header('Accept', 'application/json')
                .body({
                    passwordreset: [{
                        token: 'invalid',
                        newPassword: 'thisissupersafe',
                        ne2Password: 'thisissupersafe'
                    }]
                })
                .expectStatus(401)
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                })
                .matchHeaderSnapshot({
                    etag: anyEtag
                });
        });

        it('reset password: expired token', async function () {
            const ownerUser = await fixtureManager.getCurrentOwnerUser();

            const dateInThePast = Date.now() - (1000 * 60);
            const token = tokens.resetToken.generateHash({
                expires: dateInThePast,
                email: email,
                dbHash: settingsCache.get('db_hash'),
                password: ownerUser.get('password')
            });

            await agent
                .put('authentication/passwordreset')
                .header('Accept', 'application/json')
                .body({
                    passwordreset: [{
                        token: token,
                        newPassword: 'thisissupersafe',
                        ne2Password: 'thisissupersafe'
                    }]
                })
                .expectStatus(400)
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                })
                .matchHeaderSnapshot({
                    etag: anyEtag
                });
        });

        it('reset password: unmatched token', async function () {
            const token = tokens.resetToken.generateHash({
                expires: Date.now() + (1000 * 60),
                email: email,
                dbHash: settingsCache.get('db_hash'),
                password: 'invalid_password'
            });

            await agent
                .put('authentication/passwordreset')
                .header('Accept', 'application/json')
                .body({
                    passwordreset: [{
                        token: token,
                        newPassword: 'thisissupersafe',
                        ne2Password: 'thisissupersafe'
                    }]
                })
                .expectStatus(400)
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                })
                .matchHeaderSnapshot({
                    etag: anyEtag
                });
        });

        it('reset password: generate reset token', async function () {
            await agent
                .post('authentication/passwordreset')
                .header('Accept', 'application/json')
                .body({
                    passwordreset: [{
                        email: email
                    }]
                })
                .expectStatus(200)
                .matchBodySnapshot()
                .matchHeaderSnapshot({
                    etag: anyEtag
                });
        });
    });

    describe('Reset all passwords', function () {
        before(async function () {
            agent = await agentProvider.getAdminAPIAgent();
            await fixtureManager.init('invites');
            await agent.loginAsOwner();
        });

        beforeEach(function () {
            mockManager.mockMail();
        });

        afterEach(function () {
            mockManager.restore();
        });

        it('reset all passwords returns 200', async function () {
            await agent.post('authentication/reset_all_passwords')
                .header('Accept', 'application/json')
                .body({})
                .expectStatus(200)
                .matchBodySnapshot()
                .matchHeaderSnapshot({
                    etag: anyEtag
                });

            // Check side effects
            // All users locked
            const users = await models.User.fetchAll();
            for (const user of users) {
                assert.equal(user.get('status'), 'locked', `Status should be locked for user ${user.get('email')}`);
            }

            // No session left
            const sessions = await models.Session.fetchAll();
            assert.equal(sessions.length, 0, 'There should be no sessions left in the DB');

            mockManager.assert.sentEmailCount(2);

            mockManager.assert.sentEmail({
                subject: 'Reset Password',
                to: 'jbloggs@example.com'
            });
            mockManager.assert.sentEmail({
                subject: 'Reset Password',
                to: 'ghost-author@example.com'
            });
        });
    });
});
