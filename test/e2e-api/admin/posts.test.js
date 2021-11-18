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
const configUtils = require('../../utils/configUtils');

describe('Posts API', function () {
    let request;

    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request, 'users:extra', 'posts', 'emails');
    });

    afterEach(function () {
        nock.cleanAll();
    });

    it('Can retrieve all posts', async function () {
        const res = await request.get(localUtils.API.getApiQuery('posts/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        should.exist(jsonResponse.posts);
        localUtils.API.checkResponse(jsonResponse, 'posts');
        jsonResponse.posts.should.have.length(13);
        localUtils.API.checkResponse(jsonResponse.posts[0], 'post');
        localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
        _.isBoolean(jsonResponse.posts[0].featured).should.eql(true);
        _.isBoolean(jsonResponse.posts[0].email_only).should.eql(true);
        jsonResponse.posts[0].email_only.should.eql(false);

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
    });

    it('Can retrieve multiple post formats', async function () {
        const res = await request.get(localUtils.API.getApiQuery('posts/?formats=plaintext,mobiledoc&limit=3&order=title%20ASC'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        should.exist(jsonResponse.posts);
        localUtils.API.checkResponse(jsonResponse, 'posts');
        jsonResponse.posts.should.have.length(3);
        localUtils.API.checkResponse(jsonResponse.posts[0], 'post', ['plaintext']);
        localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
        _.isBoolean(jsonResponse.posts[0].featured).should.eql(true);

        // ensure order works
        jsonResponse.posts[0].slug.should.eql('portal');
    });

    it('Can include single relation', async function () {
        const res = await request.get(localUtils.API.getApiQuery('posts/?include=tags'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

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
    });

    it('Can filter posts', async function () {
        const res = await request.get(localUtils.API.getApiQuery('posts/?filter=featured:true'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        should.exist(jsonResponse.posts);
        localUtils.API.checkResponse(jsonResponse, 'posts');
        jsonResponse.posts.should.have.length(2);
        localUtils.API.checkResponse(jsonResponse.posts[0], 'post');
        localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
    });

    it('Cannot receive pages', async function () {
        const res = await request.get(localUtils.API.getApiQuery('posts/?filter=page:true'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        should.exist(jsonResponse.posts);
        localUtils.API.checkResponse(jsonResponse, 'posts');
        jsonResponse.posts.should.have.length(0);
    });

    it('Can paginate posts', async function () {
        const res = await request.get(localUtils.API.getApiQuery('posts/?page=2'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        const jsonResponse = res.body;
        should.equal(jsonResponse.meta.pagination.page, 2);
    });

    it('Can request a post by id', async function () {
        const res = await request.get(localUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[0].id + '/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        should.exist(jsonResponse);
        should.exist(jsonResponse.posts);
        localUtils.API.checkResponse(jsonResponse.posts[0], 'post');
        jsonResponse.posts[0].id.should.equal(testUtils.DataGenerator.Content.posts[0].id);

        _.isBoolean(jsonResponse.posts[0].featured).should.eql(true);

        testUtils.API.isISO8601(jsonResponse.posts[0].created_at).should.be.true();
    });

    it('Can retrieve a post by slug', async function () {
        const res = await request.get(localUtils.API.getApiQuery('posts/slug/welcome/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        should.exist(jsonResponse);
        should.exist(jsonResponse.posts);
        localUtils.API.checkResponse(jsonResponse.posts[0], 'post');
        jsonResponse.posts[0].slug.should.equal('welcome');

        _.isBoolean(jsonResponse.posts[0].featured).should.eql(true);
    });

    it('Can include relations for a single post', async function () {
        const res = await request
            .get(localUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[0].id + '/?include=authors,tags,email'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

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
    });

    it('Can add a post', async function () {
        const post = {
            title: 'My post',
            status: 'draft',
            feature_image_alt: 'Testing feature image alt',
            feature_image_caption: 'Testing <b>feature image caption</b>',
            published_at: '2016-05-30T07:00:00.000Z',
            mobiledoc: testUtils.DataGenerator.markdownToMobiledoc('my post'),
            created_at: moment().subtract(2, 'days').toDate(),
            updated_at: moment().subtract(2, 'days').toDate(),
            created_by: ObjectId().toHexString(),
            updated_by: ObjectId().toHexString()
        };

        const res = await request.post(localUtils.API.getApiQuery('posts'))
            .set('Origin', config.get('url'))
            .send({posts: [post]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);

        res.body.posts.length.should.eql(1);
        localUtils.API.checkResponse(res.body.posts[0], 'post');
        res.body.posts[0].url.should.match(new RegExp(`${config.get('url')}/p/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}`));
        should.not.exist(res.headers['x-cache-invalidate']);

        should.exist(res.headers.location);
        res.headers.location.should.equal(`http://127.0.0.1:2369${localUtils.API.getApiQuery('posts/')}${res.body.posts[0].id}/`);

        const model = await models.Post.findOne({
            id: res.body.posts[0].id,
            status: 'draft'
        }, testUtils.context.internal);

        const modelJson = model.toJSON();

        modelJson.title.should.eql(post.title);
        modelJson.status.should.eql(post.status);
        modelJson.published_at.toISOString().should.eql('2016-05-30T07:00:00.000Z');
        modelJson.created_at.toISOString().should.not.eql(post.created_at.toISOString());
        modelJson.updated_at.toISOString().should.not.eql(post.updated_at.toISOString());
        modelJson.updated_by.should.not.eql(post.updated_by);
        modelJson.created_by.should.not.eql(post.created_by);

        modelJson.posts_meta.feature_image_alt.should.eql(post.feature_image_alt);
        modelJson.posts_meta.feature_image_caption.should.eql(post.feature_image_caption);
    });

    it('Can update draft', async function () {
        const post = {
            title: 'update draft'
        };

        const res = await request
            .get(localUtils.API.getApiQuery(`posts/${testUtils.DataGenerator.Content.posts[3].id}/`))
            .set('Origin', config.get('url'))
            .expect(200);

        post.updated_at = res.body.posts[0].updated_at;

        const res2 = await request.put(localUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[3].id))
            .set('Origin', config.get('url'))
            .send({posts: [post]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        res2.headers['x-cache-invalidate'].should.eql('/p/' + res2.body.posts[0].uuid + '/');
    });

    it('Can update and force re-render', async function () {
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

        const res = await request
            .get(localUtils.API.getApiQuery(`posts/${testUtils.DataGenerator.Content.posts[3].id}/`))
            .set('Origin', config.get('url'))
            .expect(200);

        post.updated_at = res.body.posts[0].updated_at;

        const res2 = await request
            .put(localUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[3].id + '/?force_rerender=true&formats=mobiledoc,html'))
            .set('Origin', config.get('url'))
            .send({posts: [post]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private);

        res2.headers['x-cache-invalidate'].should.eql('/p/' + res2.body.posts[0].uuid + '/');

        unsplashMock.isDone().should.be.true();

        // mobiledoc is updated with image sizes
        const resMobiledoc = JSON.parse(res2.body.posts[0].mobiledoc);
        const cardPayload = resMobiledoc.cards[mobiledoc.cards.length - 1][1];
        cardPayload.width.should.eql(800);
        cardPayload.height.should.eql(257);

        // html is re-rendered to include srcset
        res2.body.posts[0].html.should.match(/srcset="https:\/\/images\.unsplash\.com\/favicon_too_large\?ixlib=rb-1\.2\.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=600&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 600w, https:\/\/images\.unsplash\.com\/favicon_too_large\?ixlib=rb-1\.2\.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=800&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 800w"/);
    });

    it('Can unpublish a post', async function () {
        const post = {
            status: 'draft'
        };

        const res = await request
            .get(localUtils.API.getApiQuery(`posts/${testUtils.DataGenerator.Content.posts[1].id}/?`))
            .set('Origin', config.get('url'))
            .expect(200);

        post.updated_at = res.body.posts[0].updated_at;

        const res2 = await request
            .put(localUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[1].id + '/'))
            .set('Origin', config.get('url'))
            .send({posts: [post]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        res2.headers['x-cache-invalidate'].should.eql('/*');
        res2.body.posts[0].status.should.eql('draft');
    });

    it('Can destroy a post', async function () {
        const res = await request
            .del(localUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[0].id + '/'))
            .set('Origin', config.get('url'))
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(204);

        res.body.should.be.empty();
        res.headers['x-cache-invalidate'].should.eql('/*');
    });

    it('Cannot get post via pages endpoint', async function () {
        await request.get(localUtils.API.getApiQuery(`pages/${testUtils.DataGenerator.Content.posts[3].id}/`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(404);
    });

    it('Cannot update post via pages endpoint', async function () {
        const post = {
            title: 'fails',
            updated_at: new Date().toISOString()
        };

        await request.put(localUtils.API.getApiQuery('pages/' + testUtils.DataGenerator.Content.posts[3].id))
            .set('Origin', config.get('url'))
            .send({pages: [post]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(404);
    });

    describe('Host Settings: emails limits', function () {
        afterEach(function () {
            configUtils.set('hostSettings:limits', undefined);
        });

        it('Request fails when emails limit is in place', async function () {
            configUtils.set('hostSettings:limits', {
                emails: {
                    disabled: true,
                    error: 'No email shalt be sent'
                }
            });

            // NOTE: need to do a full reboot to reinitialize hostSettings
            await localUtils.startGhost();
            request = supertest.agent(config.get('url'));
            await localUtils.doAuth(request, 'users:extra', 'posts', 'emails');

            const draftPostResponse = await request
                .get(localUtils.API.getApiQuery(`posts/${testUtils.DataGenerator.Content.posts[3].id}/`))
                .set('Origin', config.get('url'))
                .expect(200);

            const draftPost = draftPostResponse.body.posts[0];

            const response = await request
                .put(localUtils.API.getApiQuery(`posts/${draftPost.id}/?email_recipient_filter=all&send_email_when_published=true`))
                .set('Origin', config.get('url'))
                .send({posts: [{
                    status: 'published',
                    updated_at: draftPost.updated_at
                }]})
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(403);

            response.body.errors[0].type.should.equal('HostLimitError');
            response.body.errors[0].context.should.equal('No email shalt be sent');
        });
    });
});
