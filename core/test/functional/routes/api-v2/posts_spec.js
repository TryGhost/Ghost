const ObjectId = require('bson-objectid');
const _ = require('lodash');
const config = require('../../../../../core/server/config');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../../utils');

const ghost = testUtils.startGhost;
const markdownToMobiledoc = testUtils.DataGenerator.markdownToMobiledoc;

const apiOptions = {
    version: 'v2',
    type: 'admin'
};

let request;

describe('Admin API v2 - Post API', function () {
    let ghostServer;

    describe('As API Key', function () {
        let apiToken;

        before(function () {
            return ghost()
                .then(function (_ghostServer) {
                    ghostServer = _ghostServer;
                    request = supertest.agent(config.get('url'));
                })
                .then(function () {
                    // TODO: replace with client auth and associated db setup
                    return testUtils.doAuth(request, 'users:extra', 'posts');
                })
                .then(function (token) {
                    // TODO: create signed JWT - will likely need a different
                    // method because the token will vary depending on the
                    // endpoint being hit
                    apiToken = token;
                });
        });

        describe('Browse', function () {
            it('retrieves all published posts only by default', function (done) {
                request.get(testUtils.API.getApiQuery('posts/', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse.posts);
                        testUtils.API.checkResponse(jsonResponse, 'posts');
                        jsonResponse.posts.should.have.length(11);
                        testUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                        testUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                        _.isBoolean(jsonResponse.posts[0].featured).should.eql(true);
                        _.isBoolean(jsonResponse.posts[0].page).should.eql(true);

                        done();
                    });
            });

            it('can retrieve a single post format', function (done) {
                request.get(testUtils.API.getApiQuery('posts/?formats=mobiledoc', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse.posts);
                        testUtils.API.checkResponse(jsonResponse, 'posts');
                        jsonResponse.posts.should.have.length(11);
                        testUtils.API.checkResponse(jsonResponse.posts[0], 'post', ['mobiledoc'], ['html']);
                        testUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                        _.isBoolean(jsonResponse.posts[0].featured).should.eql(true);
                        _.isBoolean(jsonResponse.posts[0].page).should.eql(true);

                        done();
                    });
            });

            it('can retrieve multiple post formats', function (done) {
                request.get(testUtils.API.getApiQuery('posts/?formats=plaintext,mobiledoc', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse.posts);
                        testUtils.API.checkResponse(jsonResponse, 'posts');
                        jsonResponse.posts.should.have.length(11);
                        testUtils.API.checkResponse(jsonResponse.posts[0], 'post', ['mobiledoc', 'plaintext'], ['html']);
                        testUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                        _.isBoolean(jsonResponse.posts[0].featured).should.eql(true);
                        _.isBoolean(jsonResponse.posts[0].page).should.eql(true);

                        done();
                    });
            });

            it('can handle unknown post formats', function (done) {
                request.get(testUtils.API.getApiQuery('posts/?formats=plaintext,mobiledo', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse.posts);
                        testUtils.API.checkResponse(jsonResponse, 'posts');
                        jsonResponse.posts.should.have.length(11);
                        testUtils.API.checkResponse(jsonResponse.posts[0], 'post', ['plaintext'], ['html']);
                        testUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                        _.isBoolean(jsonResponse.posts[0].featured).should.eql(true);
                        _.isBoolean(jsonResponse.posts[0].page).should.eql(true);

                        done();
                    });
            });

            it('can handle empty formats (default html is expected)', function (done) {
                request.get(testUtils.API.getApiQuery('posts/?formats=', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse.posts);
                        testUtils.API.checkResponse(jsonResponse, 'posts');
                        jsonResponse.posts.should.have.length(11);
                        testUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                        testUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                        _.isBoolean(jsonResponse.posts[0].featured).should.eql(true);
                        _.isBoolean(jsonResponse.posts[0].page).should.eql(true);

                        done();
                    });
            });

            it('fields and formats', function (done) {
                request.get(testUtils.API.getApiQuery('posts/?formats=mobiledoc,html&fields=id,title', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse.posts);
                        testUtils.API.checkResponse(jsonResponse, 'posts');
                        jsonResponse.posts.should.have.length(11);

                        testUtils.API.checkResponse(
                            jsonResponse.posts[0],
                            'post',
                            null,
                            null,
                            ['mobiledoc', 'id', 'title', 'html']
                        );

                        testUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');

                        done();
                    });
            });

            it('can retrieve all published posts and pages', function (done) {
                request.get(testUtils.API.getApiQuery('posts/?staticPages=all', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse.posts);
                        testUtils.API.checkResponse(jsonResponse, 'posts');
                        jsonResponse.posts.should.have.length(12);
                        testUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                        testUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                        done();
                    });
            });

            // Test bits of the API we don't use in the app yet to ensure the API behaves properly

            it('can retrieve all status posts and pages', function (done) {
                request.get(testUtils.API.getApiQuery('posts/?staticPages=all&status=all', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse.posts);
                        testUtils.API.checkResponse(jsonResponse, 'posts');
                        jsonResponse.posts.should.have.length(15);
                        testUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                        testUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                        done();
                    });
            });

            it('can retrieve just published pages', function (done) {
                request.get(testUtils.API.getApiQuery('posts/?staticPages=true', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse.posts);
                        testUtils.API.checkResponse(jsonResponse, 'posts');
                        jsonResponse.posts.should.have.length(1);
                        testUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                        testUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                        done();
                    });
            });

            it('can retrieve just featured posts', function (done) {
                request.get(testUtils.API.getApiQuery('posts/?filter=featured:true', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse.posts);
                        testUtils.API.checkResponse(jsonResponse, 'posts');
                        jsonResponse.posts.should.have.length(2);
                        testUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                        testUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                        done();
                    });
            });

            it('can retrieve just draft posts', function (done) {
                request.get(testUtils.API.getApiQuery('posts/?status=draft', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse.posts);
                        testUtils.API.checkResponse(jsonResponse, 'posts');
                        jsonResponse.posts.should.have.length(1);
                        testUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                        testUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                        done();
                    });
            });

            it('can retrieve just scheduled posts', function (done) {
                request.get(testUtils.API.getApiQuery('posts/?status=scheduled', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse.posts);
                        testUtils.API.checkResponse(jsonResponse, 'posts');
                        jsonResponse.posts.should.have.length(1);
                        testUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                        testUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                        done();
                    });
            });
        });

        // ## Read
        describe('Read', function () {
            it('can retrieve a post by id', function (done) {
                request.get(testUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[0].id + '/', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse);
                        should.exist(jsonResponse.posts);
                        testUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                        jsonResponse.posts[0].id.should.equal(testUtils.DataGenerator.Content.posts[0].id);
                        jsonResponse.posts[0].page.should.not.be.ok();
                        _.isBoolean(jsonResponse.posts[0].featured).should.eql(true);
                        _.isBoolean(jsonResponse.posts[0].page).should.eql(true);
                        jsonResponse.posts[0].author.should.be.a.String();
                        testUtils.API.isISO8601(jsonResponse.posts[0].created_at).should.be.true();
                        jsonResponse.posts[0].created_by.should.be.a.String();
                        // Tags aren't included by default
                        should.not.exist(jsonResponse.posts[0].tags);
                        done();
                    });
            });

            it('can retrieve multiple post formats', function (done) {
                request
                    .get(testUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[0].id + '/?formats=plaintext,mobiledoc', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse.posts);
                        jsonResponse.posts.should.have.length(1);
                        jsonResponse.posts[0].id.should.equal(testUtils.DataGenerator.Content.posts[0].id);

                        testUtils.API.checkResponse(jsonResponse.posts[0], 'post', ['mobiledoc', 'plaintext'], ['html']);

                        done();
                    });
            });

            it('can retrieve a post by slug', function (done) {
                request.get(testUtils.API.getApiQuery('posts/slug/welcome/', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse);
                        should.exist(jsonResponse.posts);
                        testUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                        jsonResponse.posts[0].slug.should.equal('welcome');
                        jsonResponse.posts[0].page.should.not.be.ok();
                        _.isBoolean(jsonResponse.posts[0].featured).should.eql(true);
                        _.isBoolean(jsonResponse.posts[0].page).should.eql(true);
                        jsonResponse.posts[0].author.should.be.a.String();
                        jsonResponse.posts[0].created_by.should.be.a.String();
                        // Tags aren't included by default
                        should.not.exist(jsonResponse.posts[0].tags);
                        done();
                    });
            });

            it('[DEPRECATED] can retrieve a post with author, created_by, and tags', function (done) {
                request.get(testUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[0].id + '/?include=author,tags,created_by', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse);
                        should.exist(jsonResponse.posts);
                        testUtils.API.checkResponse(jsonResponse.posts[0], 'post', 'tags');
                        jsonResponse.posts[0].page.should.not.be.ok();

                        jsonResponse.posts[0].author.should.be.an.Object();
                        testUtils.API.checkResponse(jsonResponse.posts[0].author, 'user');
                        jsonResponse.posts[0].tags[0].should.be.an.Object();
                        testUtils.API.checkResponse(jsonResponse.posts[0].tags[0], 'tag');
                        done();
                    });
            });

            it('can retrieve a post with authors, created_by, and tags', function (done) {
                request.get(testUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[0].id + '/?include=authors,tags,created_by', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse);
                        should.exist(jsonResponse.posts);

                        testUtils.API.checkResponse(jsonResponse.posts[0], 'post', ['tags', 'authors']);

                        jsonResponse.posts[0].author.should.be.a.String();
                        jsonResponse.posts[0].page.should.not.be.ok();

                        jsonResponse.posts[0].authors[0].should.be.an.Object();
                        testUtils.API.checkResponse(jsonResponse.posts[0].authors[0], 'user');

                        jsonResponse.posts[0].tags[0].should.be.an.Object();
                        testUtils.API.checkResponse(jsonResponse.posts[0].tags[0], 'tag');
                        done();
                    });
            });

            it('can retrieve a static page', function (done) {
                request.get(testUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[5].id + '/', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse);
                        should.exist(jsonResponse.posts);
                        testUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                        jsonResponse.posts[0].page.should.be.ok();
                        _.isBoolean(jsonResponse.posts[0].page).should.eql(true);
                        done();
                    });
            });

            it('can\'t retrieve non existent post', function (done) {
                request.get(testUtils.API.getApiQuery('posts/99/', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
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

            it('can\'t retrieve a draft post', function (done) {
                request.get(testUtils.API.getApiQuery('posts/5/', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
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

            it('can\'t retrieve a draft page', function (done) {
                request.get(testUtils.API.getApiQuery('posts/8/', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
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

        // ## Add
        describe('Add', function () {
            it('create and ensure dates are correct', function (done) {
                var newPost = {
                    posts: [{
                        status: 'published',
                        published_at: '2016-05-30T07:00:00.000Z',
                        mobiledoc: markdownToMobiledoc()
                    }]
                };

                request.post(testUtils.API.getApiQuery('posts', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
                    .send(newPost)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(201)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        res.body.posts[0].published_at.should.eql('2016-05-30T07:00:00.000Z');
                        res.body.posts[0].published_at = '2016-05-30T09:00:00.000Z';

                        request.put(testUtils.API.getApiQuery('posts/' + res.body.posts[0].id + '/', apiOptions))
                            .set('Authorization', 'Bearer ' + apiToken)
                            .send(res.body)
                            .expect('Content-Type', /json/)
                            .expect('Cache-Control', testUtils.cacheRules.private)
                            .expect(200)
                            .end(function (err, res) {
                                if (err) {
                                    return done(err);
                                }

                                res.body.posts[0].published_at.should.eql('2016-05-30T09:00:00.000Z');

                                request.get(testUtils.API.getApiQuery('posts/' + res.body.posts[0].id + '/', apiOptions))
                                    .set('Authorization', 'Bearer ' + apiToken)
                                    .expect('Content-Type', /json/)
                                    .expect('Cache-Control', testUtils.cacheRules.private)
                                    .expect(200)
                                    .end(function (err, res) {
                                        if (err) {
                                            return done(err);
                                        }

                                        res.body.posts[0].published_at.should.eql('2016-05-30T09:00:00.000Z');
                                        done();
                                    });
                            });
                    });
            });

            it('can create a new draft, publish post, update post', function (done) {
                var newTitle = 'My Post',
                    newTagName = 'My Tag',
                    publishedState = 'published',
                    newTag = {id: null, name: newTagName},
                    newPost = {
                        posts: [{
                            status: 'draft',
                            title: newTitle,
                            mobiledoc: markdownToMobiledoc('my post'),
                            tags: [newTag]
                        }]
                    };

                request.post(testUtils.API.getApiQuery('posts/?include=tags', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
                    .send(newPost)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(201)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        var draftPost = res.body;
                        res.headers.location.should.equal('/ghost/api/v0.1/posts/' + draftPost.posts[0].id + '/?status=draft');
                        should.exist(draftPost.posts);
                        draftPost.posts.length.should.be.above(0);
                        draftPost.posts[0].title.should.eql(newTitle);
                        draftPost.posts[0].status = publishedState;
                        testUtils.API.checkResponse(draftPost.posts[0], 'post', 'tags');

                        should.exist(draftPost.posts[0].tags);
                        draftPost.posts[0].tags.length.should.be.above(0);
                        draftPost.posts[0].tags[0].name.should.eql(newTagName);
                        testUtils.API.checkResponse(draftPost.posts[0].tags[0], 'tag');

                        request.put(testUtils.API.getApiQuery('posts/' + draftPost.posts[0].id + '/?include=tags', apiOptions))
                            .set('Authorization', 'Bearer ' + apiToken)
                            .send(draftPost)
                            .expect('Content-Type', /json/)
                            .expect('Cache-Control', testUtils.cacheRules.private)
                            .expect(200)
                            .end(function (err, res) {
                                if (err) {
                                    return done(err);
                                }

                                var publishedPost = res.body;
                                _.has(res.headers, 'x-cache-invalidate').should.equal(true);
                                res.headers['x-cache-invalidate'].should.eql('/*');

                                should.exist(publishedPost);
                                should.exist(publishedPost.posts);
                                publishedPost.posts.length.should.be.above(0);
                                publishedPost.posts[0].title.should.eql(newTitle);
                                publishedPost.posts[0].status.should.eql(publishedState);
                                testUtils.API.checkResponse(publishedPost.posts[0], 'post', 'tags');

                                should.exist(publishedPost.posts[0].tags);
                                publishedPost.posts[0].tags.length.should.be.above(0);
                                publishedPost.posts[0].tags[0].name.should.eql(newTagName);
                                testUtils.API.checkResponse(publishedPost.posts[0].tags[0], 'tag');

                                request.put(testUtils.API.getApiQuery('posts/' + publishedPost.posts[0].id + '/?include=tags', apiOptions))
                                    .set('Authorization', 'Bearer ' + apiToken)
                                    .send(publishedPost)
                                    .expect('Content-Type', /json/)
                                    .expect('Cache-Control', testUtils.cacheRules.private)
                                    .expect(200)
                                    .end(function (err, res) {
                                        if (err) {
                                            return done(err);
                                        }

                                        var updatedPost = res.body;
                                        // Require cache invalidation when post was updated and published
                                        res.headers['x-cache-invalidate'].should.eql('/*');

                                        should.exist(updatedPost);
                                        should.exist(updatedPost.posts);
                                        updatedPost.posts.length.should.be.above(0);
                                        updatedPost.posts[0].title.should.eql(newTitle);
                                        testUtils.API.isISO8601(updatedPost.posts[0].created_at).should.be.true();
                                        testUtils.API.isISO8601(updatedPost.posts[0].updated_at).should.be.true();
                                        testUtils.API.checkResponse(updatedPost.posts[0], 'post', 'tags');

                                        should.exist(updatedPost.posts[0].tags);
                                        updatedPost.posts[0].tags.length.should.be.above(0);
                                        updatedPost.posts[0].tags[0].name.should.eql(newTagName);
                                        testUtils.API.checkResponse(updatedPost.posts[0].tags[0], 'tag');

                                        done();
                                    });
                            });
                    });
            });

            it('check which fields can be added', function (done) {
                var newPost = {
                    status: 'draft',
                    title: 'title',
                    mobiledoc: markdownToMobiledoc('my post'),
                    created_at: moment().subtract(2, 'days').toDate(),
                    updated_at: moment().subtract(2, 'days').toDate(),
                    created_by: ObjectId.generate(),
                    updated_by: ObjectId.generate()
                };

                request
                    .post(testUtils.API.getApiQuery('posts/', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
                    .send({posts: [newPost]})
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(201)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        var response = res.body;
                        res.headers.location.should.equal('/ghost/api/v0.1/posts/' + response.posts[0].id + '/?status=draft');
                        should.exist(response.posts);
                        response.posts.length.should.be.above(0);

                        response.posts[0].title.should.eql(newPost.title);
                        response.posts[0].status.should.eql(newPost.status);

                        response.posts[0].created_at.should.not.eql(newPost.created_at.toISOString());
                        response.posts[0].updated_at.should.not.eql(newPost.updated_at.toISOString());
                        response.posts[0].updated_by.should.not.eql(newPost.updated_by);
                        response.posts[0].created_by.should.not.eql(newPost.created_by);

                        testUtils.API.checkResponse(response.posts[0], 'post');
                        done();
                    });
            });
        });

        // ## edit
        describe('Edit', function () {
            it('can edit a post', function (done) {
                request.get(testUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[0].id + '/?include=tags', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        var jsonResponse = res.body,
                            changedTitle = 'My new Title',
                            changedAuthor = testUtils.DataGenerator.Content.extraUsers[0].id;

                        should.exist(jsonResponse.posts[0]);
                        jsonResponse.posts[0].author.should.not.eql(changedAuthor);
                        jsonResponse.posts[0].title = changedTitle;
                        jsonResponse.posts[0].author = changedAuthor;
                        jsonResponse.posts[0].custom_template = 'custom-about';

                        request.put(testUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[0].id + '/', apiOptions))
                            .set('Authorization', 'Bearer ' + apiToken)
                            .send(jsonResponse)
                            .expect('Content-Type', /json/)
                            .expect('Cache-Control', testUtils.cacheRules.private)
                            .expect(200)
                            .end(function (err, res) {
                                if (err) {
                                    return done(err);
                                }

                                var putBody = res.body;
                                res.headers['x-cache-invalidate'].should.eql('/*');
                                should.exist(putBody);
                                putBody.posts[0].title.should.eql(changedTitle);
                                putBody.posts[0].author.should.eql(changedAuthor);
                                putBody.posts[0].status.should.eql('published');
                                putBody.posts[0].custom_template.should.eql('custom-about');

                                testUtils.API.checkResponse(putBody.posts[0], 'post');
                                done();
                            });
                    });
            });

            it('can edit a new draft and update post', function (done) {
                var newTitle = 'My Post',
                    newTagName = 'My Tag',
                    newTag = {id: null, name: newTagName},
                    newPost = {
                        posts: [{
                            status: 'draft',
                            title: newTitle,
                            mobiledoc: markdownToMobiledoc('my post'),
                            tags: [newTag]
                        }]
                    };

                request.post(testUtils.API.getApiQuery('posts/?include=tags', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
                    .send(newPost)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(201)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        var draftPost = res.body;
                        res.headers.location.should.equal('/ghost/api/v0.1/posts/' + draftPost.posts[0].id + '/?status=draft');
                        should.exist(draftPost.posts);
                        draftPost.posts.length.should.be.above(0);
                        draftPost.posts[0].title.should.eql(newTitle);
                        testUtils.API.checkResponse(draftPost.posts[0], 'post', 'tags');

                        draftPost.posts[0].title = 'Vote for Casper in red';

                        request.put(testUtils.API.getApiQuery('posts/' + draftPost.posts[0].id + '/?include=tags', apiOptions))
                            .set('Authorization', 'Bearer ' + apiToken)
                            .send(draftPost)
                            .expect('Content-Type', /json/)
                            .expect('Cache-Control', testUtils.cacheRules.private)
                            .expect(200)
                            .end(function (err, res) {
                                if (err) {
                                    return done(err);
                                }

                                // Updating a draft should send x-cache-invalidate headers for the preview only
                                res.headers['x-cache-invalidate'].should.eql('/p/' + draftPost.posts[0].uuid + '/');
                                done();
                            });
                    });
            });

            it('can edit a new published post and unpublish', function (done) {
                var newTitle = 'My Post',
                    newTagName = 'My Tag',
                    draftState = 'draft',
                    newTag = {id: null, name: newTagName},
                    newPost = {
                        posts: [{
                            status: 'published',
                            title: newTitle,
                            mobiledoc: markdownToMobiledoc('my post'),
                            tags: [newTag]
                        }]
                    };

                request.post(testUtils.API.getApiQuery('posts/?include=tags', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
                    .send(newPost)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(201)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        var draftPost = res.body;
                        res.headers.location.should.equal('/ghost/api/v0.1/posts/' + draftPost.posts[0].id + '/?status=published');
                        should.exist(draftPost.posts);
                        draftPost.posts.length.should.be.above(0);
                        draftPost.posts[0].title.should.eql(newTitle);
                        testUtils.API.checkResponse(draftPost.posts[0], 'post', 'tags');

                        draftPost.posts[0].title = 'Vote for Casper in red';
                        draftPost.posts[0].status = draftState;

                        request.put(testUtils.API.getApiQuery('posts/' + draftPost.posts[0].id + '/?include=tags', apiOptions))
                            .set('Authorization', 'Bearer ' + apiToken)
                            .send(draftPost)
                            .expect('Content-Type', /json/)
                            .expect('Cache-Control', testUtils.cacheRules.private)
                            .expect(200)
                            .end(function (err, res) {
                                if (err) {
                                    return done(err);
                                }

                                // Unpublishing a post should send x-cache-invalidate headers
                                res.headers['x-cache-invalidate'].should.eql('/*');
                                done();
                            });
                    });
            });

            it('can change a post to a static page', function (done) {
                request.get(testUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[0].id + '/?include=tags', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        var jsonResponse = res.body;

                        should.exist(jsonResponse);
                        jsonResponse.posts[0].page.should.not.be.ok();
                        jsonResponse.posts[0].page = true;

                        request.put(testUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[0].id + '/', apiOptions))
                            .set('Authorization', 'Bearer ' + apiToken)
                            .send(jsonResponse)
                            .expect('Content-Type', /json/)
                            .expect('Cache-Control', testUtils.cacheRules.private)
                            .expect(200)
                            .end(function (err, res) {
                                if (err) {
                                    return done(err);
                                }

                                var putBody = res.body;
                                res.headers['x-cache-invalidate'].should.eql('/*');
                                should.exist(putBody);
                                putBody.posts[0].page.should.be.ok();

                                testUtils.API.checkResponse(putBody.posts[0], 'post');
                                done();
                            });
                    });
            });

            it('can change a static page to a post', function (done) {
                request.get(testUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[5].id + '/', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        var jsonResponse = res.body;

                        should.exist(jsonResponse);
                        jsonResponse.posts[0].page.should.be.ok();
                        jsonResponse.posts[0].page = false;

                        request.put(testUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[5].id + '/', apiOptions))
                            .set('Authorization', 'Bearer ' + apiToken)
                            .send(jsonResponse)
                            .expect('Content-Type', /json/)
                            .expect('Cache-Control', testUtils.cacheRules.private)
                            .expect(200)
                            .end(function (err, res) {
                                if (err) {
                                    return done(err);
                                }

                                var putBody = res.body;

                                res.headers['x-cache-invalidate'].should.eql('/*');
                                should.exist(putBody);
                                putBody.posts[0].page.should.not.be.ok();
                                testUtils.API.checkResponse(putBody.posts[0], 'post');
                                done();
                            });
                    });
            });

            it('can\'t edit post with invalid page field', function (done) {
                request.get(testUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[5].id + '/', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        var jsonResponse = res.body,
                            changedValue = 'invalid';
                        should.exist(jsonResponse);
                        jsonResponse.posts[0].page.should.eql(false);
                        jsonResponse.posts[0].page = changedValue;

                        request.put(testUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[5].id + '/', apiOptions))
                            .set('Authorization', 'Bearer ' + apiToken)
                            .send(jsonResponse)
                            .expect('Content-Type', /json/)
                            .expect('Cache-Control', testUtils.cacheRules.private)
                            .expect(422)
                            .end(function (err, res) {
                                if (err) {
                                    return done(err);
                                }

                                should.not.exist(res.headers['x-cache-invalidate']);
                                jsonResponse = res.body;
                                should.exist(jsonResponse.errors);
                                testUtils.API.checkResponseValue(jsonResponse.errors[0], ['message', 'errorType', 'context']);
                                done();
                            });
                    });
            });

            it('can\'t edit a post with invalid accesstoken', function (done) {
                request.get(testUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[0].id + '/', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        var jsonResponse = res.body;
                        request.put(testUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[0].id + '/', apiOptions))
                            .set('Authorization', 'Bearer ' + 'invalidtoken')
                            .send(jsonResponse)
                            .expect('Content-Type', /json/)
                            .expect('Cache-Control', testUtils.cacheRules.private)
                            .expect(401)
                            .end(function (err) {
                                if (err) {
                                    return done(err);
                                }

                                done();
                            });
                    });
            });

            it('throws an error if there is an id mismatch', function (done) {
                request.get(testUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[0].id + '/', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        var jsonResponse = res.body;
                        should.exist(jsonResponse);

                        request.put(testUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[1].id + '/', apiOptions))
                            .set('Authorization', 'Bearer ' + apiToken)
                            .send(jsonResponse)
                            .expect('Content-Type', /json/)
                            .expect('Cache-Control', testUtils.cacheRules.private)
                            .expect(400)
                            .end(function (err, res) {
                                if (err) {
                                    return done(err);
                                }

                                done();
                            });
                    });
            });

            it('published_at = null', function (done) {
                request.get(testUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[0].id + '/?include=tags', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        var jsonResponse = res.body,
                            changedValue = 'A title.';

                        should.exist(jsonResponse);
                        jsonResponse.posts[0].title = changedValue;
                        jsonResponse.posts[0].published_at = null;

                        request.put(testUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[0].id + '/', apiOptions))
                            .set('Authorization', 'Bearer ' + apiToken)
                            .send(jsonResponse)
                            .expect('Content-Type', /json/)
                            .expect('Cache-Control', testUtils.cacheRules.private)
                            .expect(200)
                            .end(function (err, res) {
                                if (err) {
                                    return done(err);
                                }

                                var putBody = res.body;
                                res.headers['x-cache-invalidate'].should.eql('/*');
                                should.exist(putBody);
                                should.exist(putBody.posts);
                                putBody.posts[0].title.should.eql(changedValue);
                                if (_.isEmpty(putBody.posts[0].published_at)) {
                                    should.fail('null', 'valid date', 'publish_at should not be empty');
                                    done();
                                }
                                testUtils.API.checkResponse(putBody.posts[0], 'post');
                                done();
                            });
                    });
            });

            it('can\'t edit non existent post', function (done) {
                request.get(testUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[0].id + '/', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        var jsonResponse = res.body,
                            changedValue = 'My new Title';
                        should.exist(jsonResponse.posts[0].title);
                        jsonResponse.posts[0].testvalue = changedValue;
                        jsonResponse.posts[0].id = ObjectId.generate();

                        request.put(testUtils.API.getApiQuery('posts/' + jsonResponse.posts[0].id + '/', apiOptions))
                            .set('Authorization', 'Bearer ' + apiToken)
                            .send(jsonResponse)
                            .expect('Content-Type', /json/)
                            .expect('Cache-Control', testUtils.cacheRules.private)
                            .expect(404)
                            .end(function (err, res) {
                                if (err) {
                                    return done(err);
                                }

                                should.not.exist(res.headers['x-cache-invalidate']);
                                jsonResponse = res.body;
                                should.exist(jsonResponse.errors);
                                testUtils.API.checkResponseValue(jsonResponse.errors[0], ['message', 'errorType']);
                                done();
                            });
                    });
            });

            it('check which fields can be modified', function (done) {
                var existingPostData, modifiedPostData;

                request
                    .get(testUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[0].id + '/', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        var jsonResponse = res.body;
                        should.exist(jsonResponse.posts[0]);
                        existingPostData = _.cloneDeep(jsonResponse.posts[0]);
                        modifiedPostData = _.cloneDeep(jsonResponse);

                        modifiedPostData.posts[0].created_by = ObjectId.generate();
                        modifiedPostData.posts[0].updated_by = ObjectId.generate();
                        modifiedPostData.posts[0].created_at = moment().add(2, 'days').format();
                        modifiedPostData.posts[0].updated_at = moment().add(2, 'days').format();

                        request
                            .put(testUtils.API.getApiQuery('posts/' + modifiedPostData.posts[0].id + '/', apiOptions))
                            .set('Authorization', 'Bearer ' + apiToken)
                            .send(modifiedPostData)
                            .expect('Content-Type', /json/)
                            .expect('Cache-Control', testUtils.cacheRules.private)
                            .expect(200)
                            .end(function (err, res) {
                                if (err) {
                                    return done(err);
                                }

                                var jsonResponse = res.body;
                                should.exist(jsonResponse.posts[0]);

                                // We expect that the changed properties aren't changed, they are still the same than before.
                                jsonResponse.posts[0].created_by.should.eql(existingPostData.created_by);
                                jsonResponse.posts[0].updated_by.should.eql(existingPostData.updated_by);
                                jsonResponse.posts[0].created_at.should.eql(existingPostData.created_at);
                                // `updated_at` is automatically set, but it's not the date we send to override.
                                jsonResponse.posts[0].updated_at.should.not.eql(modifiedPostData.updated_at);
                                done();
                            });
                    });
            });
        });

        // ## delete
        describe('Delete', function () {
            it('can delete a post', function (done) {
                var deletePostId = testUtils.DataGenerator.Content.posts[0].id;

                request.del(testUtils.API.getApiQuery('posts/' + deletePostId + '/', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(204)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        res.body.should.be.empty();
                        res.headers['x-cache-invalidate'].should.eql('/*');

                        done();
                    });
            });

            it('can\'t delete a non existent post', function (done) {
                request.del(testUtils.API.getApiQuery('posts/' + ObjectId.generate() + '/', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
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

            it('can delete a new draft', function (done) {
                var newTitle = 'My Post',
                    publishedState = 'draft',
                    newPost = {
                        posts: [{
                            status: publishedState,
                            title: newTitle,
                            mobiledoc: markdownToMobiledoc('my post')
                        }]
                    };

                request.post(testUtils.API.getApiQuery('posts/', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
                    .send(newPost)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(201)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        var draftPost = res.body;

                        should.exist(draftPost);
                        draftPost.posts[0].title.should.eql(newTitle);
                        draftPost.posts[0].status = publishedState;
                        testUtils.API.checkResponse(draftPost.posts[0], 'post');

                        request.del(testUtils.API.getApiQuery('posts/' + draftPost.posts[0].id + '/', apiOptions))
                            .set('Authorization', 'Bearer ' + apiToken)
                            .expect('Cache-Control', testUtils.cacheRules.private)
                            .expect(204)
                            .end(function (err, res) {
                                if (err) {
                                    return done(err);
                                }

                                res.body.should.be.empty();

                                done();
                            });
                    });
            });
        });

        describe('Dated Permalinks', function () {
            before(function (done) {
                request.get(testUtils.API.getApiQuery('settings/', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        var jsonResponse = res.body;
                        jsonResponse.permalinks = '/:year/:month/:day/:slug/';

                        request.put(testUtils.API.getApiQuery('settings/', apiOptions))
                            .set('Authorization', 'Bearer ' + apiToken)
                            .send(jsonResponse)
                            .expect('Content-Type', /json/)
                            .expect('Cache-Control', testUtils.cacheRules.private)
                            .end(function (err) {
                                if (err) {
                                    return done(err);
                                }
                                done();
                            });
                    });
            });

            after(function (done) {
                request.get(testUtils.API.getApiQuery('settings/', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        var jsonResponse = res.body;
                        jsonResponse.permalinks = '/:slug/';

                        request.put(testUtils.API.getApiQuery('settings/', apiOptions))
                            .set('Authorization', 'Bearer ' + apiToken)
                            .expect('Content-Type', /json/)
                            .expect('Cache-Control', testUtils.cacheRules.private)
                            .send(jsonResponse)
                            .end(function (err, res) {
                                if (err) {
                                    return done(err);
                                }

                                done();
                            });
                    });
            });

            it('Can read a post', function (done) {
                // nothing should have changed here
                request.get(testUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[1].id + '/', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);

                        var jsonResponse = res.body;
                        should.exist(jsonResponse);
                        should.exist(jsonResponse.posts);
                        testUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                        jsonResponse.posts[0].slug.should.not.match(/^\/[0-9]{4}\/[0-9]{2}\/[0-9]{2}/);
                        jsonResponse.posts[0].page.should.not.be.ok();
                        done();
                    });
            });

            it('Can edit a post', function (done) {
                request.get(testUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[1].id + '/?include=tags', apiOptions))
                    .set('Authorization', 'Bearer ' + apiToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        var jsonResponse = res.body,
                            changedValue = 'My new Title';
                        should.exist(jsonResponse);
                        should.exist(jsonResponse.posts);
                        jsonResponse.posts[0].title = changedValue;

                        request.put(testUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[1].id + '/', apiOptions))
                            .set('Authorization', 'Bearer ' + apiToken)
                            .expect('Content-Type', /json/)
                            .expect('Cache-Control', testUtils.cacheRules.private)
                            .send(jsonResponse)
                            .expect(200)
                            .end(function (err, res) {
                                if (err) {
                                    return done(err);
                                }
                                var putBody = res.body;

                                res.headers['x-cache-invalidate'].should.eql('/*');
                                should.exist(putBody);
                                putBody.posts[0].title.should.eql(changedValue);

                                testUtils.API.checkResponse(putBody.posts[0], 'post');
                                done();
                            });
                    });
            });
        });
    });
});
