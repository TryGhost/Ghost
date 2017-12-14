var should = require('should'),
    supertest = require('supertest'),
    testUtils = require('../../../utils'),
    moment = require('moment'),
    user = testUtils.DataGenerator.forModel.users[0],
    userForKnex = testUtils.DataGenerator.forKnex.users[0],
    models = require('../../../../../core/server/models'),
    config = require('../../../../../core/server/config'),
    security = require('../../../../../core/server/lib/security'),
    ghost = testUtils.startGhost,
    request;

describe('Authentication API', function () {
    var accesstoken = '', ghostServer;

    before(function () {
        return ghost()
            .then(function (_ghostServer) {
                ghostServer = _ghostServer;
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return testUtils.doAuth(request);
            })
            .then(function (token) {
                accesstoken = token;
            });
    });

    afterEach(function () {
        return testUtils.clearBruteData();
    });

    it('can authenticate', function (done) {
        request.post(testUtils.API.getApiQuery('authentication/token'))
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
        request.post(testUtils.API.getApiQuery('authentication/token'))
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
        request.post(testUtils.API.getApiQuery('authentication/token'))
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
        request.post(testUtils.API.getApiQuery('authentication/token'))
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

                    request.post(testUtils.API.getApiQuery('authentication/token'))
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
                                moment(refreshTokenModel.get('expires')).diff(moment(), 'month').should.be.above(5);
                                done();
                            });
                        });
                });
            });
    });

    it('can\'t request new access token with invalid refresh token', function (done) {
        request.post(testUtils.API.getApiQuery('authentication/token'))
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
        models.Settings
            .findOne({key: 'db_hash'})
            .then(function (response) {
                var token = security.tokens.resetToken.generateHash({
                    expires: Date.now() + (1000 * 60),
                    email: user.email,
                    dbHash: response.attributes.value,
                    password: userForKnex.password
                });

                request.put(testUtils.API.getApiQuery('authentication/passwordreset'))
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
});
