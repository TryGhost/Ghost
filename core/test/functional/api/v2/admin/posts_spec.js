const should = require('should');
const supertest = require('supertest');
const _ = require('lodash');
const ObjectId = require('bson-objectid');
const moment = require('moment-timezone');
const testUtils = require('../../../../utils');
const localUtils = require('./utils');
const config = require('../../../../../../core/server/config');
const models = require('../../../../../../core/server/models');
const ghost = testUtils.startGhost;
let request;

describe('Posts API V2', function () {
    describe('...with admin api_key', function () {
        let ghostServer;

        before(function () {
            return ghost()
                .then(function (_ghostServer) {
                    ghostServer = _ghostServer;
                    request = supertest.agent(config.get('url'));
                })
                .then(function () {
                    // @NOTE: We don't authenticate!
                    return testUtils.initFixtures('api_keys');
                });
        });

        it('example: add post', function () {
            const post = {
                // @TODO: required for now, needs proper validation
                author_id: '1',
                title: 'Post created with api_key'
            };

            return request
                .post(localUtils.API.getApiQuery('posts'))
                .set('Origin', config.get('url'))
                .set('Authorization', `Ghost ${localUtils.getValidAdminKey(localUtils.API.getApiQuery('posts'))}`)
                .send({
                    posts: [post]
                })
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(403);
        });
    });

    describe('...with sessions', function () {
        let ghostServer;

        describe('As Owner', function () {
            let ownerCookie;

            before(function () {
                return ghost()
                    .then(function (_ghostServer) {
                        ghostServer = _ghostServer;
                        request = supertest.agent(config.get('url'));
                    })
                    .then(function () {
                        return localUtils.doAuth(request, 'users:extra', 'posts');
                    })
                    .then(function (cookie) {
                        ownerCookie = cookie;
                    });
            });

            describe('Browse', function () {
                it('retrieves all published posts only by default', function (done) {
                    request.get(localUtils.API.getApiQuery('posts/'))
                        .set('Origin', config.get('url'))
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }

                            should.not.exist(res.headers['x-cache-invalidate']);
                            const jsonResponse = res.body;
                            should.exist(jsonResponse.posts);
                            localUtils.API.checkResponse(jsonResponse, 'posts');
                            jsonResponse.posts.should.have.length(11);
                            localUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                            localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                            _.isBoolean(jsonResponse.posts[0].featured).should.eql(true);
                            _.isBoolean(jsonResponse.posts[0].page).should.eql(true);

                            // Ensure default order
                            jsonResponse.posts[0].slug.should.eql('welcome');
                            jsonResponse.posts[10].slug.should.eql('html-ipsum');

                            // Absolute urls by default
                            jsonResponse.posts[0].url.should.eql(`${config.get('url')}/welcome/`);
                            jsonResponse.posts[9].feature_image.should.eql(`${config.get('url')}/content/images/2018/hey.jpg`);

                            done();
                        });
                });

                it('can retrieve multiple post formats', function (done) {
                    request.get(localUtils.API.getApiQuery('posts/?formats=plaintext,mobiledoc&limit=3&order=title%20ASC'))
                        .set('Origin', config.get('url'))
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }

                            should.not.exist(res.headers['x-cache-invalidate']);
                            const jsonResponse = res.body;
                            should.exist(jsonResponse.posts);
                            localUtils.API.checkResponse(jsonResponse, 'posts');
                            jsonResponse.posts.should.have.length(3);
                            localUtils.API.checkResponse(jsonResponse.posts[0], 'post', ['mobiledoc', 'plaintext'], ['html']);
                            localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                            _.isBoolean(jsonResponse.posts[0].featured).should.eql(true);
                            _.isBoolean(jsonResponse.posts[0].page).should.eql(true);

                            // ensure order works
                            jsonResponse.posts[0].slug.should.eql('apps-integrations');

                            done();
                        });
                });

                it('fields & formats combined', function (done) {
                    request.get(localUtils.API.getApiQuery('posts/?formats=mobiledoc,html&fields=id,title'))
                        .set('Origin', config.get('url'))
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }

                            should.not.exist(res.headers['x-cache-invalidate']);
                            const jsonResponse = res.body;
                            should.exist(jsonResponse.posts);
                            localUtils.API.checkResponse(jsonResponse, 'posts');
                            jsonResponse.posts.should.have.length(11);

                            localUtils.API.checkResponse(
                                jsonResponse.posts[0],
                                'post',
                                null,
                                null,
                                ['mobiledoc', 'id', 'title', 'html']
                            );

                            localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');

                            done();
                        });
                });

                it('with includes', function (done) {
                    request.get(localUtils.API.getApiQuery('posts/?include=tags,authors'))
                        .set('Origin', config.get('url'))
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }

                            should.not.exist(res.headers['x-cache-invalidate']);
                            const jsonResponse = res.body;
                            should.exist(jsonResponse.posts);
                            localUtils.API.checkResponse(jsonResponse, 'posts');
                            jsonResponse.posts.should.have.length(11);
                            localUtils.API.checkResponse(
                                jsonResponse.posts[0],
                                'post',
                                ['tags', 'authors']
                            );

                            localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');

                            jsonResponse.posts[0].tags.length.should.eql(1);
                            jsonResponse.posts[0].authors.length.should.eql(1);
                            jsonResponse.posts[0].tags[0].url.should.eql(`${config.get('url')}/tag/getting-started/`);
                            jsonResponse.posts[0].authors[0].url.should.eql(`${config.get('url')}/author/ghost/`);

                            done();
                        });
                });

                it('fields combined with formats and include', function (done) {
                    request.get(localUtils.API.getApiQuery('posts/?formats=mobiledoc,html&fields=id,title&include=authors'))
                        .set('Origin', config.get('url'))
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }

                            should.not.exist(res.headers['x-cache-invalidate']);
                            const jsonResponse = res.body;
                            should.exist(jsonResponse.posts);
                            localUtils.API.checkResponse(jsonResponse, 'posts');
                            jsonResponse.posts.should.have.length(11);
                            localUtils.API.checkResponse(
                                jsonResponse.posts[0],
                                'post',
                                null,
                                null,
                                ['mobiledoc', 'id', 'title', 'html', 'authors']
                            );

                            localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');

                            done();
                        });
                });

                it('can use a filter', function (done) {
                    request.get(localUtils.API.getApiQuery('posts/?filter=page:[false,true]&status=all'))
                        .set('Origin', config.get('url'))
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }

                            should.not.exist(res.headers['x-cache-invalidate']);
                            const jsonResponse = res.body;
                            should.exist(jsonResponse.posts);
                            localUtils.API.checkResponse(jsonResponse, 'posts');
                            jsonResponse.posts.should.have.length(15);
                            localUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                            localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                            done();
                        });
                });

                it('supports usage of the page param', function (done) {
                    request.get(localUtils.API.getApiQuery('posts/?page=2'))
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

            describe('read', function () {
                it('by id', function (done) {
                    request.get(localUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[0].id + '/'))
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
                            should.exist(jsonResponse);
                            should.exist(jsonResponse.posts);
                            localUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                            jsonResponse.posts[0].id.should.equal(testUtils.DataGenerator.Content.posts[0].id);
                            jsonResponse.posts[0].page.should.not.be.ok();
                            _.isBoolean(jsonResponse.posts[0].featured).should.eql(true);
                            _.isBoolean(jsonResponse.posts[0].page).should.eql(true);
                            jsonResponse.posts[0].author.should.be.a.String();
                            testUtils.API.isISO8601(jsonResponse.posts[0].created_at).should.be.true();
                            // Tags aren't included by default
                            should.not.exist(jsonResponse.posts[0].tags);
                            done();
                        });
                });

                it('by id, with formats', function (done) {
                    request
                        .get(localUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[0].id + '/?formats=plaintext,mobiledoc'))
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
                            should.exist(jsonResponse.posts);
                            jsonResponse.posts.should.have.length(1);
                            jsonResponse.posts[0].id.should.equal(testUtils.DataGenerator.Content.posts[0].id);

                            localUtils.API.checkResponse(jsonResponse.posts[0], 'post', ['mobiledoc', 'plaintext'], ['html']);

                            done();
                        });
                });

                it('can retrieve a post by slug', function (done) {
                    request.get(localUtils.API.getApiQuery('posts/slug/welcome/'))
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
                            should.exist(jsonResponse);
                            should.exist(jsonResponse.posts);
                            localUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                            jsonResponse.posts[0].slug.should.equal('welcome');
                            jsonResponse.posts[0].page.should.not.be.ok();
                            _.isBoolean(jsonResponse.posts[0].featured).should.eql(true);
                            _.isBoolean(jsonResponse.posts[0].page).should.eql(true);
                            jsonResponse.posts[0].author.should.be.a.String();
                            // Tags aren't included by default
                            should.not.exist(jsonResponse.posts[0].tags);
                            done();
                        });
                });

                it('with includes', function (done) {
                    request
                        .get(localUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[0].id + '/?include=authors,tags'))
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
                            should.exist(jsonResponse);
                            should.exist(jsonResponse.posts);

                            localUtils.API.checkResponse(jsonResponse.posts[0], 'post', ['tags', 'authors']);

                            jsonResponse.posts[0].author.should.be.a.String();
                            jsonResponse.posts[0].page.should.not.be.ok();

                            jsonResponse.posts[0].authors[0].should.be.an.Object();
                            localUtils.API.checkResponse(jsonResponse.posts[0].authors[0], 'user', ['url']);

                            jsonResponse.posts[0].tags[0].should.be.an.Object();
                            localUtils.API.checkResponse(jsonResponse.posts[0].tags[0], 'tag', ['url']);
                            done();
                        });
                });

                it('can\'t retrieve non existent post', function (done) {
                    request.get(localUtils.API.getApiQuery(`posts/${ObjectId.generate()}/`))
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

            describe('add', function () {
                it('default', function () {
                    const post = {
                        title: 'My post',
                        status: 'draft',
                        published_at: '2016-05-30T07:00:00.000Z',
                        mobiledoc: testUtils.DataGenerator.markdownToMobiledoc('my post'),
                        created_at: moment().subtract(2, 'days').toDate(),
                        updated_at: moment().subtract(2, 'days').toDate(),
                        created_by: ObjectId.generate(),
                        updated_by: ObjectId.generate()
                    };

                    return request.post(localUtils.API.getApiQuery('posts'))
                        .set('Origin', config.get('url'))
                        .send({posts: [post]})
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(201)
                        .then((res) => {
                            res.body.posts.length.should.eql(1);
                            localUtils.API.checkResponse(res.body.posts[0], 'post');
                            should.not.exist(res.headers['x-cache-invalidate']);

                            return models.Post.findOne({
                                id: res.body.posts[0].id,
                                status: 'draft'
                            }, testUtils.context.internal);
                        })
                        .then((model) => {
                            model.get('title').should.eql(post.title);
                            model.get('status').should.eql(post.status);
                            model.get('published_at').toISOString().should.eql('2016-05-30T07:00:00.000Z');
                            model.get('created_at').toISOString().should.not.eql(post.created_at.toISOString());
                            model.get('updated_at').toISOString().should.not.eql(post.updated_at.toISOString());
                            model.get('updated_by').should.not.eql(post.updated_by);
                            model.get('created_by').should.not.eql(post.created_by);
                        });
                });

                it('published post with response timestamps in UTC format respecting original UTC offset', function () {
                    const post = {
                        posts: [{
                            status: 'published',
                            published_at: '2016-05-31T07:00:00.000+06:00',
                            created_at: '2016-05-30T03:00:00.000Z',
                            updated_at: '2016-05-30T07:00:00.000'
                        }]
                    };

                    return request.post(localUtils.API.getApiQuery('posts'))
                        .set('Origin', config.get('url'))
                        .send(post)
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(201)
                        .then((res) => {
                            res.body.posts.length.should.eql(1);
                            localUtils.API.checkResponse(res.body.posts[0], 'post');
                            res.body.posts[0].status.should.eql('published');
                            res.headers['x-cache-invalidate'].should.eql('/*');

                            res.body.posts[0].published_at.should.eql('2016-05-31T01:00:00.000Z');
                            res.body.posts[0].created_at.should.eql('2016-05-30T03:00:00.000Z');
                            res.body.posts[0].updated_at.should.eql('2016-05-30T07:00:00.000Z');
                        });
                });
            });

            describe('edit', function () {
                it('default', function () {
                    const post = {
                        title: 'My new Title',
                        author: testUtils.DataGenerator.Content.extraUsers[0].id,
                        custom_template: 'custom-about'
                    };

                    return request
                        .put(localUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[0].id + '/'))
                        .set('Origin', config.get('url'))
                        .send({posts: [post]})
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(200)
                        .then((res) => {
                            res.headers['x-cache-invalidate'].should.eql('/*');
                            localUtils.API.checkResponse(res.body.posts[0], 'post');

                            res.body.posts[0].title.should.eql(post.title);
                            res.body.posts[0].author.should.eql(post.author);
                            res.body.posts[0].status.should.eql('published');
                            res.body.posts[0].custom_template.should.eql('custom-about');
                        });
                });

                it('update dates', function () {
                    const post = {
                        created_by: ObjectId.generate(),
                        updated_by: ObjectId.generate(),
                        created_at: moment().add(2, 'days').format(),
                        updated_at: moment().add(2, 'days').format()
                    };

                    return request
                        .put(localUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[0].id + '/'))
                        .set('Origin', config.get('url'))
                        .send({posts: [post]})
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(200)
                        .then((res) => {
                            res.headers['x-cache-invalidate'].should.eql('/*');
                            localUtils.API.checkResponse(res.body.posts[0], 'post');

                            return models.Post.findOne({
                                id: res.body.posts[0].id
                            }, testUtils.context.internal);
                        })
                        .then((model) => {
                            // We expect that the changed properties aren't changed, they are still the same than before.
                            model.get('created_at').toISOString().should.not.eql(post.created_at);
                            model.get('updated_by').should.not.eql(post.updated_by);
                            model.get('created_by').should.not.eql(post.created_by);

                            // `updated_at` is automatically set, but it's not the date we send to override.
                            model.get('updated_at').toISOString().should.not.eql(post.updated_at);
                        });
                });

                it('update draft', function () {
                    const post = {
                        title: 'update draft'
                    };

                    return request.put(localUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[3].id))
                        .set('Origin', config.get('url'))
                        .send({posts: [post]})
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(200)
                        .then((res) => {
                            res.headers['x-cache-invalidate'].should.eql('/p/' + res.body.posts[0].uuid + '/');
                        });
                });

                it('unpublish', function () {
                    const post = {
                        status: 'draft'
                    };

                    return request
                        .put(localUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[1].id + '/'))
                        .set('Origin', config.get('url'))
                        .send({posts: [post]})
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(200)
                        .then((res) => {
                            res.headers['x-cache-invalidate'].should.eql('/*');
                            res.body.posts[0].status.should.eql('draft');
                        });
                });

                it('published_at = null', function () {
                    return request
                        .put(localUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[0].id + '/'))
                        .set('Origin', config.get('url'))
                        .send({
                            posts: [{published_at: null}]
                        })
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(200)
                        .then((res) => {
                            res.headers['x-cache-invalidate'].should.eql('/*');
                            should.exist(res.body.posts);
                            should.exist(res.body.posts[0].published_at);
                            localUtils.API.checkResponse(res.body.posts[0], 'post');
                        });
                });
            });

            describe('destroy', function () {
                it('default', function () {
                    return request
                        .del(localUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[0].id + '/'))
                        .set('Origin', config.get('url'))
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(204)
                        .then((res) => {
                            res.body.should.be.empty();
                            res.headers['x-cache-invalidate'].should.eql('/*');
                        });
                });

                it('non existent post', function () {
                    return request
                        .del(localUtils.API.getApiQuery('posts/' + ObjectId.generate() + '/'))
                        .set('Origin', config.get('url'))
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(404)
                        .then((res) => {
                            should.not.exist(res.headers['x-cache-invalidate']);
                            should.exist(res.body);
                            should.exist(res.body.errors);
                            testUtils.API.checkResponseValue(res.body.errors[0], ['message', 'errorType']);
                        });
                });
            });
        });
    });
});
