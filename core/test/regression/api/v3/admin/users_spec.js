const should = require('should');
const supertest = require('supertest');
const ObjectId = require('bson-objectid');
const testUtils = require('../../../../utils');
const config = require('../../../../../server/config');
const localUtils = require('./utils');
const ghost = testUtils.startGhost;
let request;

describe('User API', function () {
    let editor, author, ghostServer, otherAuthor, admin;

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
                        user: testUtils.DataGenerator.forKnex.createUser({email: 'test+3@ghost.org'}),
                        role: testUtils.DataGenerator.Content.roles[2].name
                    });
                })
                .then(function (_user) {
                    otherAuthor = _user;

                    // create admin user
                    return testUtils.createUser({
                        user: testUtils.DataGenerator.forKnex.createUser({email: 'test+admin@ghost.org', slug: 'owner'}),
                        role: testUtils.DataGenerator.Content.roles[3].name
                    });
                })
                .then(function (_user) {
                    admin = _user;

                    // by default we login with the owner
                    return localUtils.doAuth(request);
                });
        });

        describe('Read', function () {
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
                        testUtils.API.checkResponseValue(jsonResponse.errors[0], [
                            'message',
                            'context',
                            'type',
                            'details',
                            'property',
                            'help',
                            'code',
                            'id'
                        ]);
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
                        testUtils.API.checkResponseValue(jsonResponse.errors[0], [
                            'message',
                            'context',
                            'type',
                            'details',
                            'property',
                            'help',
                            'code',
                            'id'
                        ]);
                        done();
                    });
            });
        });

        describe('Edit', function () {
            it('can change the other users password', function (done) {
                request.put(localUtils.API.getApiQuery('users/password/'))
                    .set('Origin', config.get('url'))
                    .send({
                        password: [{
                            newPassword: 'superSecure',
                            ne2Password: 'superSecure',
                            user_id: otherAuthor.id
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
            });
        });

        describe('Destroy', function () {
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
