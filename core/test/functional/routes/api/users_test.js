/*global describe, it, before, after */
/*jshint expr:true*/
var testUtils     = require('../../../utils'),
    should        = require('should'),
    supertest     = require('supertest'),
    express       = require('express'),

    ghost         = require('../../../../../core'),

    httpServer,
    request;

describe('User API', function () {
    var accesstoken = '';

    before(function (done) {
        var app = express();
        app.set('disableLoginLimiter', true);

        // starting ghost automatically populates the db
        // TODO: prevent db init, and manage bringing up the DB with fixtures ourselves
        ghost({app: app}).then(function (_httpServer) {
            httpServer = _httpServer;
            request = supertest.agent(app);

        }).then(function () {
            return testUtils.doAuth(request);
        }).then(function (token) {
            accesstoken = token;
            done();
        }).catch(function (e) {
            console.log('Ghost Error: ', e);
            console.log(e.stack);
        });
    });

    after(function (done) {
        testUtils.clearData().then(function () {
            httpServer.close();
            done();
        });
    });

    describe('Browse', function () {

        it('returns dates in ISO 8601 format', function (done) {
            request.get(testUtils.API.getApiQuery('users/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    var jsonResponse = res.body;
                    jsonResponse.users.should.exist;
                    testUtils.API.checkResponse(jsonResponse, 'users');

                    jsonResponse.users.should.have.length(1);
                    testUtils.API.checkResponse(jsonResponse.users[0], 'user', ['roles']);

                    testUtils.API.isISO8601(jsonResponse.users[0].last_login).should.be.true;
                    testUtils.API.isISO8601(jsonResponse.users[0].created_at).should.be.true;
                    testUtils.API.isISO8601(jsonResponse.users[0].updated_at).should.be.true;

                    done();
                });
        });

        it('can retrieve all users', function (done) {
            request.get(testUtils.API.getApiQuery('users/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    var jsonResponse = res.body;
                    jsonResponse.users.should.exist;
                    testUtils.API.checkResponse(jsonResponse, 'users');

                    jsonResponse.users.should.have.length(1);
                    testUtils.API.checkResponse(jsonResponse.users[0], 'user', ['roles']);
                    done();
                });
        });
    });

    describe('Read', function () {
        it('can retrieve a user by "me"', function (done) {
            request.get(testUtils.API.getApiQuery('users/me/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    var jsonResponse = res.body;
                    jsonResponse.users.should.exist;
                    should.not.exist(jsonResponse.meta);

                    jsonResponse.users.should.have.length(1);
                    testUtils.API.checkResponse(jsonResponse.users[0], 'user', ['roles']);
                    done();
                });
        });

        it('can retrieve a user by id', function (done) {
            request.get(testUtils.API.getApiQuery('users/1/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    var jsonResponse = res.body;
                    jsonResponse.users.should.exist;
                    should.not.exist(jsonResponse.meta);

                    jsonResponse.users.should.have.length(1);
                    testUtils.API.checkResponse(jsonResponse.users[0], 'user', ['roles']);
                    done();
                });
        });

        it('can retrieve a user by slug', function (done) {
            request.get(testUtils.API.getApiQuery('users/slug/joe-blogs/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    var jsonResponse = res.body;
                    jsonResponse.users.should.exist;
                    should.not.exist(jsonResponse.meta);

                    jsonResponse.users.should.have.length(1);
                    testUtils.API.checkResponse(jsonResponse.users[0], 'user', ['roles']);
                    done();
                });
        });

        it('can retrieve a user by email', function (done) {
            request.get(testUtils.API.getApiQuery('users/email/jbloggs%40example.com/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    var jsonResponse = res.body;
                    jsonResponse.users.should.exist;
                    should.not.exist(jsonResponse.meta);

                    jsonResponse.users.should.have.length(1);
                    testUtils.API.checkResponse(jsonResponse.users[0], 'user', ['roles']);
                    done();
                });
        });

        it('can retrieve a user with role', function (done) {
            request.get(testUtils.API.getApiQuery('users/me/?include=roles'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    var jsonResponse = res.body;
                    jsonResponse.users.should.exist;
                    should.not.exist(jsonResponse.meta);

                    jsonResponse.users.should.have.length(1);
                    testUtils.API.checkResponse(jsonResponse.users[0], 'user', ['roles']);
                    testUtils.API.checkResponse(jsonResponse.users[0].roles[0], 'role');
                    done();
                });
        });

        it('can retrieve a user with role and permissions', function (done) {
            request.get(testUtils.API.getApiQuery('users/me/?include=roles,roles.permissions'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    var jsonResponse = res.body;
                    jsonResponse.users.should.exist;
                    should.not.exist(jsonResponse.meta);

                    jsonResponse.users.should.have.length(1);
                    testUtils.API.checkResponse(jsonResponse.users[0], 'user', ['roles']);
                    testUtils.API.checkResponse(jsonResponse.users[0].roles[0], 'role', ['permissions']);
                    // testUtils.API.checkResponse(jsonResponse.users[0].roles[0].permissions[0], 'permission');

                    done();
                });
        });

        it('can retrieve a user by slug with role and permissions', function (done) {
            request.get(testUtils.API.getApiQuery('users/slug/joe-blogs/?include=roles,roles.permissions'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    var jsonResponse = res.body;
                    jsonResponse.users.should.exist;
                    should.not.exist(jsonResponse.meta);

                    jsonResponse.users.should.have.length(1);
                    testUtils.API.checkResponse(jsonResponse.users[0], 'user', ['roles']);
                    testUtils.API.checkResponse(jsonResponse.users[0].roles[0], 'role', ['permissions']);
                    // testUtils.API.checkResponse(jsonResponse.users[0].roles[0].permissions[0], 'permission');

                    done();
                });
        });

        it('can\'t retrieve non existent user by id', function (done) {
            request.get(testUtils.API.getApiQuery('users/99/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect(404)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    var jsonResponse = res.body;
                    jsonResponse.should.exist;
                    jsonResponse.errors.should.exist;
                    testUtils.API.checkResponseValue(jsonResponse.errors[0], ['message', 'type']);
                    done();
                });
        });

        it('can\'t retrieve non existent user by slug', function (done) {
            request.get(testUtils.API.getApiQuery('users/slug/blargh/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect(404)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    var jsonResponse = res.body;
                    jsonResponse.should.exist;
                    jsonResponse.errors.should.exist;
                    testUtils.API.checkResponseValue(jsonResponse.errors[0], ['message', 'type']);
                    done();
                });
        });
    });
    describe('Edit', function () {
        it('can edit a user', function (done) {
            request.get(testUtils.API.getApiQuery('users/me/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    var jsonResponse = res.body,
                        changedValue = 'http://joe-bloggs.ghost.org',
                        dataToSend;
                    jsonResponse.users[0].should.exist;
                    testUtils.API.checkResponse(jsonResponse.users[0], 'user', ['roles']);

                    dataToSend = { users: [
                        {website: changedValue}
                    ]};

                    request.put(testUtils.API.getApiQuery('users/me/'))
                        .set('Authorization', 'Bearer ' + accesstoken)
                        .send(dataToSend)
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }

                            var putBody = res.body;
                            res.headers['x-cache-invalidate'].should.eql('/*');
                            putBody.users[0].should.exist;
                            putBody.users[0].website.should.eql(changedValue);
                            putBody.users[0].email.should.eql(jsonResponse.users[0].email);
                            testUtils.API.checkResponse(putBody.users[0], 'user', ['roles']);
                            done();
                        });
                });
        });

        it('can\'t edit a user with invalid accesstoken', function (done) {
            request.get(testUtils.API.getApiQuery('users/me/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    var jsonResponse = res.body,
                        changedValue = 'joe-bloggs.ghost.org';
                    jsonResponse.users[0].should.exist;
                    jsonResponse.users[0].website = changedValue;

                    request.put(testUtils.API.getApiQuery('users/me/'))
                        .set('Authorization', 'Bearer ' + 'invalidtoken')
                        .send(jsonResponse)
                        .expect(401)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }

                            done();
                        });

                });
        });
    });
});
