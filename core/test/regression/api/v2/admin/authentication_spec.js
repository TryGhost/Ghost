const should = require('should');
const sinon = require('sinon');
const supertest = require('supertest');
const localUtils = require('./utils');
const testUtils = require('../../../../utils/index');
const models = require('../../../../../server/models/index');
const security = require('../../../../../server/lib/security/index');
const settingsCache = require('../../../../../server/services/settings/cache');
const config = require('../../../../../server/config/index');
const mailService = require('../../../../../server/services/mail/index');
const configUtils = require('../../../../utils/configUtils');

let ghost = testUtils.startGhost;
let request;

describe('Authentication API v2', function () {
    let ghostServer;

    describe('Blog setup: default config', function () {
        before(function () {
            return ghost({forceStart: true})
                .then(function (_ghostServer) {
                    ghostServer = _ghostServer;
                    request = supertest.agent(config.get('url'));
                });
        });

        beforeEach(function () {
            sinon.stub(mailService.GhostMailer.prototype, 'send').resolves('Mail is disabled');
        });

        afterEach(function () {
            sinon.restore();
        });

        it('is setup? no', function () {
            return request
                .get(localUtils.API.getApiQuery('authentication/setup'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect(200)
                .then((res) => {
                    res.body.setup[0].status.should.be.false();
                });
        });

        it('complete setup', function () {
            return request
                .post(localUtils.API.getApiQuery('authentication/setup'))
                .set('Origin', config.get('url'))
                .send({
                    setup: [{
                        name: 'test user',
                        email: 'test@example.com',
                        password: 'thisissupersafe',
                        blogTitle: 'a test blog'
                    }]
                })
                .expect('Content-Type', /json/)
                .expect(201)
                .then((res) => {
                    const jsonResponse = res.body;
                    should.exist(jsonResponse.users);
                    should.not.exist(jsonResponse.meta);

                    jsonResponse.users.should.have.length(1);
                    localUtils.API.checkResponse(jsonResponse.users[0], 'user');

                    const newUser = jsonResponse.users[0];
                    newUser.id.should.equal(testUtils.DataGenerator.Content.users[0].id);
                    newUser.name.should.equal('test user');
                    newUser.email.should.equal('test@example.com');

                    mailService.GhostMailer.prototype.send.called.should.be.true();
                    mailService.GhostMailer.prototype.send.args[0][0].to.should.equal('test@example.com');
                });
        });

        it('is setup? yes', function () {
            return request
                .get(localUtils.API.getApiQuery('authentication/setup'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect(200)
                .then((res) => {
                    res.body.setup[0].status.should.be.true();
                });
        });

        it('complete setup again', function () {
            return request
                .post(localUtils.API.getApiQuery('authentication/setup'))
                .set('Origin', config.get('url'))
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

        it('update setup', function () {
            return localUtils.doAuth(request)
                .then(() => {
                    return request
                        .put(localUtils.API.getApiQuery('authentication/setup'))
                        .set('Origin', config.get('url'))
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
                })
                .then((res) => {
                    const jsonResponse = res.body;
                    should.exist(jsonResponse.users);
                    should.not.exist(jsonResponse.meta);

                    jsonResponse.users.should.have.length(1);
                    localUtils.API.checkResponse(jsonResponse.users[0], 'user');

                    const newUser = jsonResponse.users[0];
                    newUser.id.should.equal(testUtils.DataGenerator.Content.users[0].id);
                    newUser.name.should.equal('test user edit');
                    newUser.email.should.equal('test-edit@example.com');
                });
        });
    });

    describe('Blog setup: custom config', function () {
        before(function () {
            return ghost({forceStart: true})
                .then(function (_ghostServer) {
                    ghostServer = _ghostServer;
                    request = supertest.agent(config.get('url'));
                });
        });

        beforeEach(function () {
            configUtils.set({
                sendWelcomeEmail: false // Default value is false in pro
            });
            sinon.stub(mailService.GhostMailer.prototype, 'send').resolves('Mail is disabled');
        });

        afterEach(function () {
            configUtils.restore();
            sinon.restore();
        });

        it('is setup? no', function () {
            return request
                .get(localUtils.API.getApiQuery('authentication/setup'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect(200)
                .then((res) => {
                    res.body.setup[0].status.should.be.false();
                });
        });

        it('complete setup', function () {
            return request
                .post(localUtils.API.getApiQuery('authentication/setup'))
                .set('Origin', config.get('url'))
                .send({
                    setup: [{
                        name: 'test user',
                        email: 'test@example.com',
                        password: 'thisissupersafe',
                        blogTitle: 'a test blog'
                    }]
                })
                .expect('Content-Type', /json/)
                .expect(201)
                .then((res) => {
                    const jsonResponse = res.body;
                    should.exist(jsonResponse.users);
                    should.not.exist(jsonResponse.meta);

                    jsonResponse.users.should.have.length(1);
                    localUtils.API.checkResponse(jsonResponse.users[0], 'user');

                    const newUser = jsonResponse.users[0];
                    newUser.id.should.equal(testUtils.DataGenerator.Content.users[0].id);
                    newUser.name.should.equal('test user');
                    newUser.email.should.equal('test@example.com');

                    mailService.GhostMailer.prototype.send.called.should.be.false();
                });
        });

        it('is setup? yes', function () {
            return request
                .get(localUtils.API.getApiQuery('authentication/setup'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect(200)
                .then((res) => {
                    res.body.setup[0].status.should.be.true();
                });
        });

        it('complete setup again', function () {
            return request
                .post(localUtils.API.getApiQuery('authentication/setup'))
                .set('Origin', config.get('url'))
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

        it('update setup', function () {
            return localUtils.doAuth(request)
                .then(() => {
                    return request
                        .put(localUtils.API.getApiQuery('authentication/setup'))
                        .set('Origin', config.get('url'))
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
                })
                .then((res) => {
                    const jsonResponse = res.body;
                    should.exist(jsonResponse.users);
                    should.not.exist(jsonResponse.meta);

                    jsonResponse.users.should.have.length(1);
                    localUtils.API.checkResponse(jsonResponse.users[0], 'user');

                    const newUser = jsonResponse.users[0];
                    newUser.id.should.equal(testUtils.DataGenerator.Content.users[0].id);
                    newUser.name.should.equal('test user edit');
                    newUser.email.should.equal('test-edit@example.com');
                });
        });
    });

    describe('Invitation', function () {
        before(function () {
            return ghost()
                .then(function (_ghostServer) {
                    ghostServer = _ghostServer;
                    request = supertest.agent(config.get('url'));

                    // simulates blog setup (initialises the owner)
                    return localUtils.doAuth(request, 'invites');
                });
        });

        it('check invite with invalid email', function () {
            return request
                .get(localUtils.API.getApiQuery('authentication/invitation?email=invalidemail'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect(400);
        });

        it('check valid invite', function () {
            return request
                .get(localUtils.API.getApiQuery(`authentication/invitation?email=${testUtils.DataGenerator.forKnex.invites[0].email}`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect(200)
                .then((res) => {
                    res.body.invitation[0].valid.should.equal(true);
                });
        });

        it('check invalid invite', function () {
            return request
                .get(localUtils.API.getApiQuery(`authentication/invitation?email=notinvited@example.org`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect(200)
                .then((res) => {
                    res.body.invitation[0].valid.should.equal(false);
                });
        });

        it('try to accept without invite', function () {
            return request
                .post(localUtils.API.getApiQuery('authentication/invitation'))
                .set('Origin', config.get('url'))
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

        it('try to accept with invite', function () {
            return request
                .post(localUtils.API.getApiQuery('authentication/invitation'))
                .set('Origin', config.get('url'))
                .send({
                    invitation: [{
                        token: testUtils.DataGenerator.forKnex.invites[0].token,
                        password: '12345678910',
                        email: testUtils.DataGenerator.forKnex.invites[0].email,
                        name: 'invited'
                    }]
                })
                .expect('Content-Type', /json/)
                .expect(200)
                .then((res) => {
                    res.body.invitation[0].message.should.equal('Invitation accepted.');
                });
        });
    });

    describe('Password reset', function () {
        const user = testUtils.DataGenerator.forModel.users[0];

        before(function () {
            return ghost({forceStart: true})
                .then(() => {
                    request = supertest.agent(config.get('url'));
                })
                .then(() => {
                    return localUtils.doAuth(request);
                });
        });

        beforeEach(function () {
            sinon.stub(mailService.GhostMailer.prototype, 'send').resolves('Mail is disabled');
        });

        afterEach(function () {
            sinon.restore();
        });

        it('reset password', function (done) {
            models.User.getOwnerUser(testUtils.context.internal)
                .then(function (ownerUser) {
                    var token = security.tokens.resetToken.generateHash({
                        expires: Date.now() + (1000 * 60),
                        email: user.email,
                        dbHash: settingsCache.get('db_hash'),
                        password: ownerUser.get('password')
                    });

                    request.put(localUtils.API.getApiQuery('authentication/passwordreset'))
                        .set('Origin', config.get('url'))
                        .set('Accept', 'application/json')
                        .send({
                            passwordreset: [{
                                token: token,
                                newPassword: 'thisissupersafe',
                                ne2Password: 'thisissupersafe'
                            }]
                        })
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }

                            const jsonResponse = res.body;
                            should.exist(jsonResponse.passwordreset[0].message);
                            jsonResponse.passwordreset[0].message.should.equal('Password changed successfully.');
                            done();
                        });
                })
                .catch(done);
        });

        it('reset password: invalid token', function () {
            return request
                .put(localUtils.API.getApiQuery('authentication/passwordreset'))
                .set('Origin', config.get('url'))
                .set('Accept', 'application/json')
                .send({
                    passwordreset: [{
                        token: 'invalid',
                        newPassword: 'thisissupersafe',
                        ne2Password: 'thisissupersafe'
                    }]
                })
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(401);
        });

        it('reset password: generate reset token', function () {
            return request
                .post(localUtils.API.getApiQuery('authentication/passwordreset'))
                .set('Origin', config.get('url'))
                .set('Accept', 'application/json')
                .send({
                    passwordreset: [{
                        email: user.email
                    }]
                })
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .then((res) => {
                    const jsonResponse = res.body;
                    should.exist(jsonResponse.passwordreset[0].message);
                    jsonResponse.passwordreset[0].message.should.equal('Check your email for further instructions.');
                    mailService.GhostMailer.prototype.send.args[0][0].to.should.equal(user.email);
                });
        });
    });
});
