const {expect} = require('chai');
const {any} = require('expect');
const security = require('@tryghost/security');

const testUtils = require('../../../../utils/index');
const framework = require('../../../../utils/e2e-framework');
const models = require('../../../../../core/server/models/index');
const settingsCache = require('../../../../../core/shared/settings-cache');

describe('Authentication API canary', function () {
    let request;
    let emailStub;

    describe('Blog setup', function () {
        before(async function () {
            request = await framework.getAgent('/ghost/api/canary/admin/');
        });

        after(async function () {
            await framework.resetDb();
        });

        beforeEach(function () {
            emailStub = framework.stubMail();
        });

        afterEach(function () {
            framework.restoreMocks();
        });

        it('is setup? no', async function () {
            const res = await request
                .get('authentication/setup')
                .expect(200);

            expect(res.body).to.matchSnapshot();
            expect(res.headers).to.matchSnapshot({
                date: any(String),
                etag: any(String)
            });
        });

        it('complete setup', async function () {
            const res = await request
                .post('authentication/setup')
                .send({
                    setup: [{
                        name: 'test user',
                        email: 'test@example.com',
                        password: 'thisissupersafe',
                        blogTitle: 'a test blog'
                    }]
                })
                .expect('Content-Type', /json/)
                .expect(201);

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
        });

        it('is setup? yes', async function () {
            const res = await request
                .get('authentication/setup');

            expect(res.body).to.matchSnapshot();
            expect(res.headers).to.matchSnapshot({
                date: any(String),
                etag: any(String)
            });
        });

        it('complete setup again', function () {
            return request
                .post('authentication/setup')
                .send({
                    setup: [{
                        name: 'test user',
                        email: 'test-leo@example.com',
                        password: 'thisissupersafe',
                        blogTitle: 'a test blog'
                    }]
                })
                .expect('Content-Type', /json/)
                .expect(403);
        });

        it('update setup', async function () {
            await framework.initFixtures();
            await request.loginAsOwner();

            const res = await request
                .put('authentication/setup')
                .send({
                    setup: [{
                        name: 'test user edit',
                        email: 'test-edit@example.com',
                        password: 'thisissupersafe',
                        blogTitle: 'a test blog'
                    }]
                })
                .expect('Content-Type', /json/)
                .expect(200);

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
            request = await framework.getAgent('/ghost/api/canary/admin/');
            // NOTE: this order of fixture initialization boggles me. Ideally should not depend on agent/login sequence
            await framework.initFixtures('invites');
            await request.loginAsOwner();
        });

        after(async function () {
            await framework.resetDb();
        });

        it('check invite with invalid email', function () {
            return request
                .get('authentication/invitation?email=invalidemail')
                .expect('Content-Type', /json/)
                .expect(400);
        });

        it('check valid invite', async function () {
            const res = await request
                .get(`authentication/invitation?email=${testUtils.DataGenerator.forKnex.invites[0].email}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body).to.matchSnapshot();
        });

        it('check invalid invite', async function () {
            const res = await request
                .get(`authentication/invitation?email=notinvited@example.org`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body).to.matchSnapshot();
        });

        it('try to accept without invite', function () {
            return request
                .post('authentication/invitation')
                .send({
                    invitation: [{
                        token: 'lul11111',
                        password: 'lel123456',
                        email: 'not-invited@example.org',
                        name: 'not invited'
                    }]
                })
                .expect('Content-Type', /json/)
                .expect(404);
        });

        it('try to accept with invite and existing email address', function () {
            return request
                .post('authentication/invitation')
                .send({
                    invitation: [{
                        token: testUtils.DataGenerator.forKnex.invites[0].token,
                        password: '12345678910',
                        email: testUtils.DataGenerator.forKnex.users[0].email,
                        name: 'invited'
                    }]
                })
                .expect('Content-Type', /json/)
                .expect(422);
        });

        it('try to accept with invite', async function () {
            const res = await request
                .post('authentication/invitation')
                .send({
                    invitation: [{
                        token: testUtils.DataGenerator.forKnex.invites[0].token,
                        password: '12345678910',
                        email: testUtils.DataGenerator.forKnex.invites[0].email,
                        name: 'invited'
                    }]
                })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body).to.matchSnapshot();
        });
    });

    describe('Password reset', function () {
        const user = testUtils.DataGenerator.forModel.users[0];

        before(async function () {
            request = await framework.getAgent('/ghost/api/canary/admin/');
            // NOTE: this order of fixture initialization boggles me. Ideally should not depend on agent/login sequence
            await framework.initFixtures('invites');
            await request.loginAsOwner();
        });

        after(async function () {
            await framework.resetDb();
        });

        beforeEach(function () {
            emailStub = framework.stubMail();
        });

        afterEach(function () {
            framework.restoreMocks();
        });

        it('reset password', async function () {
            const ownerUser = await models.User.getOwnerUser(testUtils.context.internal);

            const token = security.tokens.resetToken.generateHash({
                expires: Date.now() + (1000 * 60),
                email: user.email,
                dbHash: settingsCache.get('db_hash'),
                password: ownerUser.get('password')
            });

            const res = await request.put('authentication/passwordreset')
                .set('Accept', 'application/json')
                .send({
                    passwordreset: [{
                        token: token,
                        newPassword: 'thisissupersafe',
                        ne2Password: 'thisissupersafe'
                    }]
                })
                .expect(200);

            expect(res.body).to.matchSnapshot();
            expect(res.headers).to.matchSnapshot({
                date: any(String),
                etag: any(String)
            });
        });

        it('reset password: invalid token', async function () {
            const res = await request
                .put('authentication/passwordreset')
                .set('Accept', 'application/json')
                .send({
                    passwordreset: [{
                        token: 'invalid',
                        newPassword: 'thisissupersafe',
                        ne2Password: 'thisissupersafe'
                    }]
                })
                .expect(401);

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

            const res = await request
                .put('authentication/passwordreset')
                .set('Accept', 'application/json')
                .send({
                    passwordreset: [{
                        token: token,
                        newPassword: 'thisissupersafe',
                        ne2Password: 'thisissupersafe'
                    }]
                })
                .expect(400);

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

            const res = await request
                .put('authentication/passwordreset')
                .set('Accept', 'application/json')
                .send({
                    passwordreset: [{
                        token: token,
                        newPassword: 'thisissupersafe',
                        ne2Password: 'thisissupersafe'
                    }]
                })
                .expect(400);

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
            const res = await request
                .post('authentication/passwordreset')
                .set('Accept', 'application/json')
                .send({
                    passwordreset: [{
                        email: user.email
                    }]
                })
                .expect(200);

            expect(res.body).to.matchSnapshot();
            expect(res.headers).to.matchSnapshot({
                date: any(String),
                etag: any(String)
            });
        });
    });

    describe('Reset all passwords', function () {
        let sendEmail;
        before(async function () {
            request = await framework.getAgent('/ghost/api/canary/admin/');
            // NOTE: this order of fixture initialization boggles me. Ideally should not depend on agent/login sequence
            await framework.initFixtures('invites');
            await request.loginAsOwner();
        });

        after(async function () {
            await framework.resetDb();
        });

        beforeEach(function () {
            emailStub = framework.stubMail();
        });

        afterEach(function () {
            framework.restoreMocks();
        });

        it('reset all passwords returns 200', async function () {
            const res = await request.post('authentication/reset_all_passwords')
                .set('Accept', 'application/json')
                .send({})
                .expect(200);

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
        });
    });
});
