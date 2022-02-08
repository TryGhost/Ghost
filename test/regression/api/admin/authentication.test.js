const {expect} = require('chai');
const {agentProvider, mockManager, fixtureManager, matchers} = require('../../../utils/e2e-framework');
const {anyEtag, anyDate, anyErrorId} = matchers;

const security = require('@tryghost/security');
const models = require('../../../../core/server/models');
const settingsCache = require('../../../../core/shared/settings-cache');

// Requires needed to enable a labs flag
const sinon = require('sinon');
const configUtils = require('../../../utils/configUtils');

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
            // Enable the improvedOnboarding flag
            configUtils.set('enableDeveloperExperiments', true);
            sinon.stub(settingsCache, 'get');
            settingsCache.get.withArgs('labs').returns({
                improvedOnboarding: true
            });
            settingsCache.get.callThrough();

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

            expect(await settingsCache.get('active_theme')).to.eq('dawn');
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
            // NOTE: this order of fixture initialization boggles me. Ideally should not depend on agent/login sequence
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

            const token = security.tokens.resetToken.generateHash({
                expires: Date.now() + (1000 * 60),
                email: email,
                dbHash: settingsCache.get('db_hash'),
                password: ownerUser.get('password')
            });

            const res = await agent.put('authentication/passwordreset')
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
            const token = security.tokens.resetToken.generateHash({
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
            const token = security.tokens.resetToken.generateHash({
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
                expect(user.get('status')).to.equal('locked');
            }

            // No session left
            const sessions = await models.Session.fetchAll();
            expect(sessions.length).to.equal(0);

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
