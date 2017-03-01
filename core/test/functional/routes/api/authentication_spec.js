var supertest = require('supertest'),
    should = require('should'),
    moment = require('moment'),
    testUtils = require('../../../utils'),
    user = testUtils.DataGenerator.forModel.users[0],
    ghost = require('../../../../../core'),
    models = require('../../../../../core/server/models'),
    config = require('../../../../../core/server/config'),
    request;

describe('Authentication API', function () {
    var accesstoken = '';

    before(function (done) {
        // starting ghost automatically populates the db
        // TODO: prevent db init, and manage bringing up the DB with fixtures ourselves
        ghost().then(function (ghostServer) {
            request = supertest.agent(ghostServer.rootApp);
        }).then(function () {
            return testUtils.doAuth(request);
        }).then(function (token) {
            accesstoken = token;
            done();
        }).catch(done);
    });

    after(function (done) {
        testUtils.clearData().then(function () {
            done();
        }).catch(done);
    });

    it('can authenticate', function (done) {
        request.post(testUtils.API.getApiQuery('authentication/token'))
            .set('Origin', config.url)
            .send({
                grant_type: 'password',
                username: user.email,
                password: user.password,
                client_id: 'ghost-admin',
                client_secret: 'not_available'
            }).expect('Content-Type', /json/)
        // TODO: make it possible to override oauth2orize's header so that this is consistent
            .expect('Cache-Control', 'no-store')
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                should.exist(jsonResponse.access_token);
                should.exist(jsonResponse.refresh_token);
                should.exist(jsonResponse.expires_in);
                should.exist(jsonResponse.token_type);
                done();
            });
    });

    it('can\'t authenticate unknown user', function (done) {
        request.post(testUtils.API.getApiQuery('authentication/token'))
            .set('Origin', config.url)
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
            .set('Origin', config.url)
            .send({
                grant_type: 'password',
                username: user.email,
                password: 'invalid',
                client_id: 'ghost-admin',
                client_secret: 'not_available'
            }).expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(401)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                var jsonResponse = res.body;
                should.exist(jsonResponse.errors[0].errorType);
                jsonResponse.errors[0].errorType.should.eql('UnauthorizedError');
                done();
            });
    });

    it('can request new access token', function (done) {
        request.post(testUtils.API.getApiQuery('authentication/token'))
            .set('Origin', config.url)
            .send({
                grant_type: 'password',
                username: user.email,
                password: user.password,
                client_id: 'ghost-admin',
                client_secret: 'not_available'
            }).expect('Content-Type', /json/)
            // TODO: make it possible to override oauth2orize's header so that this is consistent
            .expect('Cache-Control', 'no-store')
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                var refreshToken = res.body.refresh_token;
                request.post(testUtils.API.getApiQuery('authentication/token'))
                    .set('Origin', config.url)
                    .send({
                        grant_type: 'refresh_token',
                        refresh_token: refreshToken,
                        client_id: 'ghost-admin',
                        client_secret: 'not_available'
                    }).expect('Content-Type', /json/)
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
                        done();
                    });
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
                                done();
                            });
                        });
                });
            });
    });

    it('can\'t request new access token with invalid refresh token', function (done) {
        request.post(testUtils.API.getApiQuery('authentication/token'))
            .set('Origin', config.url)
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

    it('exchange one time access token on setup', function (done) {
        testUtils.fixtures.insertAccessToken({
            expires: Date.now() + 3600000,
            token: 'one-time-token',
            user_id: 1,
            client_id: 2
        }).then(function () {
            request.post(testUtils.API.getApiQuery('authentication/setup/three'))
                .set('Origin', config.url)
                .send({
                    token: 'one-time-token',
                    client_id: 'ghost-admin',
                    client_secret: 'not_available'
                })
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.exist(res.body.access_token);
                    should.exist(res.body.refresh_token);
                    should.exist(res.body.expires_in);

                    models.Accesstoken.findOne({
                        token: 'one-time-token'
                    }).then(function (found) {
                        should.not.exist(found);
                        done();
                    });
                });
        }).catch(done);
    });

    it('[failure] wrong AT', function (done) {
        request.post(testUtils.API.getApiQuery('authentication/setup/three'))
            .set('Origin', config.url)
            .send({
                token: 'wrong',
                client_id: 'ghost-admin',
                client_secret: 'not_available'
            })
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(403)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                should.not.exist(res.body.access_token);
                should.not.exist(res.body.refresh_token);
                should.not.exist(res.body.expires_in);

                done();
            });
    });

    it('[failure] expired AT', function (done) {
        testUtils.fixtures.insertAccessToken({
            expires: Date.now() - 1000,
            token: 'one-time-token',
            user_id: 1,
            client_id: 2
        }).then(function () {
            request.post(testUtils.API.getApiQuery('authentication/setup/three'))
                .set('Origin', config.url)
                .send({
                    token: 'one-time-token',
                    client_id: 'ghost-admin',
                    client_secret: 'not_available'
                })
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(403)
                .end(function (err) {
                    if (err) {
                        return done(err);
                    }

                    done();
                });
        }).catch(done);
    });
});
