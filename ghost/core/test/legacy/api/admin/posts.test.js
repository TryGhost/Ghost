const assert = require('node:assert/strict');
const {assertExists} = require('../../../utils/assertions');
const _ = require('lodash');
const supertest = require('supertest');
const ObjectId = require('bson-objectid').default;
const moment = require('moment-timezone');
const testUtils = require('../../../utils');
const config = require('../../../../core/shared/config');
const models = require('../../../../core/server/models');
const localUtils = require('./utils');
const mockManager = require('../../../utils/e2e-framework-mock-manager');

const defaultNewsletterSlug = testUtils.DataGenerator.Content.newsletters[0].slug;
const secondNewsletterSlug = testUtils.DataGenerator.Content.newsletters[1].slug;

describe('Posts API', function () {
    let request;

    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));

        // Archive the default newsletter fixture
        const defaultNewsletter = await models.Newsletter.findOne({status: 'active'});
        await models.Newsletter.edit({status: 'archived'}, {id: defaultNewsletter.id});

        await localUtils.doAuth(request, 'users:extra', 'posts', 'emails', 'newsletters', 'members:newsletters');
    });

    afterEach(function () {
        mockManager.restore();
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

                    assert.equal(res.headers['x-cache-invalidate'], undefined);
                    const jsonResponse = res.body;
                    assertExists(jsonResponse.posts);
                    localUtils.API.checkResponse(jsonResponse, 'posts');
                    assert.equal(jsonResponse.posts.length, 15);

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

        it('combined fields, formats, include and non existing', function (done) {
            request.get(localUtils.API.getApiQuery('posts/?formats=mobiledoc,html,plaintext&fields=id,title,primary_tag,doesnotexist&include=authors,tags,email'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    assert.equal(res.headers['x-cache-invalidate'], undefined);
                    const jsonResponse = res.body;
                    assertExists(jsonResponse.posts);
                    localUtils.API.checkResponse(jsonResponse, 'posts');
                    assert.equal(jsonResponse.posts.length, 15);

                    localUtils.API.checkResponse(
                        jsonResponse.posts[0],
                        'post',
                        null,
                        null,
                        ['mobiledoc', 'plaintext', 'id', 'title', 'html', 'authors', 'tags', 'primary_tag', 'email']
                    );

                    localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');

                    done();
                });
        });

        it('can filter by fields coming from posts_meta table non null meta_description', function (done) {
            request.get(localUtils.API.getApiQuery(`posts/?filter=meta_description:-null`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    assert.equal(res.headers['x-cache-invalidate'], undefined);
                    const jsonResponse = res.body;
                    assertExists(jsonResponse.posts);
                    localUtils.API.checkResponse(jsonResponse, 'posts');
                    assert.equal(jsonResponse.posts.length, 2);
                    jsonResponse.posts.forEach((post) => {
                        assert.notEqual(post.meta_description, null);
                    });

                    localUtils.API.checkResponse(
                        jsonResponse.posts[0],
                        'post'
                    );

                    localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');

                    done();
                });
        });

        it('can filter by fields coming from posts_meta table by value', function (done) {
            request.get(localUtils.API.getApiQuery(`posts/?filter=meta_description:'meta description for short and sweet'`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    assert.equal(res.headers['x-cache-invalidate'], undefined);
                    const jsonResponse = res.body;
                    assertExists(jsonResponse.posts);
                    localUtils.API.checkResponse(jsonResponse, 'posts');
                    assert.equal(jsonResponse.posts.length, 1);
                    assert.equal(jsonResponse.posts[0].id, testUtils.DataGenerator.Content.posts[2].id);
                    assert.equal(jsonResponse.posts[0].meta_description, 'meta description for short and sweet');

                    localUtils.API.checkResponse(
                        jsonResponse.posts[0],
                        'post'
                    );

                    localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');

                    done();
                });
        });

        it('can order by fields coming from posts_meta table', function (done) {
            request.get(localUtils.API.getApiQuery('posts/?order=meta_description%20ASC'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    assert.equal(res.headers['x-cache-invalidate'], undefined);
                    const jsonResponse = res.body;
                    assertExists(jsonResponse.posts);
                    localUtils.API.checkResponse(jsonResponse, 'posts');
                    assert.equal(jsonResponse.posts.length, 15);

                    assert.equal(jsonResponse.posts[0].meta_description, null);
                    assert.equal(jsonResponse.posts[14].slug, 'short-and-sweet');
                    assert.equal(jsonResponse.posts[14].meta_description, 'meta description for short and sweet');

                    localUtils.API.checkResponse(
                        jsonResponse.posts[0],
                        'post'
                    );

                    localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');

                    done();
                });
        });

        it('can order by email open rate', async function () {
            try {
                await testUtils.createEmailedPost({
                    postOptions: {
                        post: {
                            slug: '80-open-rate'
                        }
                    },
                    emailOptions: {
                        email: {
                            email_count: 100,
                            opened_count: 80,
                            track_opens: true
                        }
                    }
                });

                await testUtils.createEmailedPost({
                    postOptions: {
                        post: {
                            slug: '60-open-rate'
                        }
                    },
                    emailOptions: {
                        email: {
                            email_count: 100,
                            opened_count: 60,
                            track_opens: true
                        }
                    }
                });
            } catch (err) {
                if (_.isArray(err)) {
                    throw err[0];
                }
                throw err;
            }

            await request.get(localUtils.API.getApiQuery('posts/?order=email.open_rate%20DESC'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .then((res) => {
                    assert.equal(res.headers['x-cache-invalidate'], undefined);
                    const jsonResponse = res.body;
                    assertExists(jsonResponse.posts);
                    localUtils.API.checkResponse(jsonResponse, 'posts');
                    assert.equal(jsonResponse.posts.length, 15);

                    assert.equal(jsonResponse.posts[0].slug, '80-open-rate', 'DESC 1st');
                    assert.equal(jsonResponse.posts[1].slug, '60-open-rate', 'DESC 2nd');

                    localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                });

            await request.get(localUtils.API.getApiQuery('posts/?order=email.open_rate%20ASC'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .then((res) => {
                    const jsonResponse = res.body;
                    assert.equal(jsonResponse.posts[0].slug, '60-open-rate', 'ASC 1st');
                    assert.equal(jsonResponse.posts[1].slug, '80-open-rate', 'ASC 2nd');
                });
        });
    });

    describe('Read', function () {
        it('can\'t retrieve non existent post', function (done) {
            request.get(localUtils.API.getApiQuery(`posts/${ObjectId().toHexString()}/`))
                .set('Origin', config.get('url'))
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(404)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    assert.equal(res.headers['x-cache-invalidate'], undefined);
                    const jsonResponse = res.body;
                    assertExists(jsonResponse);
                    assertExists(jsonResponse.errors);
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

        it('throws a 400 when a non-existing field is requested', async function () {
            await request.get(localUtils.API.getApiQuery(`posts/slug/${testUtils.DataGenerator.Content.posts[0].slug}/?fields=tags`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(400);
        });
    });

    describe('Add', function () {
        it('adds default title when it is missing', function () {
            return request
                .post(localUtils.API.getApiQuery('posts/'))
                .set('Origin', config.get('url'))
                .send({
                    posts: [{
                        title: ''
                    }]
                })
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(201)
                .then((res) => {
                    assertExists(res.body.posts);
                    assertExists(res.body.posts[0].title);
                    assert.equal(res.body.posts[0].title, '(Untitled)');

                    assertExists(res.headers.location);
                    assert.equal(new URL(res.headers.location).pathname, `/ghost/api/admin/posts/${res.body.posts[0].id}/`);
                });
        });

        it('can add with tags - array of strings with new names', function () {
            return request
                .post(localUtils.API.getApiQuery('posts/'))
                .set('Origin', config.get('url'))
                .send({
                    posts: [{
                        title: 'Tags test 1',
                        tags: ['one', 'two']
                    }]
                })
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(201)
                .then((res) => {
                    assertExists(res.body.posts);
                    assertExists(res.body.posts[0].title);
                    assert.equal(res.body.posts[0].title, 'Tags test 1');
                    assert.equal(res.body.posts[0].tags.length, 2);
                    assert.equal(res.body.posts[0].tags[0].slug, 'one');
                    assert.equal(res.body.posts[0].tags[1].slug, 'two');
                });
        });

        it('can add with tags - array of strings with existing names', function () {
            return request
                .post(localUtils.API.getApiQuery('posts/'))
                .set('Origin', config.get('url'))
                .send({
                    posts: [{
                        title: 'Tags test 2',
                        tags: ['one', 'two']
                    }]
                })
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(201)
                .then((res) => {
                    assertExists(res.body.posts);
                    assertExists(res.body.posts[0].title);
                    assert.equal(res.body.posts[0].title, 'Tags test 2');
                    assert.equal(res.body.posts[0].tags.length, 2);
                    assert.equal(res.body.posts[0].tags[0].slug, 'one');
                    assert.equal(res.body.posts[0].tags[1].slug, 'two');
                });
        });

        it('can add with tags - array of objects with existing slugs', function () {
            return request
                .post(localUtils.API.getApiQuery('posts/'))
                .set('Origin', config.get('url'))
                .send({
                    posts: [{
                        title: 'Tags test 3',
                        tags: [{slug: 'one'}, {slug: 'two'}]
                    }]
                })
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(201)
                .then((res) => {
                    assertExists(res.body.posts);
                    assertExists(res.body.posts[0].title);
                    assert.equal(res.body.posts[0].title, 'Tags test 3');
                    assert.equal(res.body.posts[0].tags.length, 2);
                    assert.equal(res.body.posts[0].tags[0].slug, 'one');
                    assert.equal(res.body.posts[0].tags[1].slug, 'two');
                });
        });

        it('can add with tags - array of objects with new slugs', function () {
            return request
                .post(localUtils.API.getApiQuery('posts/'))
                .set('Origin', config.get('url'))
                .send({
                    posts: [{
                        title: 'Tags test 4',
                        tags: [{slug: 'three'}, {slug: 'four'}]
                    }]
                })
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(201)
                .then((res) => {
                    assertExists(res.body.posts);
                    assertExists(res.body.posts[0].title);
                    assert.equal(res.body.posts[0].title, 'Tags test 4');
                    assert.equal(res.body.posts[0].tags.length, 2);
                    assert.equal(res.body.posts[0].tags[0].slug, 'three');
                    assert.equal(res.body.posts[0].tags[1].slug, 'four');
                });
        });

        it('can add with tags - slug with spaces', async function () {
            const res = await request
                .post(localUtils.API.getApiQuery('posts/'))
                .set('Origin', config.get('url'))
                .send({
                    posts: [{
                        title: 'Tags test 5',
                        tags: [{slug: 'five spaces'}]
                    }]
                })
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(201);

            assertExists(res.body.posts);
            assertExists(res.body.posts[0].title);
            assert.equal(res.body.posts[0].title, 'Tags test 5');
            assert.equal(res.body.posts[0].tags.length, 1);
            assert.equal(res.body.posts[0].tags[0].slug, 'five-spaces');

            // Expected behavior when creating a slug with spaces:
            assert.equal(res.body.posts[0].tags[0].name, 'five-spaces');

            // If we create another post again now that the five-spaces tag exists,
            // we need to make sure it matches correctly and doesn't create a new tag again

            const res2 = await request
                .post(localUtils.API.getApiQuery('posts/'))
                .set('Origin', config.get('url'))
                .send({
                    posts: [{
                        title: 'Tags test 6',
                        tags: [{slug: 'five spaces'}]
                    }]
                })
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(201);

            assertExists(res2.body.posts);
            assertExists(res2.body.posts[0].title);
            assert.equal(res2.body.posts[0].title, 'Tags test 6');
            assert.equal(res2.body.posts[0].tags.length, 1);
            assert.equal(res2.body.posts[0].tags[0].id, res.body.posts[0].tags[0].id);
        });

        it('can add with tags - slug with spaces not automated', async function () {
            // Make sure that the matching still works when using a different name
            // this is important because it invalidates any solution that would just consider a slug as the name
            const res = await request
                .post(localUtils.API.getApiQuery('posts/'))
                .set('Origin', config.get('url'))
                .send({
                    posts: [{
                        title: 'Tags test 7',
                        tags: [{slug: 'six-spaces', name: 'Not automated name for six spaces'}]
                    }]
                })
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(201);

            assertExists(res.body.posts);
            assertExists(res.body.posts[0].title);
            assert.equal(res.body.posts[0].title, 'Tags test 7');
            assert.equal(res.body.posts[0].tags.length, 1);
            assert.equal(res.body.posts[0].tags[0].slug, 'six-spaces');
            assert.equal(res.body.posts[0].tags[0].name, 'Not automated name for six spaces');

            // If we create another post again now that the five-spaces tag exists,
            // we need to make sure it matches correctly and doesn't create a new tag again

            const res2 = await request
                .post(localUtils.API.getApiQuery('posts/'))
                .set('Origin', config.get('url'))
                .send({
                    posts: [{
                        title: 'Tags test 8',
                        tags: [{slug: 'six spaces'}]
                    }]
                })
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(201);

            assertExists(res2.body.posts);
            assertExists(res2.body.posts[0].title);
            assert.equal(res2.body.posts[0].title, 'Tags test 8');
            assert.equal(res2.body.posts[0].tags.length, 1);
            assert.equal(res2.body.posts[0].tags[0].id, res.body.posts[0].tags[0].id);
        });

        it('can add with tags - too long slug', async function () {
            const tooLongSlug = 'a'.repeat(190);

            const res = await request
                .post(localUtils.API.getApiQuery('posts/'))
                .set('Origin', config.get('url'))
                .send({
                    posts: [{
                        title: 'Tags test 9',
                        tags: [{slug: tooLongSlug}]
                    }]
                })
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(201);

            assertExists(res.body.posts);
            assertExists(res.body.posts[0].title);
            assert.equal(res.body.posts[0].title, 'Tags test 9');
            assert.equal(res.body.posts[0].tags.length, 1);
            assert.equal(res.body.posts[0].tags[0].slug, tooLongSlug.substring(0, 185));

            // If we create another post again now that the very long tag exists,
            // we need to make sure it matches correctly and doesn't create a new tag again

            const res2 = await request
                .post(localUtils.API.getApiQuery('posts/'))
                .set('Origin', config.get('url'))
                .send({
                    posts: [{
                        title: 'Tags test 10',
                        tags: [{slug: tooLongSlug}]
                    }]
                })
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(201);

            assertExists(res2.body.posts);
            assertExists(res2.body.posts[0].title);
            assert.equal(res2.body.posts[0].title, 'Tags test 10');
            assert.equal(res2.body.posts[0].tags.length, 1);
            assert.equal(res2.body.posts[0].tags[0].id, res.body.posts[0].tags[0].id);
        });
    });

    describe('Edit', function () {
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
                    // @NOTE: if you set published_at to null and the post is published, we set it to NOW in model layer
                    assertExists(res.headers['x-cache-invalidate']);
                    assertExists(res.body.posts);
                    assertExists(res.body.posts[0].published_at);
                });
        });

        it('publishes a post with email_only and sends email to all', async function () {
            const res = await request
                .post(localUtils.API.getApiQuery('posts/'))
                .set('Origin', config.get('url'))
                .send({
                    posts: [{
                        title: 'Email me',
                        email_only: true
                    }]
                })
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(201);

            assertExists(res.body.posts);
            assertExists(res.body.posts[0].title);
            assert.equal(res.body.posts[0].title, 'Email me');
            assert.equal(res.body.posts[0].email_only, true);
            assert.equal(res.body.posts[0].status, 'draft');

            assertExists(res.headers.location);
            assert.equal(new URL(res.headers.location).pathname, `/ghost/api/admin/posts/${res.body.posts[0].id}/`);

            const publishedRes = await request
                .put(localUtils.API.getApiQuery(`posts/${res.body.posts[0].id}/?newsletter=${defaultNewsletterSlug}`))
                .set('Origin', config.get('url'))
                .send({
                    posts: [{
                        status: 'published',
                        updated_at: res.body.posts[0].updated_at
                    }]
                })
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            assertExists(publishedRes.body.posts);
            assert.equal(res.body.posts[0].email_only, true);
            assert.equal(publishedRes.body.posts[0].status, 'sent');

            assertExists(publishedRes.body.posts[0].email);
            assert.equal(publishedRes.body.posts[0].email.email_count, 4);
        });

        it('publishes a post while setting email_only flag sends an email to paid', async function () {
            const res = await request
                .post(localUtils.API.getApiQuery('posts/'))
                .set('Origin', config.get('url'))
                .send({
                    posts: [{
                        title: 'Email me'
                    }]
                })
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(201);

            assertExists(res.body.posts);
            assertExists(res.body.posts[0].title);
            assert.equal(res.body.posts[0].title, 'Email me');
            assert.equal(res.body.posts[0].email_only, false);
            assert.equal(res.body.posts[0].status, 'draft');

            assertExists(res.headers.location);
            assert.equal(new URL(res.headers.location).pathname, `/ghost/api/admin/posts/${res.body.posts[0].id}/`);

            const publishedRes = await request
                .put(localUtils.API.getApiQuery(`posts/${res.body.posts[0].id}/?email_segment=status:-free&newsletter=${defaultNewsletterSlug}`))
                .set('Origin', config.get('url'))
                .send({
                    posts: [{
                        status: 'published',
                        email_only: true,
                        updated_at: res.body.posts[0].updated_at
                    }]
                })
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            assertExists(publishedRes.body.posts);
            assert.equal(publishedRes.body.posts[0].status, 'sent');

            assertExists(publishedRes.body.posts[0].email);
            assert.equal(publishedRes.body.posts[0].email.email_count, 2);
        });

        it('only send an email to paid subscribed members of the selected newsletter', async function () {
            const res = await request
                .post(localUtils.API.getApiQuery('posts/'))
                .set('Origin', config.get('url'))
                .send({
                    posts: [{
                        title: 'Email me'
                    }]
                })
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(201);

            assertExists(res.body.posts);
            assertExists(res.body.posts[0].title);
            assert.equal(res.body.posts[0].title, 'Email me');
            assert.equal(res.body.posts[0].email_only, false);
            assert.equal(res.body.posts[0].status, 'draft');

            assertExists(res.headers.location);
            assert.equal(new URL(res.headers.location).pathname, `/ghost/api/admin/posts/${res.body.posts[0].id}/`);

            const publishedRes = await request
                .put(localUtils.API.getApiQuery(`posts/${res.body.posts[0].id}/?email_segment=status:-free&newsletter=${secondNewsletterSlug}`))
                .set('Origin', config.get('url'))
                .send({
                    posts: [{
                        status: 'published',
                        email_only: true,
                        updated_at: res.body.posts[0].updated_at
                    }]
                })
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            assertExists(publishedRes.body.posts);
            assert.equal(publishedRes.body.posts[0].status, 'sent');

            assertExists(publishedRes.body.posts[0].email);
            assert.equal(publishedRes.body.posts[0].email.email_count, 2);
        });

        it('read-only value do not cause errors when edited', function () {
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
                                frontmatter: 'hey!',
                                plaintext: 'hello!',
                                updated_at: res.body.posts[0].updated_at
                            }]
                        })
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(200);
                })
                .then((res) => {
                    // NOTE: when ONLY ignored fields are posted they should not change a thing, thus cache stays untouched
                    assert.equal(res.headers['x-cache-invalidate'], undefined);

                    assertExists(res.body.posts);
                    assertExists(res.body.posts[0].published_at);
                    assert.equal(res.body.posts[0].frontmatter, null);
                    assert.equal(res.body.posts[0].plaintext, testUtils.DataGenerator.Content.posts[0].plaintext);
                });
        });

        it('html to plaintext', function () {
            return request
                .get(localUtils.API.getApiQuery(`posts/${testUtils.DataGenerator.Content.posts[0].id}/`))
                .set('Origin', config.get('url'))
                .expect(200)
                .then((res) => {
                    return request
                        .put(localUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[0].id + '/?source=html&formats=html,plaintext'))
                        .set('Origin', config.get('url'))
                        .send({
                            posts: [{
                                html: '<p>HTML Ipsum presents</p>',
                                updated_at: res.body.posts[0].updated_at
                            }]
                        })
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(200);
                })
                .then((res) => {
                    return models.Post.findOne({
                        id: res.body.posts[0].id
                    }, testUtils.context.internal);
                })
                .then((model) => {
                    assert.equal(model.get('plaintext'), 'HTML Ipsum presents');
                });
        });

        it('canonical_url', function () {
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
                                canonical_url: `/canonical/url`,
                                updated_at: res.body.posts[0].updated_at
                            }]
                        })
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(200);
                })
                .then((res) => {
                    assertExists(res.body.posts);
                    assertExists(res.body.posts[0].canonical_url);
                    assert.equal(res.body.posts[0].canonical_url, `${config.get('url')}/canonical/url`);
                });
        });

        it('update dates', function () {
            const post = {
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
                    assert.equal(res.headers['x-cache-invalidate'], undefined);

                    return models.Post.findOne({
                        id: res.body.posts[0].id
                    }, testUtils.context.internal);
                })
                .then((model) => {
                    // We expect that the changed properties aren't changed, they are still the same than before.
                    assert.notEqual(model.get('created_at').toISOString(), post.created_at);

                    // `updated_at` is automatically set, but it's not the date we send to override.
                    assert.notEqual(model.get('updated_at').toISOString(), post.updated_at);
                });
        });

        it('Can change scheduled post', function () {
            return request
                .get(localUtils.API.getApiQuery(`posts/${testUtils.DataGenerator.Content.posts[7].id}/`))
                .set('Origin', config.get('url'))
                .expect(200)
                .then((res) => {
                    assert.equal(res.body.posts[0].status, 'scheduled');

                    return request
                        .put(localUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[7].id + '/'))
                        .set('Origin', config.get('url'))
                        .send({
                            posts: [{
                                title: 'change scheduled post',
                                updated_at: res.body.posts[0].updated_at
                            }]
                        })
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(200);
                })
                .then((res) => {
                    assertExists(res.headers['x-cache-invalidate']);
                });
        });

        it('trims title', function () {
            const untrimmedTitle = '  test trimmed update title  ';

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
                                title: untrimmedTitle,
                                updated_at: res.body.posts[0].updated_at
                            }]
                        })
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(200);
                })
                .then((res) => {
                    assertExists(res.body.posts);
                    assertExists(res.body.posts[0].title);
                    assert.equal(res.body.posts[0].title, untrimmedTitle.trim());
                });
        });

        it('strips invisible unicode from slug', function () {
            const slug = 'this-is\u0008-invisible';

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
                                slug: slug,
                                updated_at: res.body.posts[0].updated_at
                            }]
                        })
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(200);
                })
                .then((res) => {
                    assertExists(res.body.posts);
                    assertExists(res.body.posts[0].slug);
                    assert.equal(res.body.posts[0].slug, 'this-is-invisible');
                });
        });

        it('accepts visibility parameter', function () {
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
                                visibility: 'members',
                                updated_at: res.body.posts[0].updated_at
                            }]
                        })
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(200);
                })
                .then((res) => {
                    assertExists(res.body.posts);
                    assertExists(res.body.posts[0].visibility);
                    assert.equal(res.body.posts[0].visibility, 'members');
                });
        });

        it('changes to post_meta fields triggers a cache invalidation', function () {
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
                                meta_title: 'changed meta title',
                                updated_at: res.body.posts[0].updated_at
                            }]
                        })
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(200);
                })
                .then((res) => {
                    assertExists(res.headers['x-cache-invalidate']);

                    assertExists(res.body.posts);
                    assert.equal(res.body.posts[0].meta_title, 'changed meta title');
                });
        });

        it('can edit post_meta field that has default value and no previously created posts_meta relation', function () {
            return request
                .get(localUtils.API.getApiQuery(`posts/${testUtils.DataGenerator.Content.posts[3].id}/`))
                .set('Origin', config.get('url'))
                .expect(200)
                .then((res) => {
                    assert.equal(res.body.posts[0].email_only, false);

                    return request
                        .put(localUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[3].id + '/'))
                        .set('Origin', config.get('url'))
                        .send({
                            posts: [{
                                email_only: true,
                                updated_at: res.body.posts[0].updated_at
                            }]
                        })
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(200);
                })
                .then((res) => {
                    assertExists(res.headers['x-cache-invalidate']);

                    assertExists(res.body.posts);
                    assert.equal(res.body.posts[0].email_only, true);
                    assert.equal(new URL(res.body.posts[0].url).pathname, '/email/d52c42ae-2755-455c-80ec-70b2ec55c903/');
                });
        });

        it('saving post with no modbiledoc content doesn\t trigger cache invalidation', function () {
            return request
                .post(localUtils.API.getApiQuery('posts/'))
                .set('Origin', config.get('url'))
                .send({
                    posts: [{
                        title: 'Has a title by no other content',
                        status: 'published'
                    }]
                })
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(201)
                .then((res) => {
                    assertExists(res.body.posts);
                    assertExists(res.body.posts[0].title);
                    assert.equal(res.body.posts[0].title, 'Has a title by no other content');
                    assert.equal(res.body.posts[0].html, undefined);
                    assert.equal(res.body.posts[0].plaintext, undefined);

                    return request
                        .put(localUtils.API.getApiQuery(`posts/${res.body.posts[0].id}/`))
                        .set('Origin', config.get('url'))
                        .send({
                            posts: [{
                                title: res.body.posts[0].title,
                                mobilecdoc: res.body.posts[0].mobilecdoc,
                                updated_at: res.body.posts[0].updated_at
                            }]
                        })
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(200);
                })
                .then((res) => {
                    assert.equal(res.headers['x-cache-invalidate'], undefined);

                    assertExists(res.body.posts);
                    assert.equal(res.body.posts[0].title, 'Has a title by no other content');
                    assert.equal(res.body.posts[0].html, undefined);
                    assert.equal(res.body.posts[0].plaintext, undefined);
                });
        });

        it('errors with invalid email segment', function () {
            return request
                .post(localUtils.API.getApiQuery('posts/'))
                .set('Origin', config.get('url'))
                .send({
                    posts: [{
                        title: 'Ready to be emailed',
                        status: 'draft'
                    }]
                })
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(201)
                .then((res) => {
                    return request
                        .put(`${localUtils.API.getApiQuery(`posts/${res.body.posts[0].id}/`)}?newsletter=${secondNewsletterSlug}&email_segment=not-a-filter`)
                        .set('Origin', config.get('url'))
                        .send({
                            posts: [{
                                title: res.body.posts[0].title,
                                mobilecdoc: res.body.posts[0].mobilecdoc,
                                updated_at: res.body.posts[0].updated_at,
                                status: 'published'
                            }]
                        })
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(400);
                })
                .then((res) => {
                    assert.match(res.text, /valid filter/i);
                });
        });
    });

    describe('Destroy', function () {
        it('non existent post', function () {
            return request
                .del(localUtils.API.getApiQuery('posts/' + ObjectId().toHexString() + '/'))
                .set('Origin', config.get('url'))
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(404)
                .then((res) => {
                    assert.equal(res.headers['x-cache-invalidate'], undefined);
                    assertExists(res.body);
                    assertExists(res.body.errors);
                    testUtils.API.checkResponseValue(res.body.errors[0], [
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
                });
        });
    });
});
