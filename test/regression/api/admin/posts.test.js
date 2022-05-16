const _ = require('lodash');
const should = require('should');
const supertest = require('supertest');
const ObjectId = require('bson-objectid');
const moment = require('moment-timezone');
const testUtils = require('../../../utils');
const config = require('../../../../core/shared/config');
const models = require('../../../../core/server/models');
const localUtils = require('./utils');

const defaultNewsletterSlug = testUtils.DataGenerator.Content.newsletters[0].slug;
const secondNewsletterSlug = testUtils.DataGenerator.Content.newsletters[1].slug;

describe('Posts API (canary)', function () {
    let request;

    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));

        // Archive the default newsletter fixture
        const defaultNewsletter = await models.Newsletter.findOne({status: 'active'});
        await models.Newsletter.edit({status: 'archived'}, {id: defaultNewsletter.id});

        await localUtils.doAuth(request, 'users:extra', 'posts', 'emails', 'newsletters', 'members:newsletters');
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

                    should.not.exist(res.headers['x-cache-invalidate']);
                    const jsonResponse = res.body;
                    should.exist(jsonResponse.posts);
                    localUtils.API.checkResponse(jsonResponse, 'posts');
                    jsonResponse.posts.should.have.length(2);
                    jsonResponse.posts.forEach((post) => {
                        should.notEqual(post.meta_description, null);
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

                    should.not.exist(res.headers['x-cache-invalidate']);
                    const jsonResponse = res.body;
                    should.exist(jsonResponse.posts);
                    localUtils.API.checkResponse(jsonResponse, 'posts');
                    jsonResponse.posts.should.have.length(1);
                    jsonResponse.posts[0].id.should.equal(testUtils.DataGenerator.Content.posts[2].id);
                    jsonResponse.posts[0].meta_description.should.equal('meta description for short and sweet');

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

                    should.not.exist(res.headers['x-cache-invalidate']);
                    const jsonResponse = res.body;
                    should.exist(jsonResponse.posts);
                    localUtils.API.checkResponse(jsonResponse, 'posts');
                    jsonResponse.posts.should.have.length(13);

                    should.equal(jsonResponse.posts[0].meta_description, null);
                    jsonResponse.posts[12].slug.should.equal('short-and-sweet');
                    jsonResponse.posts[12].meta_description.should.equal('meta description for short and sweet');

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
                    should.not.exist(res.headers['x-cache-invalidate']);
                    const jsonResponse = res.body;
                    should.exist(jsonResponse.posts);
                    localUtils.API.checkResponse(jsonResponse, 'posts');
                    jsonResponse.posts.should.have.length(15);

                    jsonResponse.posts[0].slug.should.equal('80-open-rate', 'DESC 1st');
                    jsonResponse.posts[1].slug.should.equal('60-open-rate', 'DESC 2nd');

                    localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                });

            await request.get(localUtils.API.getApiQuery('posts/?order=email.open_rate%20ASC'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .then((res) => {
                    const jsonResponse = res.body;
                    jsonResponse.posts[0].slug.should.equal('60-open-rate', 'ASC 1st');
                    jsonResponse.posts[1].slug.should.equal('80-open-rate', 'ASC 2nd');
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
                    should.exist(res.body.posts);
                    should.exist(res.body.posts[0].title);
                    res.body.posts[0].title.should.equal('(Untitled)');

                    should.exist(res.headers.location);
                    res.headers.location.should.equal(`http://127.0.0.1:2369${localUtils.API.getApiQuery('posts/')}${res.body.posts[0].id}/`);
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
                    should.exist(res.body.posts);
                    should.exist(res.body.posts[0].title);
                    res.body.posts[0].title.should.equal('Tags test 1');
                    res.body.posts[0].tags.length.should.equal(2);
                    res.body.posts[0].tags[0].slug.should.equal('one');
                    res.body.posts[0].tags[1].slug.should.equal('two');
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
                    should.exist(res.body.posts);
                    should.exist(res.body.posts[0].title);
                    res.body.posts[0].title.should.equal('Tags test 2');
                    res.body.posts[0].tags.length.should.equal(2);
                    res.body.posts[0].tags[0].slug.should.equal('one');
                    res.body.posts[0].tags[1].slug.should.equal('two');
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
                    should.exist(res.body.posts);
                    should.exist(res.body.posts[0].title);
                    res.body.posts[0].title.should.equal('Tags test 3');
                    res.body.posts[0].tags.length.should.equal(2);
                    res.body.posts[0].tags[0].slug.should.equal('one');
                    res.body.posts[0].tags[1].slug.should.equal('two');
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
                    should.exist(res.body.posts);
                    should.exist(res.body.posts[0].title);
                    res.body.posts[0].title.should.equal('Tags test 4');
                    res.body.posts[0].tags.length.should.equal(2);
                    res.body.posts[0].tags[0].slug.should.equal('three');
                    res.body.posts[0].tags[1].slug.should.equal('four');
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

            should.exist(res.body.posts);
            should.exist(res.body.posts[0].title);
            res.body.posts[0].title.should.equal('Tags test 5');
            res.body.posts[0].tags.length.should.equal(1);
            res.body.posts[0].tags[0].slug.should.equal('five-spaces');

            // Expected behaviour when creating a slug with spaces:
            res.body.posts[0].tags[0].name.should.equal('five-spaces');

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

            should.exist(res2.body.posts);
            should.exist(res2.body.posts[0].title);
            res2.body.posts[0].title.should.equal('Tags test 6');
            res2.body.posts[0].tags.length.should.equal(1);
            res2.body.posts[0].tags[0].id.should.equal(res.body.posts[0].tags[0].id);
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

            should.exist(res.body.posts);
            should.exist(res.body.posts[0].title);
            res.body.posts[0].title.should.equal('Tags test 7');
            res.body.posts[0].tags.length.should.equal(1);
            res.body.posts[0].tags[0].slug.should.equal('six-spaces');
            res.body.posts[0].tags[0].name.should.equal('Not automated name for six spaces');

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

            should.exist(res2.body.posts);
            should.exist(res2.body.posts[0].title);
            res2.body.posts[0].title.should.equal('Tags test 8');
            res2.body.posts[0].tags.length.should.equal(1);
            res2.body.posts[0].tags[0].id.should.equal(res.body.posts[0].tags[0].id);
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

            should.exist(res.body.posts);
            should.exist(res.body.posts[0].title);
            res.body.posts[0].title.should.equal('Tags test 9');
            res.body.posts[0].tags.length.should.equal(1);
            res.body.posts[0].tags[0].slug.should.equal(tooLongSlug.substring(0, 185));

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

            should.exist(res2.body.posts);
            should.exist(res2.body.posts[0].title);
            res2.body.posts[0].title.should.equal('Tags test 10');
            res2.body.posts[0].tags.length.should.equal(1);
            res2.body.posts[0].tags[0].id.should.equal(res.body.posts[0].tags[0].id);
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
                    should.exist(res.headers['x-cache-invalidate']);
                    should.exist(res.body.posts);
                    should.exist(res.body.posts[0].published_at);
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

            should.exist(res.body.posts);
            should.exist(res.body.posts[0].title);
            res.body.posts[0].title.should.equal('Email me');
            res.body.posts[0].email_only.should.be.true();
            res.body.posts[0].status.should.equal('draft');

            should.exist(res.headers.location);
            res.headers.location.should.equal(`http://127.0.0.1:2369${localUtils.API.getApiQuery('posts/')}${res.body.posts[0].id}/`);

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

            should.exist(publishedRes.body.posts);
            res.body.posts[0].email_only.should.be.true();
            publishedRes.body.posts[0].status.should.equal('sent');

            should.exist(publishedRes.body.posts[0].email);
            publishedRes.body.posts[0].email.email_count.should.equal(4);
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

            should.exist(res.body.posts);
            should.exist(res.body.posts[0].title);
            res.body.posts[0].title.should.equal('Email me');
            res.body.posts[0].email_only.should.be.false();
            res.body.posts[0].status.should.equal('draft');

            should.exist(res.headers.location);
            res.headers.location.should.equal(`http://127.0.0.1:2369${localUtils.API.getApiQuery('posts/')}${res.body.posts[0].id}/`);

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

            should.exist(publishedRes.body.posts);
            publishedRes.body.posts[0].status.should.equal('sent');

            should.exist(publishedRes.body.posts[0].email);
            publishedRes.body.posts[0].email.email_count.should.equal(2);
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

            should.exist(res.body.posts);
            should.exist(res.body.posts[0].title);
            res.body.posts[0].title.should.equal('Email me');
            res.body.posts[0].email_only.should.be.false();
            res.body.posts[0].status.should.equal('draft');

            should.exist(res.headers.location);
            res.headers.location.should.equal(`http://127.0.0.1:2369${localUtils.API.getApiQuery('posts/')}${res.body.posts[0].id}/`);

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

            should.exist(publishedRes.body.posts);
            publishedRes.body.posts[0].status.should.equal('sent');

            should.exist(publishedRes.body.posts[0].email);
            publishedRes.body.posts[0].email.email_count.should.equal(2);
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
                    should.not.exist(res.headers['x-cache-invalidate']);

                    should.exist(res.body.posts);
                    should.exist(res.body.posts[0].published_at);
                    should.equal(res.body.posts[0].frontmatter, null);
                    should.equal(res.body.posts[0].plaintext, testUtils.DataGenerator.Content.posts[0].plaintext);
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
                    model.get('plaintext').should.equal('HTML Ipsum presents');
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
                    should.exist(res.body.posts);
                    should.exist(res.body.posts[0].canonical_url);
                    res.body.posts[0].canonical_url.should.equal(`${config.get('url')}/canonical/url`);
                });
        });

        it('update dates & x_by', function () {
            const post = {
                created_by: ObjectId().toHexString(),
                updated_by: ObjectId().toHexString(),
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

        it('Can change scheduled post', function () {
            return request
                .get(localUtils.API.getApiQuery(`posts/${testUtils.DataGenerator.Content.posts[7].id}/`))
                .set('Origin', config.get('url'))
                .expect(200)
                .then((res) => {
                    res.body.posts[0].status.should.eql('scheduled');

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
                    should.exist(res.headers['x-cache-invalidate']);
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
                    should.exist(res.body.posts);
                    should.exist(res.body.posts[0].title);
                    res.body.posts[0].title.should.equal(untrimmedTitle.trim());
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
                    should.exist(res.body.posts);
                    should.exist(res.body.posts[0].slug);
                    res.body.posts[0].slug.should.equal('this-is-invisible');
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
                    should.exist(res.body.posts);
                    should.exist(res.body.posts[0].visibility);
                    res.body.posts[0].visibility.should.equal('members');
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
                    should.exist(res.headers['x-cache-invalidate']);

                    should.exist(res.body.posts);
                    should.equal(res.body.posts[0].meta_title, 'changed meta title');
                });
        });

        it('can edit post_meta field that has default value and no previously created posts_meta relation', function () {
            return request
                .get(localUtils.API.getApiQuery(`posts/${testUtils.DataGenerator.Content.posts[3].id}/`))
                .set('Origin', config.get('url'))
                .expect(200)
                .then((res) => {
                    should.equal(res.body.posts[0].email_only, false);

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
                    should.exist(res.headers['x-cache-invalidate']);

                    should.exist(res.body.posts);
                    should.equal(res.body.posts[0].email_only, true);
                    should.equal(res.body.posts[0].url, 'http://127.0.0.1:2369/email/d52c42ae-2755-455c-80ec-70b2ec55c903/');
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
                    should.exist(res.body.posts);
                    should.exist(res.body.posts[0].title);
                    res.body.posts[0].title.should.equal('Has a title by no other content');
                    should.equal(res.body.posts[0].html, undefined);
                    should.equal(res.body.posts[0].plaintext, undefined);

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
                    should.not.exist(res.headers['x-cache-invalidate']);

                    should.exist(res.body.posts);
                    res.body.posts[0].title.should.equal('Has a title by no other content');
                    should.equal(res.body.posts[0].html, undefined);
                    should.equal(res.body.posts[0].plaintext, undefined);
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
                    res.text.should.match(/valid filter/i);
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
                    should.not.exist(res.headers['x-cache-invalidate']);
                    should.exist(res.body);
                    should.exist(res.body.errors);
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
