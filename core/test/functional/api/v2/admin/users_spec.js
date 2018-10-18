const should = require('should');
const _ = require('lodash');
const supertest = require('supertest');
const moment = require('moment');
const Promise = require('bluebird');
const ObjectId = require('bson-objectid');
const testUtils = require('../../../../utils');
const localUtils = require('./utils');
const config = require('../../../../../../core/server/config');
const models = require('../../../../../../core/server/models');
const ghost = testUtils.startGhost;
let request;

describe('User API V2', function () {
    let editor, author, ghostServer, inactiveUser, admin;

    describe('As Owner', function () {
        before(function () {
            return ghost()
                .then(function (_ghostServer) {
                    ghostServer = _ghostServer;
                    request = supertest.agent(config.get('url'));
                })
                .then(function () {
                    // create inactive user
                    return testUtils.createUser({
                        user: testUtils.DataGenerator.forKnex.createUser({email: 'test+3@ghost.org', status: 'inactive'}),
                        role: testUtils.DataGenerator.Content.roles[2].name
                    });
                })
                .then(function (_user) {
                    inactiveUser = _user;

                    // create admin user
                    return testUtils.createUser({
                        user: testUtils.DataGenerator.forKnex.createUser({email: 'test+admin@ghost.org', slug: 'admin'}),
                        role: testUtils.DataGenerator.Content.roles[0].name
                    });
                })
                .then(function (_user) {
                    admin = _user;

                    // by default we login with the owner
                    return localUtils.doAuth(request);
                });
        });

        describe('Browse', function () {
            it('returns dates in ISO 8601 format', function (done) {
                // @NOTE: ASC is default
                request.get(localUtils.API.getApiQuery('users/?order=id%20DESC'))
                    .set('Origin', config.get('url'))
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

                        // owner use + ghost-author user when Ghost starts
                        // and two extra users, see createUser in before
                        jsonResponse.users.should.have.length(4);

                        testUtils.API.checkResponse(jsonResponse.users[0], 'user', ['url']);

                        jsonResponse.users[0].email.should.eql(admin.email);
                        jsonResponse.users[0].status.should.eql(admin.status);

                        jsonResponse.users[1].email.should.eql(inactiveUser.email);
                        jsonResponse.users[1].status.should.eql(inactiveUser.status);

                        jsonResponse.users[2].email.should.eql('ghost-author@example.com');
                        jsonResponse.users[3].email.should.eql(testUtils.DataGenerator.Content.users[0].email);

                        testUtils.API.isISO8601(jsonResponse.users[3].last_seen).should.be.true();
                        testUtils.API.isISO8601(jsonResponse.users[3].created_at).should.be.true();
                        testUtils.API.isISO8601(jsonResponse.users[3].updated_at).should.be.true();

                        jsonResponse.users[0].url.should.eql(`${config.get('url')}/author/admin-user/`);
                        jsonResponse.users[1].url.should.eql(`${config.get('url')}/404/`);
                        jsonResponse.users[2].url.should.eql(`${config.get('url')}/author/ghost/`);
                        jsonResponse.users[3].url.should.eql(`${config.get('url')}/author/joe-bloggs/`);

                        done();
                    });
            });

            it('can retrieve all users with includes', function (done) {
                request.get(localUtils.API.getApiQuery('users/?include=roles'))
                    .set('Origin', config.get('url'))
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

                        jsonResponse.users.should.have.length(4);
                        testUtils.API.checkResponse(jsonResponse.users[0], 'user', ['roles', 'url']);
                        done();
                    });
            });

            it('supports usage of the page param', function (done) {
                request.get(localUtils.API.getApiQuery('users/?page=2'))
                    .set('Origin', config.get('url'))
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        const jsonResponse = res.body;
                        should.equal(jsonResponse.meta.pagination.page, 2);
                        done();
                    });
            });
        });

        describe('Read', function () {
            it('can retrieve a user by "me"', function (done) {
                request.get(localUtils.API.getApiQuery('users/me/'))
                    .set('Origin', config.get('url'))
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
                        testUtils.API.checkResponse(jsonResponse.users[0], 'user', ['url']);
                        done();
                    });
            });

            it('can retrieve a user by id', function (done) {
                request.get(localUtils.API.getApiQuery('users/' + testUtils.existingData.users[0].id + '/'))
                    .set('Origin', config.get('url'))
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
                        testUtils.API.checkResponse(jsonResponse.users[0], 'user', ['url']);
                        done();
                    });
            });

            it('can retrieve a user by slug', function (done) {
                request.get(localUtils.API.getApiQuery('users/slug/joe-bloggs/'))
                    .set('Origin', config.get('url'))
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
                        testUtils.API.checkResponse(jsonResponse.users[0], 'user', ['url']);
                        done();
                    });
            });

            it('can retrieve a user by email', function (done) {
                request.get(localUtils.API.getApiQuery('users/email/jbloggs%40example.com/'))
                    .set('Origin', config.get('url'))
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
                        testUtils.API.checkResponse(jsonResponse.users[0], 'user', ['url']);
                        done();
                    });
            });

            it('can retrieve a user with includes', function (done) {
                request.get(localUtils.API.getApiQuery('users/me/?include=roles,roles.permissions,count.posts'))
                    .set('Origin', config.get('url'))
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
                        testUtils.API.checkResponse(jsonResponse.users[0], 'user', ['roles', 'count', 'url']);
                        testUtils.API.checkResponse(jsonResponse.users[0].roles[0], 'role', ['permissions']);
                        done();
                    });
            });

            it('can\'t retrieve non existent user by id', function (done) {
                request.get(localUtils.API.getApiQuery('users/' + ObjectId.generate() + '/'))
                    .set('Origin', config.get('url'))
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
                request.get(localUtils.API.getApiQuery('users/slug/blargh/'))
                    .set('Origin', config.get('url'))
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
                request.put(localUtils.API.getApiQuery('users/me/'))
                    .set('Origin', config.get('url'))
                    .send({
                        users: [{
                            website: 'http://joe-bloggs.ghost.org',
                            password: 'mynewfancypasswordwhichisnotallowed'
                        }]
                    })
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
                        putBody.users[0].website.should.eql('http://joe-bloggs.ghost.org');
                        putBody.users[0].email.should.eql('jbloggs@example.com');
                        testUtils.API.checkResponse(putBody.users[0], 'user', ['url']);

                        should.not.exist(putBody.users[0].password);

                        models.User.findOne({id: putBody.users[0].id})
                            .then((user) => {
                                return models.User.isPasswordCorrect({
                                    plainPassword: 'mynewfancypasswordwhichisnotallowed',
                                    hashedPassword: user.get('password')
                                });
                            })
                            .then(Promise.reject)
                            .catch((err) => {
                                err.code.should.eql('PASSWORD_INCORRECT');
                                done();
                            });
                    });
            });

            it('check which fields can be modified', function (done) {
                var existingUserData, modifiedUserData;

                request.get(localUtils.API.getApiQuery('users/me/'))
                    .set('Origin', config.get('url'))
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

                        delete modifiedUserData.users[0].id;

                        request.put(localUtils.API.getApiQuery('users/me/'))
                            .set('Origin', config.get('url'))
                            .send(modifiedUserData)
                            .expect(200)
                            .end(function (err, res) {
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
            it('[success] Destroy active user', function () {
                return request
                    .get(localUtils.API.getApiQuery(`posts/?filter=author_id:${testUtils.existingData.users[1].id}`))
                    .set('Origin', config.get('url'))
                    .expect(200)
                    .then((res) => {
                        res.body.posts.length.should.eql(7);

                        return request
                            .delete(localUtils.API.getApiQuery(`users/${testUtils.existingData.users[1].id}`))
                            .set('Origin', config.get('url'))
                            .expect(204);
                    })
                    .then(() => {
                        return request
                            .get(localUtils.API.getApiQuery(`users/${testUtils.existingData.users[1].id}/`))
                            .set('Origin', config.get('url'))
                            .expect(404);
                    })
                    .then(() => {
                        return request
                            .get(localUtils.API.getApiQuery(`posts/?filter=author_id:${testUtils.existingData.users[1].id}`))
                            .set('Origin', config.get('url'))
                            .expect(200);
                    })
                    .then((res) => {
                        res.body.posts.length.should.eql(0);
                    });
            });

            it('[failure] Destroy unknown user id', function (done) {
                request.delete(localUtils.API.getApiQuery('users/' + ObjectId.generate()))
                    .set('Origin', config.get('url'))
                    .expect(404)
                    .end(function (err) {
                        if (err) {
                            return done(err);
                        }

                        done();
                    });
            });
        });

        describe('Transfer ownership', function () {
            it('Owner can transfer ownership to admin user', function () {
                return request
                    .put(localUtils.API.getApiQuery('users/owner'))
                    .set('Origin', config.get('url'))
                    .send({
                        owner: [{
                            id: admin.id
                        }]
                    })
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .then((res) => {
                        res.body.users[0].roles[0].name.should.equal(testUtils.DataGenerator.Content.roles[0].name);
                        res.body.users[1].roles[0].name.should.equal(testUtils.DataGenerator.Content.roles[3].name);
                    });
            });
        });

        describe('Change Password', function () {
            it('default', function () {
                return request
                    .put(localUtils.API.getApiQuery('users/password'))
                    .set('Origin', config.get('url'))
                    .send({
                        password: [{
                            newPassword: '1234abcde!!',
                            ne2Password: '1234abcde!!',
                            oldPassword: 'Sl1m3rson99',
                            user_id: testUtils.existingData.users[0].id
                        }]
                    })
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .then((res) => {
                        should.exist(res.body.password);
                        should.exist(res.body.password[0].message);
                    });
            });
        });
    });

    describe('As Editor', function () {
        before(function () {
            return ghost()
                .then(function (_ghostServer) {
                    ghostServer = _ghostServer;
                    request = supertest.agent(config.get('url'));
                })
                .then(function () {
                    // create editor
                    return testUtils.createUser({
                        user: testUtils.DataGenerator.forKnex.createUser({email: 'test+1@ghost.org'}),
                        role: testUtils.DataGenerator.Content.roles[1].name
                    });
                })
                .then(function (_user1) {
                    editor = _user1;
                    request.user = editor;

                    // by default we login with the owner
                    return localUtils.doAuth(request);
                });
        });

        describe('success cases', function () {
            it('can edit himself', function (done) {
                request.put(localUtils.API.getApiQuery('users/' + editor.id + '/'))
                    .set('Origin', config.get('url'))
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
                request.put(localUtils.API.getApiQuery('users/' + testUtils.DataGenerator.Content.users[0].id + '/'))
                    .set('Origin', config.get('url'))
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

            it('Cannot transfer ownership to any other user', function () {
                return request
                    .put(localUtils.API.getApiQuery('users/owner'))
                    .set('Origin', config.get('url'))
                    .send({
                        owner: [{
                            id: testUtils.existingData.users[1].id
                        }]
                    })
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(403);
            });
        });
    });

    describe('As Author', function () {
        before(function () {
            return ghost()
                .then(function (_ghostServer) {
                    ghostServer = _ghostServer;
                    request = supertest.agent(config.get('url'));
                })
                .then(function () {
                    // create author
                    return testUtils.createUser({
                        user: testUtils.DataGenerator.forKnex.createUser({email: 'test+2@ghost.org'}),
                        role: testUtils.DataGenerator.Content.roles[2].name
                    });
                })
                .then(function (_user2) {
                    author = _user2;
                    request.user = author;

                    // by default we login with the owner
                    return localUtils.doAuth(request);
                });
        });

        describe('success cases', function () {
            it('can edit himself', function (done) {
                request.put(localUtils.API.getApiQuery('users/' + author.id + '/'))
                    .set('Origin', config.get('url'))
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
                request.put(localUtils.API.getApiQuery('users/' + testUtils.DataGenerator.Content.users[0].id + '/'))
                    .set('Origin', config.get('url'))
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
