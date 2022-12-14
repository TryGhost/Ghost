const should = require('should');
const supertest = require('supertest');
const ObjectId = require('bson-objectid').default;
const testUtils = require('../../../utils');
const config = require('../../../../core/shared/config');
const localUtils = require('./utils');
let request;

describe('User API', function () {
    describe('As Owner', function () {
        let otherAuthor;

        before(async function () {
            await localUtils.startGhost();
            request = supertest.agent(config.get('url'));

            // create inactive user
            const authorRole = testUtils.DataGenerator.Content.roles[2].name;
            otherAuthor = await testUtils.createUser({
                user: testUtils.DataGenerator.forKnex.createUser({email: 'test+3@ghost.org'}),
                role: authorRole
            });

            // by default we login with the owner
            await localUtils.doAuth(request);
        });

        describe('Read', function () {
            it('can\'t retrieve non existent user by id', function (done) {
                request.get(localUtils.API.getApiQuery('users/' + ObjectId().toHexString() + '/'))
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
                        const jsonResponse = res.body;
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
                            'id',
                            'ghostErrorCode'
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
                        const jsonResponse = res.body;
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
                            'id',
                            'ghostErrorCode'
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
            before(async function () {
                // login with the owner
                request = supertest.agent(config.get('url'));
                await localUtils.doAuth(request);
            });

            it('[failure] Destroy unknown user id', function () {
                return request
                    .delete(localUtils.API.getApiQuery('users/' + ObjectId().toHexString()))
                    .set('Origin', config.get('url'))
                    .expect(404);
            });

            it('Destroy known user and reassign post tags', async function () {
                const otherAuthorPost = await testUtils.createPost({
                    post: {
                        tags: [{
                            slug: 'existing-tag'
                        }, {
                            slug: 'second-one'
                        }],
                        authors: [otherAuthor]
                    }
                });

                await request
                    .delete(localUtils.API.getApiQuery(`users/${otherAuthor.id}`))
                    .set('Origin', config.get('url'))
                    .expect(200);

                const tags = await otherAuthorPost.related('tags').fetch();

                should.equal(tags.length, 3);
                should.equal(tags.models[2].get('slug'), `hash-${otherAuthor.slug}`);
                should.equal(tags.models[2].get('name'), `#${otherAuthor.slug}`);
            });
        });
    });

    describe('As Editor', function () {
        let editor;

        before(async function () {
            await localUtils.startGhost();
            request = supertest.agent(config.get('url'));
            // create editor
            editor = await testUtils.createUser({
                user: testUtils.DataGenerator.forKnex.createUser({email: 'test+1@ghost.org'}),
                role: testUtils.DataGenerator.Content.roles[1].name
            });

            request.user = editor;
            // by default we login with the owner
            await localUtils.doAuth(request);
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
                            id: testUtils.getExistingData().users[1].id
                        }]
                    })
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(403);
            });
        });
    });

    describe('As Author', function () {
        let author;

        before(async function () {
            await localUtils.startGhost();
            request = supertest.agent(config.get('url'));
            // create author
            author = await testUtils.createUser({
                user: testUtils.DataGenerator.forKnex.createUser({email: 'test+2@ghost.org'}),
                role: testUtils.DataGenerator.Content.roles[2].name
            });

            request.user = author;
            // by default we login with the owner
            await localUtils.doAuth(request);
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
