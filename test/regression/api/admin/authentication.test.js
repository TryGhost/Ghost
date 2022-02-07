const {expect} = require('chai');
const {any} = require('expect');
const security = require('@tryghost/security');

const testUtils = require('../../../utils');
const {agentProvider, mockManager, fixtureManager} = require('../../../utils/e2e-framework');
const models = require('../../../../core/server/models');
const settingsCache = require('../../../../core/shared/settings-cache');

// Requires needed to enable a labs flag
const sinon = require('sinon');
const configUtils = require('../../../utils/configUtils');

describe('Authentication API canary', function () {
    let agent;
    let emailStub;

    describe('Blog setup', function () {
        before(async function () {
            agent = await agentProvider.getAgent('/ghost/api/canary/admin/');
        });

        beforeEach(function () {
            emailStub = mockManager.mockMail();
        });

        afterEach(function () {
            mockManager.restore();
        });

        it('is setup? no', async function () {
            const res = await agent
                .get('authentication/setup')
                .expectStatus(200);

            expect(res.body).to.matchSnapshot();
            expect(res.headers).to.matchSnapshot({
                date: any(String),
                etag: any(String)
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

            const res = await agent
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
                .expectHeader('Content-Type', 'application/json; charset=utf-8')
                .expectStatus(201);

            expect(res.body).to.matchSnapshot({
                users: [{
                    created_at: any(Date),
                    updated_at: any(Date)
                }]
            });
            expect(res.headers).to.matchSnapshot({
                date: any(String),
                etag: any(String)
            });

            expect(emailStub.called).to.be.true;

            expect(await settingsCache.get('active_theme')).to.eq('dawn');
        });

        it('is setup? yes', async function () {
            const res = await agent
                .get('authentication/setup');

            expect(res.body).to.matchSnapshot();
            expect(res.headers).to.matchSnapshot({
                date: any(String),
                etag: any(String)
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
                .expectHeader('Content-Type', 'application/json; charset=utf-8')
                .expectStatus(403);
        });

        it('update setup', async function () {
            await fixtureManager.init();
            await agent.loginAsOwner();

            const res = await agent
                .put('authentication/setup')
                .body({
                    setup: [{
                        name: 'test user edit',
                        email: 'test-edit@example.com',
                        password: 'thisissupersafe',
                        blogTitle: 'a test blog'
                    }]
                })
                .expectHeader('Content-Type', 'application/json; charset=utf-8')
                .expectStatus(200);

            expect(res.body).to.matchSnapshot({
                users: [{
                    created_at: any(String),
                    last_seen: any(String),
                    updated_at: any(String)
                }]
            });
            expect(res.headers).to.matchSnapshot({
                date: any(String),
                etag: any(String)
            });
        });
    });

    describe('Invitation', function () {
        before(async function () {
            agent = await agentProvider.getAgent('/ghost/api/canary/admin/');
            // NOTE: this order of fixture initialization boggles me. Ideally should not depend on agent/login sequence
            await fixtureManager.init('invites');
            await agent.loginAsOwner();
        });

        it('check invite with invalid email', function () {
            return agent
                .get('authentication/invitation?email=invalidemail')
                .expectHeader('Content-Type', 'application/json; charset=utf-8')
                .expectStatus(400);
        });

        it('check valid invite', async function () {
            const res = await agent
                .get(`authentication/invitation?email=${testUtils.DataGenerator.forKnex.invites[0].email}`)
                .expectHeader('Content-Type', 'application/json; charset=utf-8')
                .expectStatus(200);

            expect(res.body).to.matchSnapshot();
        });

        it('check invalid invite', async function () {
            const res = await agent
                .get(`authentication/invitation?email=notinvited@example.org`)
                .expectHeader('Content-Type', 'application/json; charset=utf-8')
                .expectStatus(200);

            expect(res.body).to.matchSnapshot();
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
                .expectHeader('Content-Type', 'application/json; charset=utf-8')
                .expectStatus(404);
        });

        it('try to accept with invite and existing email address', function () {
            return agent
                .post('authentication/invitation')
                .body({
                    invitation: [{
                        token: testUtils.DataGenerator.forKnex.invites[0].token,
                        password: '12345678910',
                        email: testUtils.DataGenerator.forKnex.users[0].email,
                        name: 'invited'
                    }]
                })
                .expectHeader('Content-Type', 'application/json; charset=utf-8')
                .expectStatus(422);
        });

        it('try to accept with invite', async function () {
            const res = await agent
                .post('authentication/invitation')
                .body({
                    invitation: [{
                        token: testUtils.DataGenerator.forKnex.invites[0].token,
                        password: '12345678910',
                        email: testUtils.DataGenerator.forKnex.invites[0].email,
                        name: 'invited'
                    }]
                })
                .expectHeader('Content-Type', 'application/json; charset=utf-8')
                .expectStatus(200);

            expect(res.body).to.matchSnapshot();
        });
    });

    describe('Password reset', function () {
        const user = testUtils.DataGenerator.forModel.users[0];

        before(async function () {
            agent = await agentProvider.getAgent('/ghost/api/canary/admin/');
            // NOTE: this order of fixture initialization boggles me. Ideally should not depend on agent/login sequence
            await fixtureManager.init('invites');
            await agent.loginAsOwner();
        });

        beforeEach(function () {
            emailStub = mockManager.mockMail();
        });

        afterEach(function () {
            mockManager.restore();
        });

        it('reset password', async function () {
            const ownerUser = await models.User.getOwnerUser(testUtils.context.internal);

            const token = security.tokens.resetToken.generateHash({
                expires: Date.now() + (1000 * 60),
                email: user.email,
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
                .expectStatus(200);

            expect(res.body).to.matchSnapshot();
            expect(res.headers).to.matchSnapshot({
                date: any(String),
                etag: any(String)
            });
        });

        it('reset password: invalid token', async function () {
            const res = await agent
                .put('authentication/passwordreset')
                .header('Accept', 'application/json')
                .body({
                    passwordreset: [{
                        token: 'invalid',
                        newPassword: 'thisissupersafe',
                        ne2Password: 'thisissupersafe'
                    }]
                })
                .expectStatus(401);

            expect(res.body).to.matchSnapshot({
                errors: [{
                    id: any(String)
                }]
            });
            expect(res.headers).to.matchSnapshot({
                date: any(String),
                etag: any(String)
            });
        });

        it('reset password: expired token', async function () {
            const ownerUser = await models.User.getOwnerUser(testUtils.context.internal);

            const dateInThePast = Date.now() - (1000 * 60);
            const token = security.tokens.resetToken.generateHash({
                expires: dateInThePast,
                email: user.email,
                dbHash: settingsCache.get('db_hash'),
                password: ownerUser.get('password')
            });

            const res = await agent
                .put('authentication/passwordreset')
                .header('Accept', 'application/json')
                .body({
                    passwordreset: [{
                        token: token,
                        newPassword: 'thisissupersafe',
                        ne2Password: 'thisissupersafe'
                    }]
                })
                .expectStatus(400);

            expect(res.body).to.matchSnapshot({
                errors: [{
                    id: any(String)
                }]
            });
            expect(res.headers).to.matchSnapshot({
                date: any(String),
                etag: any(String)
            });
        });

        it('reset password: unmatched token', async function () {
            const token = security.tokens.resetToken.generateHash({
                expires: Date.now() + (1000 * 60),
                email: user.email,
                dbHash: settingsCache.get('db_hash'),
                password: 'invalid_password'
            });

            const res = await agent
                .put('authentication/passwordreset')
                .header('Accept', 'application/json')
                .body({
                    passwordreset: [{
                        token: token,
                        newPassword: 'thisissupersafe',
                        ne2Password: 'thisissupersafe'
                    }]
                })
                .expectStatus(400);

            expect(res.body).to.matchSnapshot({
                errors: [{
                    id: any(String)
                }]
            });
            expect(res.headers).to.matchSnapshot({
                date: any(String),
                etag: any(String)
            });
        });

        it('reset password: generate reset token', async function () {
            const res = await agent
                .post('authentication/passwordreset')
                .header('Accept', 'application/json')
                .body({
                    passwordreset: [{
                        email: user.email
                    }]
                })
                .expectStatus(200);

            expect(res.body).to.matchSnapshot();
            expect(res.headers).to.matchSnapshot({
                date: any(String),
                etag: any(String)
            });
        });
    });

    describe('Reset all passwords', function () {
        before(async function () {
            agent = await agentProvider.getAgent('/ghost/api/canary/admin/');
            // NOTE: this order of fixture initialization boggles me. Ideally should not depend on agent/login sequence
            await fixtureManager.init('invites');
            await agent.loginAsOwner();
        });

        beforeEach(function () {
            emailStub = mockManager.mockMail();
        });

        afterEach(function () {
            mockManager.restore();
        });

        it('reset all passwords returns 200', async function () {
            const res = await agent.post('authentication/reset_all_passwords')
                .header('Accept', 'application/json')
                .body({})
                .expectStatus(200);

            expect(res.body).to.matchSnapshot();
            expect(res.headers).to.matchSnapshot({
                date: any(String),
                etag: any(String)
            });

            // All users locked
            const users = await models.User.fetchAll();
            for (const user of users) {
                expect(user.get('status')).to.equal('locked');
            }

            // No session left
            const sessions = await models.Session.fetchAll();
            expect(sessions.length).to.equal(0);

            expect(emailStub.callCount).to.equal(2);
            expect(emailStub.firstCall.args[0].subject).to.equal('Reset Password');
            expect(emailStub.secondCall.args[0].subject).to.equal('Reset Password');
            expect(emailStub.firstCall.args[0].to).to.equal('jbloggs@example.com');
            expect(emailStub.secondCall.args[0].to).to.equal('ghost-author@example.com');
        });
    });
});
