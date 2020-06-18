const should = require('should');
const nock = require('nock');
const path = require('path');
const supertest = require('supertest');
const _ = require('lodash');
const ObjectId = require('bson-objectid');
const moment = require('moment-timezone');
const testUtils = require('../../utils');
const config = require('../../../core/shared/config');
const models = require('../../../core/server/models');
const localUtils = require('./utils');

const ghost = testUtils.startGhost;
let request;

describe('Posts API', function () {
    let ghostServer;
    let ownerCookie;

    before(function () {
        return ghost()
            .then(function (_ghostServer) {
                ghostServer = _ghostServer;
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return localUtils.doAuth(request, 'users:extra', 'posts', 'emails');
            })
            .then(function (cookie) {
                ownerCookie = cookie;
            });
    });

    afterEach(function () {
        nock.cleanAll();
    });

    it('Can retrieve all posts', function (done) {
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
                jsonResponse.posts.should.have.length(13);
                localUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                _.isBoolean(jsonResponse.posts[0].featured).should.eql(true);

                // Ensure default order
                jsonResponse.posts[0].slug.should.eql('scheduled-post');
                jsonResponse.posts[12].slug.should.eql('html-ipsum');

                // Absolute urls by default
                jsonResponse.posts[0].url.should.match(new RegExp(`${config.get('url')}/p/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}`));
                jsonResponse.posts[2].url.should.eql(`${config.get('url')}/welcome/`);
                jsonResponse.posts[11].feature_image.should.eql(`${config.get('url')}/content/images/2018/hey.jpg`);

                jsonResponse.posts[0].tags.length.should.eql(0);
                jsonResponse.posts[2].tags.length.should.eql(1);
                jsonResponse.posts[2].authors.length.should.eql(1);
                jsonResponse.posts[2].tags[0].url.should.eql(`${config.get('url')}/tag/getting-started/`);
                jsonResponse.posts[2].authors[0].url.should.eql(`${config.get('url')}/author/ghost/`);

                done();
            });
    });

    it('Can retrieve multiple post formats', function (done) {
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
                localUtils.API.checkResponse(jsonResponse.posts[0], 'post', ['plaintext']);
                localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                _.isBoolean(jsonResponse.posts[0].featured).should.eql(true);

                // ensure order works
                jsonResponse.posts[0].slug.should.eql('apps-integrations');

                done();
            });
    });

    it('Can include single relation', function (done) {
        request.get(localUtils.API.getApiQuery('posts/?include=tags'))
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
                jsonResponse.posts.should.have.length(13);
                localUtils.API.checkResponse(
                    jsonResponse.posts[0],
                    'post',
                    null,
                    ['authors', 'primary_author', 'email']
                );

                localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                done();
            });
    });

    it('Can filter posts', function (done) {
        request.get(localUtils.API.getApiQuery('posts/?filter=featured:true'))
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
                jsonResponse.posts.should.have.length(2);
                localUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                done();
            });
    });

    it('Cannot receive pages', function (done) {
        request.get(localUtils.API.getApiQuery('posts/?filter=page:true'))
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
                jsonResponse.posts.should.have.length(0);
                done();
            });
    });

    it('Can paginate posts', function (done) {
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

    it('Can request a post by id', function (done) {
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
                const jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.posts);
                localUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                jsonResponse.posts[0].id.should.equal(testUtils.DataGenerator.Content.posts[0].id);

                _.isBoolean(jsonResponse.posts[0].featured).should.eql(true);

                testUtils.API.isISO8601(jsonResponse.posts[0].created_at).should.be.true();
                done();
            });
    });

    it('Can retrieve a post by slug', function (done) {
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
                const jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.posts);
                localUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                jsonResponse.posts[0].slug.should.equal('welcome');

                _.isBoolean(jsonResponse.posts[0].featured).should.eql(true);
                done();
            });
    });

    it('Can include relations for a single post', function (done) {
        request
            .get(localUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[0].id + '/?include=authors,tags,email'))
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
                should.exist(jsonResponse);
                should.exist(jsonResponse.posts);

                localUtils.API.checkResponse(jsonResponse.posts[0], 'post');

                jsonResponse.posts[0].authors[0].should.be.an.Object();
                localUtils.API.checkResponse(jsonResponse.posts[0].authors[0], 'user');

                jsonResponse.posts[0].tags[0].should.be.an.Object();
                localUtils.API.checkResponse(jsonResponse.posts[0].tags[0], 'tag', ['url']);

                jsonResponse.posts[0].email.should.be.an.Object();
                localUtils.API.checkResponse(jsonResponse.posts[0].email, 'email');
                done();
            });
    });

    it('Can add a post', function () {
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
                res.body.posts[0].url.should.match(new RegExp(`${config.get('url')}/p/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}`));
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

    it('Can update draft', function () {
        const post = {
            title: 'update draft'
        };

        return request
            .get(localUtils.API.getApiQuery(`posts/${testUtils.DataGenerator.Content.posts[3].id}/`))
            .set('Origin', config.get('url'))
            .expect(200)
            .then((res) => {
                post.updated_at = res.body.posts[0].updated_at;

                return request.put(localUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[3].id))
                    .set('Origin', config.get('url'))
                    .send({posts: [post]})
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200);
            })
            .then((res) => {
                res.headers['x-cache-invalidate'].should.eql('/p/' + res.body.posts[0].uuid + '/');
            });
    });

    it('Can update and force re-render', function () {
        const unsplashMock = nock('https://images.unsplash.com/')
            .get('/favicon_too_large')
            .query(true)
            .replyWithFile(200, path.join(__dirname, '../../utils/fixtures/images/ghost-logo.png'), {
                'Content-Type': 'image/png'
            });

        const mobiledoc = JSON.parse(testUtils.DataGenerator.Content.posts[3].mobiledoc);
        mobiledoc.cards.push(['image', {src: 'https://images.unsplash.com/favicon_too_large?ixlib=rb-1.2.1&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=2000&fit=max&ixid=eyJhcHBfaWQiOjExNzczfQ'}]);
        mobiledoc.sections.push([10, mobiledoc.cards.length - 1]);

        const post = {
            mobiledoc: JSON.stringify(mobiledoc)
        };

        return request
            .get(localUtils.API.getApiQuery(`posts/${testUtils.DataGenerator.Content.posts[3].id}/`))
            .set('Origin', config.get('url'))
            .expect(200)
            .then((res) => {
                post.updated_at = res.body.posts[0].updated_at;

                return request
                    .put(localUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[3].id + '/?force_rerender=true&formats=mobiledoc,html'))
                    .set('Origin', config.get('url'))
                    .send({posts: [post]})
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private);
                // .expect(200);
            })
            .then((res) => {
                res.headers['x-cache-invalidate'].should.eql('/p/' + res.body.posts[0].uuid + '/');

                unsplashMock.isDone().should.be.true();

                // mobiledoc is updated with image sizes
                const resMobiledoc = JSON.parse(res.body.posts[0].mobiledoc);
                const cardPayload = resMobiledoc.cards[mobiledoc.cards.length - 1][1];
                cardPayload.width.should.eql(800);
                cardPayload.height.should.eql(257);

                // html is re-rendered to include srcset
                res.body.posts[0].html.should.match(/srcset="https:\/\/images\.unsplash\.com\/favicon_too_large\?ixlib=rb-1\.2\.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=600&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 600w, https:\/\/images\.unsplash\.com\/favicon_too_large\?ixlib=rb-1\.2\.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=800&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 800w"/);
            });
    });

    it('Can unpublish a post', function () {
        const post = {
            status: 'draft'
        };

        return request
            .get(localUtils.API.getApiQuery(`posts/${testUtils.DataGenerator.Content.posts[1].id}/?`))
            .set('Origin', config.get('url'))
            .expect(200)
            .then((res) => {
                post.updated_at = res.body.posts[0].updated_at;

                return request
                    .put(localUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[1].id + '/'))
                    .set('Origin', config.get('url'))
                    .send({posts: [post]})
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200);
            })
            .then((res) => {
                res.headers['x-cache-invalidate'].should.eql('/*');
                res.body.posts[0].status.should.eql('draft');
            });
    });

    it('Can destroy a post', function () {
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

    it('Cannot get post via pages endpoint', function () {
        return request.get(localUtils.API.getApiQuery(`pages/${testUtils.DataGenerator.Content.posts[3].id}/`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(404);
    });

    it('Cannot update post via pages endpoint', function () {
        const post = {
            title: 'fails',
            updated_at: new Date().toISOString()
        };

        return request.put(localUtils.API.getApiQuery('pages/' + testUtils.DataGenerator.Content.posts[3].id))
            .set('Origin', config.get('url'))
            .send({pages: [post]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(404);
    });
});
