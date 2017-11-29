var should = require('should'),
    _ = require('lodash'),
    supertest = require('supertest'),
    moment = require('moment'),
    testUtils = require('../../../utils'),
    ObjectId = require('bson-objectid'),
    config = require('../../../../../core/server/config'),
    ghost = testUtils.startGhost,
    request;

describe('User API', function () {
    var ownerAccessToken = '',
        editorAccessToken = '',
        authorAccessToken = '',
        editor, author, ghostServer, inactiveUser;

    beforeEach(function () {
        return ghost()
            .then(function (_ghostServer) {
                ghostServer = _ghostServer;
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                // create editor
                return testUtils.createUser({
                    user: testUtils.DataGenerator.forKnex.createUser({email: 'test+1@ghost.org'}),
                    role: testUtils.DataGenerator.Content.roles[1]
                });
            })
            .then(function (_user1) {
                editor = _user1;

                // create author
                return testUtils.createUser({
                    user: testUtils.DataGenerator.forKnex.createUser({email: 'test+2@ghost.org'}),
                    role: testUtils.DataGenerator.Content.roles[2]
                });
            })
            .then(function (_user2) {
                author = _user2;

                // create inactive user
                return testUtils.createUser({
                    user: testUtils.DataGenerator.forKnex.createUser({email: 'test+3@ghost.org', status: 'inactive'}),
                    role: testUtils.DataGenerator.Content.roles[2]
                });
            })
            .then(function (_user3) {
                inactiveUser = _user3;

                // by default we login with the owner
                return testUtils.doAuth(request);
            })
            .then(function (token) {
                ownerAccessToken = token;

                request.user = editor;
                return testUtils.doAuth(request);
            })
            .then(function (token) {
                editorAccessToken = token;

                request.user = author;
                return testUtils.doAuth(request);
            })
            .then(function (token) {
                authorAccessToken = token;
            });
    });

    describe('As Owner', function () {
        describe('Browse', function () {
            it('returns dates in ISO 8601 format', function (done) {
                request.get(testUtils.API.getApiQuery('users/?order=id%20ASC'))
                    .set('Authorization', 'Bearer ' + ownerAccessToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        var jsonResponse = res.body;
                        should.exist(jsonResponse.users);
                        testUtils.API.checkResponse(jsonResponse, 'users');

                        // owner use + ghost-author user when Ghost starts
                        // and two extra users, see createUser in before
                        jsonResponse.users.should.have.length(5);

                        testUtils.API.checkResponse(jsonResponse.users[0], 'user');
                        testUtils.API.isISO8601(jsonResponse.users[0].last_seen).should.be.true();
                        testUtils.API.isISO8601(jsonResponse.users[0].created_at).should.be.true();
                        testUtils.API.isISO8601(jsonResponse.users[0].updated_at).should.be.true();

                        testUtils.API.isISO8601(jsonResponse.users[2].last_seen).should.be.true();
                        testUtils.API.isISO8601(jsonResponse.users[2].created_at).should.be.true();
                        testUtils.API.isISO8601(jsonResponse.users[2].updated_at).should.be.true();

                        done();
                    });
            });

            it('can retrieve all users', function (done) {
                request.get(testUtils.API.getApiQuery('users/'))
                    .set('Authorization', 'Bearer ' + ownerAccessToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse.users);
                        testUtils.API.checkResponse(jsonResponse, 'users');

                        jsonResponse.users.should.have.length(5);
                        testUtils.API.checkResponse(jsonResponse.users[0], 'user');
                        jsonResponse.users[4].status.should.eql(inactiveUser.status);
                        done();
                    });
            });

            it('can retrieve all users with roles', function (done) {
                request.get(testUtils.API.getApiQuery('users/?include=roles'))
                    .set('Authorization', 'Bearer ' + ownerAccessToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse.users);
                        testUtils.API.checkResponse(jsonResponse, 'users');

                        jsonResponse.users.should.have.length(5);
                        testUtils.API.checkResponse(jsonResponse.users[0], 'user', 'roles');
                        done();
                    });
            });
        });

        describe('Read', function () {
            it('can retrieve a user by "me"', function (done) {
                request.get(testUtils.API.getApiQuery('users/me/'))
                    .set('Authorization', 'Bearer ' + ownerAccessToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse.users);
                        should.not.exist(jsonResponse.meta);

                        jsonResponse.users.should.have.length(1);
                        testUtils.API.checkResponse(jsonResponse.users[0], 'user');
                        done();
                    });
            });

            it('can retrieve a user by id', function (done) {
                request.get(testUtils.API.getApiQuery('users/' + author.id + '/'))
                    .set('Authorization', 'Bearer ' + ownerAccessToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse.users);
                        should.not.exist(jsonResponse.meta);

                        jsonResponse.users.should.have.length(1);
                        testUtils.API.checkResponse(jsonResponse.users[0], 'user');
                        done();
                    });
            });

            it('can retrieve a user by slug', function (done) {
                request.get(testUtils.API.getApiQuery('users/slug/joe-bloggs/'))
                    .set('Authorization', 'Bearer ' + ownerAccessToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse.users);
                        should.not.exist(jsonResponse.meta);

                        jsonResponse.users.should.have.length(1);
                        testUtils.API.checkResponse(jsonResponse.users[0], 'user');
                        done();
                    });
            });

            it('can retrieve a user by email', function (done) {
                request.get(testUtils.API.getApiQuery('users/email/jbloggs%40example.com/'))
                    .set('Authorization', 'Bearer ' + ownerAccessToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse.users);
                        should.not.exist(jsonResponse.meta);

                        jsonResponse.users.should.have.length(1);
                        testUtils.API.checkResponse(jsonResponse.users[0], 'user');
                        done();
                    });
            });

            it('can retrieve a user with role', function (done) {
                request.get(testUtils.API.getApiQuery('users/me/?include=roles'))
                    .set('Authorization', 'Bearer ' + ownerAccessToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse.users);
                        should.not.exist(jsonResponse.meta);

                        jsonResponse.users.should.have.length(1);
                        testUtils.API.checkResponse(jsonResponse.users[0], 'user', ['roles']);
                        testUtils.API.checkResponse(jsonResponse.users[0].roles[0], 'role');
                        done();
                    });
            });

            it('can retrieve a user with role and permissions', function (done) {
                request.get(testUtils.API.getApiQuery('users/me/?include=roles,roles.permissions'))
                    .set('Authorization', 'Bearer ' + ownerAccessToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse.users);
                        should.not.exist(jsonResponse.meta);

                        jsonResponse.users.should.have.length(1);
                        testUtils.API.checkResponse(jsonResponse.users[0], 'user', ['roles']);
                        testUtils.API.checkResponse(jsonResponse.users[0].roles[0], 'role', ['permissions']);
                        // testUtils.API.checkResponse(jsonResponse.users[0].roles[0].permissions[0], 'permission');

                        done();
                    });
            });

            it('can retrieve a user by slug with role and permissions', function (done) {
                request.get(testUtils.API.getApiQuery('users/slug/joe-bloggs/?include=roles,roles.permissions'))
                    .set('Authorization', 'Bearer ' + ownerAccessToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse.users);
                        should.not.exist(jsonResponse.meta);

                        jsonResponse.users.should.have.length(1);
                        testUtils.API.checkResponse(jsonResponse.users[0], 'user', ['roles']);
                        testUtils.API.checkResponse(jsonResponse.users[0].roles[0], 'role', ['permissions']);
                        // testUtils.API.checkResponse(jsonResponse.users[0].roles[0].permissions[0], 'permission');

                        done();
                    });
            });

            it('can retrieve a user by slug with count.posts', function (done) {
                request.get(testUtils.API.getApiQuery('users/slug/joe-bloggs/?include=count.posts'))
                    .set('Authorization', 'Bearer ' + ownerAccessToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse.users);
                        should.not.exist(jsonResponse.meta);

                        jsonResponse.users.should.have.length(1);
                        testUtils.API.checkResponse(jsonResponse.users[0], 'user', ['count']);

                        done();
                    });
            });

            it('can retrieve a user by id with count.posts', function (done) {
                request.get(testUtils.API.getApiQuery('users/1/?include=count.posts'))
                    .set('Authorization', 'Bearer ' + ownerAccessToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse.users);
                        should.not.exist(jsonResponse.meta);

                        jsonResponse.users.should.have.length(1);
                        testUtils.API.checkResponse(jsonResponse.users[0], 'user', ['count']);

                        done();
                    });
            });

            it('can\'t retrieve non existent user by id', function (done) {
                request.get(testUtils.API.getApiQuery('users/' + ObjectId.generate() + '/'))
                    .set('Authorization', 'Bearer ' + ownerAccessToken)
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(404)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse);
                        should.exist(jsonResponse.errors);
                        testUtils.API.checkResponseValue(jsonResponse.errors[0], ['message', 'errorType']);
                        done();
                    });
            });

            it('can\'t retrieve non existent user by slug', function (done) {
                request.get(testUtils.API.getApiQuery('users/slug/blargh/'))
                    .set('Authorization', 'Bearer ' + ownerAccessToken)
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(404)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse);
                        should.exist(jsonResponse.errors);
                        testUtils.API.checkResponseValue(jsonResponse.errors[0], ['message', 'errorType']);
                        done();
                    });
            });
        });

        describe('Edit', function () {
            it('can edit a user', function (done) {
                request.get(testUtils.API.getApiQuery('users/me/'))
                    .set('Authorization', 'Bearer ' + ownerAccessToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        var jsonResponse = res.body,
                            changedValue = 'http://joe-bloggs.ghost.org',
                            dataToSend;

                        should.exist(jsonResponse.users[0]);
                        testUtils.API.checkResponse(jsonResponse.users[0], 'user');

                        dataToSend = {
                            users: [
                                {website: changedValue}
                            ]
                        };

                        request.put(testUtils.API.getApiQuery('users/me/'))
                            .set('Authorization', 'Bearer ' + ownerAccessToken)
                            .send(dataToSend)
                            .expect('Content-Type', /json/)
                            .expect('Cache-Control', testUtils.cacheRules.private)
                            .expect(200)
                            .end(function (err, res) {
                                if (err) {
                                    return done(err);
                                }

                                var putBody = res.body;
                                res.headers['x-cache-invalidate'].should.eql('/*');
                                should.exist(putBody.users[0]);
                                putBody.users[0].website.should.eql(changedValue);
                                putBody.users[0].email.should.eql(jsonResponse.users[0].email);
                                testUtils.API.checkResponse(putBody.users[0], 'user');
                                done();
                            });
                    });
            });

            it('can\'t edit a user with invalid accesstoken', function (done) {
                request.get(testUtils.API.getApiQuery('users/me/'))
                    .set('Authorization', 'Bearer ' + ownerAccessToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        var jsonResponse = res.body,
                            changedValue = 'joe-bloggs.ghost.org';

                        should.exist(jsonResponse.users[0]);
                        jsonResponse.users[0].website = changedValue;

                        request.put(testUtils.API.getApiQuery('users/me/'))
                            .set('Authorization', 'Bearer ' + 'invalidtoken')
                            .send(jsonResponse)
                            .expect(401)
                            .end(function (err, res) {
                                /*jshint unused:false*/
                                if (err) {
                                    return done(err);
                                }

                                done();
                            });
                    });
            });

            it('check which fields can be modified', function (done) {
                var existingUserData, modifiedUserData;

                request.get(testUtils.API.getApiQuery('users/me/'))
                    .set('Authorization', 'Bearer ' + ownerAccessToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        var jsonResponse = res.body;
                        should.exist(jsonResponse.users[0]);
                        existingUserData = _.cloneDeep(jsonResponse.users[0]);
                        modifiedUserData = _.cloneDeep(jsonResponse);

                        existingUserData.created_by.should.eql('1');
                        existingUserData.updated_by.should.eql('1');

                        modifiedUserData.users[0].created_at = moment().add(2, 'days').format();
                        modifiedUserData.users[0].updated_at = moment().add(2, 'days').format();
                        modifiedUserData.users[0].created_by = ObjectId.generate();
                        modifiedUserData.users[0].updated_by = ObjectId.generate();

                        delete jsonResponse.users[0].id;

                        request.put(testUtils.API.getApiQuery('users/me/'))
                            .set('Authorization', 'Bearer ' + ownerAccessToken)
                            .send(jsonResponse)
                            .expect(200)
                            .end(function (err, res) {
                                /*jshint unused:false*/
                                if (err) {
                                    return done(err);
                                }

                                var jsonResponse = res.body;
                                should.exist(jsonResponse.users[0]);

                                jsonResponse.users[0].created_by.should.eql(existingUserData.created_by);
                                jsonResponse.users[0].updated_by.should.eql(existingUserData.updated_by);
                                jsonResponse.users[0].updated_at.should.not.eql(modifiedUserData.updated_at);
                                jsonResponse.users[0].created_at.should.eql(existingUserData.created_at);

                                done();
                            });
                    });
            });
        });

        describe('Destroy', function () {
            it('[success] Destroy active user', function (done) {
                request.delete(testUtils.API.getApiQuery('users/' + editor.id))
                    .set('Authorization', 'Bearer ' + ownerAccessToken)
                    .expect(204)
                    .end(function (err) {
                        if (err) {
                            return done(err);
                        }

                        done();
                    });
            });

            it('[failure] Destroy unknown user id', function (done) {
                request.delete(testUtils.API.getApiQuery('users/' + ObjectId.generate()))
                    .set('Authorization', 'Bearer ' + ownerAccessToken)
                    .expect(403)
                    .end(function (err) {
                        if (err) {
                            return done(err);
                        }

                        done();
                    });
            });
        });
    });

    describe('As Editor', function () {
        describe('success cases', function () {
            it('can edit himself', function (done) {
                request.put(testUtils.API.getApiQuery('users/' + editor.id + '/'))
                    .set('Authorization', 'Bearer ' + editorAccessToken)
                    .send({
                        users: [{id: editor.id, name: 'test'}]
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
            });
        });

        describe('error cases', function () {
            it('can\'t edit the owner', function (done) {
                request.put(testUtils.API.getApiQuery('users/' + testUtils.DataGenerator.Content.users[0].id + '/'))
                    .set('Authorization', 'Bearer ' + editorAccessToken)
                    .send({
                        users: [{
                            id: testUtils.DataGenerator.Content.users[0].id
                        }]
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
            });
        });
    });

    describe('As Author', function () {
        describe('success cases', function () {
            it('can edit himself', function (done) {
                request.put(testUtils.API.getApiQuery('users/' + author.id + '/'))
                    .set('Authorization', 'Bearer ' + authorAccessToken)
                    .send({
                        users: [{id: author.id, name: 'test'}]
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
            });
        });

        describe('error cases', function () {
            it('can\'t edit the owner', function (done) {
                request.put(testUtils.API.getApiQuery('users/' + testUtils.DataGenerator.Content.users[0].id + '/'))
                    .set('Authorization', 'Bearer ' + authorAccessToken)
                    .send({
                        users: [{
                            id: testUtils.DataGenerator.Content.users[0].id
                        }]
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
            });
        });
    });
});
