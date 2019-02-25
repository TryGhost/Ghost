const should = require('should');
const supertest = require('supertest');
const ObjectId = require('bson-objectid');
const moment = require('moment-timezone');
const testUtils = require('../../../../utils');
const config = require('../../../../../server/config');
const models = require('../../../../../server/models');
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
                return localUtils.doAuth(request, 'users:extra', 'posts');
            })
            .then(function (cookie) {
                ownerCookie = cookie;
            });
    });

    describe('Browse', function () {
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
                    jsonResponse.posts.should.have.length(13);

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
                    jsonResponse.posts.should.have.length(13);

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
    });

    describe('read', function () {
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
                    testUtils.API.checkResponseValue(jsonResponse.errors[0], [
                        'message',
                        'context',
                        'type',
                        'details',
                        'help',
                        'code',
                        'id'
                    ]);
                    done();
                });
        });
    });

    describe('edit', function () {
        it('published_at = null', function () {
            return request
                .get(localUtils.API.getApiQuery(`posts/${testUtils.DataGenerator.Content.posts[0].id}/`))
                .set('Origin', config.get('url'))
                .expect(200)
                .then((res) => {
                    return request
                        .put(localUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[0].id + '/'))
                        .set('Origin', config.get('url'))
                        .send({
                            posts: [{
                                published_at: null,
                                updated_at: res.body.posts[0].updated_at
                            }]
                        })
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(200);
                })
                .then((res) => {
                    // @NOTE: you cannot modify published_at manually, that's why the resource won't change.
                    should.not.exist(res.headers['x-cache-invalidate']);
                    should.exist(res.body.posts);
                    should.exist(res.body.posts[0].published_at);
                });
        });

        it('update dates & x_by', function () {
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
                    // @NOTE: you cannot modify these fields above manually, that's why the resource won't change.
                    should.not.exist(res.headers['x-cache-invalidate']);

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
    });

    describe('destroy', function () {
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
                    testUtils.API.checkResponseValue(res.body.errors[0], [
                        'message',
                        'context',
                        'type',
                        'details',
                        'help',
                        'code',
                        'id'
                    ]);
                });
        });
    });
});
