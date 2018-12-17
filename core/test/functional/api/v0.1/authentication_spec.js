var should = require('should'),
    supertest = require('supertest'),
    testUtils = require('../../../utils'),
    localUtils = require('./utils'),
    moment = require('moment'),
    user = testUtils.DataGenerator.forModel.users[0],
    models = require('../../../../../core/server/models'),
    constants = require('../../../../../core/server/lib/constants'),
    config = require('../../../../../core/server/config'),
    security = require('../../../../../core/server/lib/security'),
    settingsCache = require('../../../../../core/server/services/settings/cache'),
    ghost = testUtils.startGhost,
    request;

describe('Authentication API', function () {
    var accesstoken = '', ghostServer;

    describe('auth & authorize', function () {
        before(function () {
            return ghost()
                .then(function (_ghostServer) {
                    ghostServer = _ghostServer;
                    request = supertest.agent(config.get('url'));
                })
                .then(function () {
                    return localUtils.doAuth(request);
                })
                .then(function (token) {
                    accesstoken = token;
                });
        });

        afterEach(function () {
            return testUtils.clearBruteData();
        });

        it('can authenticate', function (done) {
            request.post(localUtils.API.getApiQuery('authentication/token'))
                .set('Origin', config.get('url'))
                .send({
                    grant_type: 'password',
                    username: user.email,
                    password: user.password,
                    client_id: 'ghost-admin',
                    client_secret: 'not_available'
                })
                .expect('Content-Type', /json/)
                // TODO: make it possible to override oauth2orize's header so that this is consistent
                .expect('Cache-Control', 'no-store')
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    should.not.exist(res.headers['x-cache-invalidate']);
                    var jsonResponse = res.body,
                        newAccessToken;

                    should.exist(jsonResponse.access_token);
                    should.exist(jsonResponse.refresh_token);
                    should.exist(jsonResponse.expires_in);
                    should.exist(jsonResponse.token_type);

                    models.Accesstoken.findOne({
                        token: jsonResponse.access_token
                    }).then(function (_newAccessToken) {
                        newAccessToken = _newAccessToken;

                        return models.Refreshtoken.findOne({
                            token: jsonResponse.refresh_token
                        });
                    }).then(function (newRefreshToken) {
                        newAccessToken.get('issued_by').should.eql(newRefreshToken.id);
                        done();
                    }).catch(done);
                });
        });

        it('can\'t authenticate unknown user', function (done) {
            request.post(localUtils.API.getApiQuery('authentication/token'))
                .set('Origin', config.get('url'))
                .set('Accept', 'application/json')
                .send({
                    grant_type: 'password',
                    username: 'invalid@email.com',
                    password: user.password,
                    client_id: 'ghost-admin',
                    client_secret: 'not_available'
                }).expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(404)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    var jsonResponse = res.body;
                    should.exist(jsonResponse.errors[0].errorType);
                    jsonResponse.errors[0].errorType.should.eql('NotFoundError');
                    done();
                });
        });

        it('can\'t authenticate invalid password user', function (done) {
            request.post(localUtils.API.getApiQuery('authentication/token'))
                .set('Origin', config.get('url'))
                .set('Accept', 'application/json')
                .send({
                    grant_type: 'password',
                    username: user.email,
                    password: 'invalid',
                    client_id: 'ghost-admin',
                    client_secret: 'not_available'
                }).expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(422)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    var jsonResponse = res.body;
                    should.exist(jsonResponse.errors[0].errorType);
                    jsonResponse.errors[0].errorType.should.eql('ValidationError');
                    done();
                });
        });

        it('can request new access token', function (done) {
            request.post(localUtils.API.getApiQuery('authentication/token'))
                .set('Origin', config.get('url'))
                .send({
                    grant_type: 'password',
                    username: user.email,
                    password: user.password,
                    client_id: 'ghost-admin',
                    client_secret: 'not_available'
                })
                .expect('Content-Type', /json/)
                // TODO: make it possible to override oauth2orize's header so that this is consistent
                .expect('Cache-Control', 'no-store')
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    var refreshToken = res.body.refresh_token;

                    models.Accesstoken.findOne({
                        token: accesstoken
                    }).then(function (oldAccessToken) {
                        moment(oldAccessToken.get('expires')).diff(moment(), 'minutes').should.be.above(6);

                        request.post(localUtils.API.getApiQuery('authentication/token'))
                            .set('Origin', config.get('url'))
                            .set('Authorization', 'Bearer ' + accesstoken)
                            .send({
                                grant_type: 'refresh_token',
                                refresh_token: refreshToken,
                                client_id: 'ghost-admin',
                                client_secret: 'not_available'
                            })
                            .expect('Content-Type', /json/)
                            // TODO: make it possible to override oauth2orize's header so that this is consistent
                            .expect('Cache-Control', 'no-store')
                            .expect(200)
                            .end(function (err, res) {
                                if (err) {
                                    return done(err);
                                }

                                var jsonResponse = res.body;
                                should.exist(jsonResponse.access_token);
                                should.exist(jsonResponse.expires_in);

                                models.Accesstoken.findOne({
                                    token: accesstoken
                                }).then(function (oldAccessToken) {
                                    moment(oldAccessToken.get('expires')).diff(moment(), 'minutes').should.be.below(6);
                                    return models.Refreshtoken.findOne({
                                        token: refreshToken
                                    });
                                }).then(function (refreshTokenModel) {
                                    // NOTE: the static 6 month ms number in our constants are based on 30 days
                                    // We have to compare against the static number. We can't compare against the month in
                                    // the next 6 month dynamically, because each month has a different number of days,
                                    // which results in a different ms number.
                                    moment(Date.now() + constants.SIX_MONTH_MS)
                                        .startOf('day')
                                        .diff(moment(refreshTokenModel.get('expires')).startOf('day'), 'month').should.eql(0);

                                    done();
                                });
                            });
                    });
                });
        });

        it('can\'t request new access token with invalid refresh token', function (done) {
            request.post(localUtils.API.getApiQuery('authentication/token'))
                .set('Origin', config.get('url'))
                .set('Accept', 'application/json')
                .send({
                    grant_type: 'refresh_token',
                    refresh_token: 'invalid',
                    client_id: 'ghost-admin',
                    client_secret: 'not_available'
                }).expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(403)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    var jsonResponse = res.body;
                    should.exist(jsonResponse.errors[0].errorType);
                    jsonResponse.errors[0].errorType.should.eql('NoPermissionError');
                    done();
                });
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
                        .end(function (err) {
                            if (err) {
                                return done(err);
                            }

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

        it('revoke token', function () {
            return request
                .post(localUtils.API.getApiQuery('authentication/revoke'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .set('Origin', config.get('url'))
                .set('Accept', 'application/json')
                .send({
                    token: accesstoken,
                    token_type_hint: 'access_token'
                })
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .then(() => {
                    return request
                        .get(localUtils.API.getApiQuery('posts/'))
                        .set('Authorization', 'Bearer ' + accesstoken)
                        .expect(401);
                });
        });
    });

    describe('Blog setup', function () {
        before(function () {
            return ghost({forceStart: true})
                .then(function (_ghostServer) {
                    ghostServer = _ghostServer;
                    request = supertest.agent(config.get('url'));
                });
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
                .expect(200);
        });
    });
});
