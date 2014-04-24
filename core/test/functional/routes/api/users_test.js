/*global describe, it, before, after */
var supertest     = require('supertest'),
    express       = require('express'),
    should        = require('should'),
    _             = require('lodash'),
    testUtils     = require('../../../utils'),

    ghost         = require('../../../../../core'),

    httpServer,
    request,
    agent;


describe('User API', function () {
    var user = testUtils.DataGenerator.forModel.users[0],
        csrfToken = '';

    before(function (done) {
        var app = express();

        ghost({app: app}).then(function (_httpServer) {
            httpServer = _httpServer;
            // request = supertest(app);
            request = supertest.agent(app);

            testUtils.clearData()
                .then(function () {
                    return testUtils.initData();
                })
                .then(function () {
                    return testUtils.insertDefaultFixtures();
                })
                .then(function () {

                    request.get('/ghost/signin/')
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }

                            var pattern_meta = /<meta.*?name="csrf-param".*?content="(.*?)".*?>/i;
                            pattern_meta.should.exist;
                            csrfToken = res.text.match(pattern_meta)[1];

                            setTimeout(function () {
                                request.post('/ghost/signin/')
                                    .set('X-CSRF-Token', csrfToken)
                                    .send({email: user.email, password: user.password})
                                    .expect(200)
                                    .end(function (err, res) {
                                        if (err) {
                                            return done(err);
                                        }

                                        request.saveCookies(res);
                                        request.get('/ghost/')
                                            .expect(200)
                                            .end(function (err, res) {
                                                if (err) {
                                                    return done(err);
                                                }
                                                // console.log('/ghost/', err, res);
                                                csrfToken = res.text.match(pattern_meta)[1];
                                                done();
                                            });
                                    });

                            }, 2000);

                        });
                }, done);
        }).otherwise(function (e) {
            console.log('Ghost Error: ', e);
            console.log(e.stack);
        });
    });

    after(function () {
        httpServer.close();
    });

    it('can retrieve all users', function (done) {
        request.get(testUtils.API.getApiQuery('users/'))
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                res.should.be.json;
                var jsonResponse = res.body;
                jsonResponse[0].should.exist;

                testUtils.API.checkResponse(jsonResponse[0], 'user');
                done();
            });
    });

    it('can retrieve a user', function (done) {
        request.get(testUtils.API.getApiQuery('users/me/'))
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                res.should.be.json;
                var jsonResponse = res.body;
                jsonResponse.should.exist;

                testUtils.API.checkResponse(jsonResponse, 'user');
                done();
            });
    });

    it('can\'t retrieve non existent user', function (done) {
        request.get(testUtils.API.getApiQuery('users/99/'))
            .expect(404)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                res.should.be.json;
                var jsonResponse = res.body;
                jsonResponse.should.exist;

                testUtils.API.checkResponseValue(jsonResponse, ['error']);
                done();
            });
    });

    it('can edit a user', function (done) {
        request.get(testUtils.API.getApiQuery('users/me/'))
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                var jsonResponse = res.body,
                    changedValue = 'joe-bloggs.ghost.org';
                jsonResponse.should.exist;
                jsonResponse.website = changedValue;

                request.put(testUtils.API.getApiQuery('users/me/'))
                    .set('X-CSRF-Token', csrfToken)
                    .send(jsonResponse)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        var putBody = res.body;
                        res.headers['x-cache-invalidate'].should.eql('/*');
                        res.should.be.json;
                        putBody.should.exist;
                        putBody.website.should.eql(changedValue);

                        testUtils.API.checkResponse(putBody, 'user');
                        done();
                    });
            });
    });

    it('can\'t edit a user with invalid CSRF token', function (done) {
        request.get(testUtils.API.getApiQuery('users/me/'))
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                var jsonResponse = res.body,
                    changedValue = 'joe-bloggs.ghost.org';
                jsonResponse.should.exist;
                jsonResponse.website = changedValue;

                request.put(testUtils.API.getApiQuery('users/me/'))
                    .set('X-CSRF-Token', 'invalid-token')
                    .send(jsonResponse)
                    .expect(403)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        done();
                    });

            });
    });


});