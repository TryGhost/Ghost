const assert = require('node:assert/strict');
const {assertExists} = require('../../utils/assertions');
const should = require('should');
const nock = require('nock');
const path = require('path');
const supertest = require('supertest');
const _ = require('lodash');
const moment = require('moment-timezone');
const testUtils = require('../../utils');
const config = require('../../../core/shared/config');
const models = require('../../../core/server/models');
const localUtils = require('./utils');
const configUtils = require('../../utils/config-utils');
const mockManager = require('../../utils/e2e-framework-mock-manager');
const sinon = require('sinon');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');

describe('Posts API', function () {
    let request;

    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        /**
         * Members are needed to enable mega to create an email record so that we can test that newsletter_id
         * can't be overwritten after an email record is created.
         */
        await localUtils.doAuth(request, 'users:extra', 'posts', 'emails', 'newsletters', 'members:newsletters');

        // Assign a newsletter to one of the posts
        const newsletterId = testUtils.DataGenerator.Content.newsletters[0].id;
        const postId = testUtils.DataGenerator.Content.posts[0].id;
        await models.Post.edit({newsletter_id: newsletterId}, {id: postId});
    });

    beforeEach(function () {
        mockManager.mockMailgun();
        // Disable network to prevent sending webmentions
        mockManager.disableNetwork();
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('Can retrieve all posts', async function () {
        const res = await request.get(localUtils.API.getApiQuery('posts/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        assert.equal(res.headers['x-cache-invalidate'], undefined);
        const jsonResponse = res.body;
        assertExists(jsonResponse.posts);
        localUtils.API.checkResponse(jsonResponse, 'posts');
        assert.equal(jsonResponse.posts.length, 15);
        localUtils.API.checkResponse(jsonResponse.posts[0], 'post');
        localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
        assert.equal(_.isBoolean(jsonResponse.posts[0].featured), true);
        assert.equal(_.isBoolean(jsonResponse.posts[0].email_only), true);
        assert.equal(jsonResponse.posts[0].email_only, false);

        // Ensure default order
        assert.equal(jsonResponse.posts[0].slug, 'scheduled-post');
        assert.equal(jsonResponse.posts[14].slug, 'html-ipsum');

        // Absolute urls by default
        assert.match(new URL(jsonResponse.posts[0].url).pathname, /\/p\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/);
        assert.equal(new URL(jsonResponse.posts[2].url).pathname, '/welcome/');
        assert.equal(new URL(jsonResponse.posts[13].feature_image).pathname, '/content/images/2018/hey.jpg');

        assert.equal(jsonResponse.posts[0].tags.length, 0);
        assert.equal(jsonResponse.posts[2].tags.length, 1);
        assert.equal(jsonResponse.posts[2].authors.length, 1);
        assert.equal(new URL(jsonResponse.posts[2].tags[0].url).pathname, '/tag/getting-started/');
        assert.equal(new URL(jsonResponse.posts[2].authors[0].url).pathname, '/author/ghost/');

        // Check if the newsletter relation is loaded by default and newsletter_id is not returned
        assert.equal(jsonResponse.posts[14].id, testUtils.DataGenerator.Content.posts[0].id);
        assert.equal(jsonResponse.posts[14].newsletter.id, testUtils.DataGenerator.Content.newsletters[0].id);
        assert.equal(jsonResponse.posts[14].newsletter_id, undefined);

        assert.equal(jsonResponse.posts[0].newsletter, null);
        assert.equal(jsonResponse.posts[0].newsletter_id, undefined);
    });

    it('Can retrieve multiple post formats', async function () {
        const res = await request.get(localUtils.API.getApiQuery('posts/?formats=plaintext,mobiledoc,lexical&limit=3&order=title%20ASC'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        assert.equal(res.headers['x-cache-invalidate'], undefined);
        const jsonResponse = res.body;
        assertExists(jsonResponse.posts);
        localUtils.API.checkResponse(jsonResponse, 'posts');
        assert.equal(jsonResponse.posts.length, 3);
        localUtils.API.checkResponse(jsonResponse.posts[0], 'post', ['plaintext']);
        localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
        assert.equal(_.isBoolean(jsonResponse.posts[0].featured), true);

        // ensure order works
        assert.equal(jsonResponse.posts[0].slug, 'portal');
    });

    it('Can include single relation', async function () {
        const res = await request.get(localUtils.API.getApiQuery('posts/?include=tags'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        assert.equal(res.headers['x-cache-invalidate'], undefined);
        const jsonResponse = res.body;
        assertExists(jsonResponse.posts);
        localUtils.API.checkResponse(jsonResponse, 'posts');
        assert.equal(jsonResponse.posts.length, 15);
        localUtils.API.checkResponse(
            jsonResponse.posts[0],
            'post',
            null,
            ['authors', 'primary_author', 'email', 'tiers', 'newsletter', 'count']
        );

        localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
    });

    it('Can filter posts', async function () {
        const res = await request.get(localUtils.API.getApiQuery('posts/?filter=featured:true'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        assert.equal(res.headers['x-cache-invalidate'], undefined);
        const jsonResponse = res.body;
        assertExists(jsonResponse.posts);
        localUtils.API.checkResponse(jsonResponse, 'posts');
        assert.equal(jsonResponse.posts.length, 2);
        localUtils.API.checkResponse(jsonResponse.posts[0], 'post');
        localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
    });

    it('Returns a validation error when unknown filter key is used', async function () {
        const loggingStub = sinon.stub(logging, 'error');
        await request.get(localUtils.API.getApiQuery('posts/?filter=page:true'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(400);
        sinon.assert.calledOnce(loggingStub);
    });

    it('Can paginate posts', async function () {
        const res = await request.get(localUtils.API.getApiQuery('posts/?page=2'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        const jsonResponse = res.body;
        assert.equal(jsonResponse.meta.pagination.page, 2);
    });

    it('Can request a post by id', async function () {
        const res = await request.get(localUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[0].id + '/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        assert.equal(res.headers['x-cache-invalidate'], undefined);
        const jsonResponse = res.body;
        assertExists(jsonResponse);
        assertExists(jsonResponse.posts);
        localUtils.API.checkResponse(jsonResponse.posts[0], 'post');
        assert.equal(jsonResponse.posts[0].id, testUtils.DataGenerator.Content.posts[0].id);

        assert.equal(_.isBoolean(jsonResponse.posts[0].featured), true);

        assert.equal(testUtils.API.isISO8601(jsonResponse.posts[0].created_at), true);

        // Check if the newsletter relation is loaded by default and newsletter_id is not returned
        assert.equal(jsonResponse.posts[0].newsletter.id, testUtils.DataGenerator.Content.newsletters[0].id);
        assert.equal(jsonResponse.posts[0].newsletter_id, undefined);
    });

    it('Can request a post by id without newsletter', async function () {
        const res = await request.get(localUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[1].id + '/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        assert.equal(res.headers['x-cache-invalidate'], undefined);
        const jsonResponse = res.body;
        assertExists(jsonResponse);
        assertExists(jsonResponse.posts);
        localUtils.API.checkResponse(jsonResponse.posts[0], 'post');
        assert.equal(jsonResponse.posts[0].id, testUtils.DataGenerator.Content.posts[1].id);

        assert.equal(_.isBoolean(jsonResponse.posts[0].featured), true);

        assert.equal(testUtils.API.isISO8601(jsonResponse.posts[0].created_at), true);

        // Newsletter should be returned as null
        assert.equal(jsonResponse.posts[0].newsletter, null);
        assert.equal(jsonResponse.posts[0].newsletter_id, undefined);
    });

    it('Can retrieve a post by slug', async function () {
        const res = await request.get(localUtils.API.getApiQuery('posts/slug/welcome/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        assert.equal(res.headers['x-cache-invalidate'], undefined);
        const jsonResponse = res.body;
        assertExists(jsonResponse);
        assertExists(jsonResponse.posts);
        localUtils.API.checkResponse(jsonResponse.posts[0], 'post');
        assert.equal(jsonResponse.posts[0].slug, 'welcome');

        assert.equal(_.isBoolean(jsonResponse.posts[0].featured), true);

        // Newsletter should be returned as null
        assert.equal(jsonResponse.posts[0].newsletter, null);
        assert.equal(jsonResponse.posts[0].newsletter_id, undefined);
    });

    it('Can include relations for a single post', async function () {
        const res = await request
            .get(localUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[0].id + '/?include=authors,tags,email,tiers,newsletter,post_revisions'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        assert.equal(res.headers['x-cache-invalidate'], undefined);
        const jsonResponse = res.body;
        assertExists(jsonResponse);
        assertExists(jsonResponse.posts);

        localUtils.API.checkResponse(jsonResponse.posts[0], 'post', null, ['count', 'post_revisions']);

        assert(_.isPlainObject(jsonResponse.posts[0].authors[0]));
        localUtils.API.checkResponse(jsonResponse.posts[0].authors[0], 'user');

        assert(_.isPlainObject(jsonResponse.posts[0].tags[0]));
        localUtils.API.checkResponse(jsonResponse.posts[0].tags[0], 'tag', ['url']);

        assert(_.isPlainObject(jsonResponse.posts[0].email));
        localUtils.API.checkResponse(jsonResponse.posts[0].email, 'email');

        assert.equal(jsonResponse.posts[0].newsletter.id, testUtils.DataGenerator.Content.newsletters[0].id);
        assert.equal(jsonResponse.posts[0].newsletter_id, undefined);
    });

    it('Can add a post', async function () {
        const post = {
            title: 'My post',
            status: 'draft',
            feature_image_alt: 'Testing feature image alt',
            feature_image_caption: 'Testing <b>feature image caption</b>',
            published_at: '2016-05-30T07:00:00.000Z',
            mobiledoc: testUtils.DataGenerator.markdownToMobiledoc('my post'),
            created_at: moment('2016-05-30T06:30:00.456Z').toDate(),
            updated_at: moment('2016-05-30T06:30:00.456Z').toDate()
        };

        const res = await request.post(localUtils.API.getApiQuery('posts'))
            .set('Origin', config.get('url'))
            .send({posts: [post]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);

        assert.equal(res.body.posts.length, 1);
        localUtils.API.checkResponse(res.body.posts[0], 'post');
        assert.match(new URL(res.body.posts[0].url).pathname, /\/p\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/);
        assert.equal(res.headers['x-cache-invalidate'], undefined);

        assertExists(res.headers.location);
        assert.equal(new URL(res.headers.location).pathname, `/ghost/api/admin/posts/${res.body.posts[0].id}/`);

        // Newsletter should be returned as null
        assert.equal(res.body.posts[0].newsletter, null);
        assert.equal(res.body.posts[0].newsletter_id, undefined);

        const model = await models.Post.findOne({
            id: res.body.posts[0].id,
            status: 'draft'
        }, testUtils.context.internal);

        const modelJson = model.toJSON();

        assert.equal(modelJson.title, post.title);
        assert.equal(modelJson.status, post.status);
        assert.equal(modelJson.published_at.toISOString(), '2016-05-30T07:00:00.000Z');
        modelJson.created_at.toISOString().should.not.eql(post.created_at.toISOString());
        modelJson.updated_at.toISOString().should.not.eql(post.updated_at.toISOString());

        assert.equal(modelJson.posts_meta.feature_image_alt, post.feature_image_alt);
        assert.equal(modelJson.posts_meta.feature_image_caption, post.feature_image_caption);
    });

    it('Can include free and paid tiers for public post', async function () {
        const publicPost = testUtils.DataGenerator.forKnex.createPost({
            slug: 'free-to-see',
            visibility: 'public',
            published_at: moment().add(15, 'seconds').toDate() // here to ensure sorting is not modified
        });
        await models.Post.add(publicPost, {context: {internal: true}});

        const publicPostRes = await request
            .get(localUtils.API.getApiQuery(`posts/${publicPost.id}/`))
            .set('Origin', config.get('url'))
            .expect(200);
        const publicPostData = publicPostRes.body.posts[0];
        assert.equal(publicPostData.tiers.length, 2);
    });

    it('Can include free and paid tiers for members only post', async function () {
        const membersPost = testUtils.DataGenerator.forKnex.createPost({
            slug: 'thou-shalt-not-be-seen',
            visibility: 'members',
            published_at: moment().add(45, 'seconds').toDate() // here to ensure sorting is not modified
        });
        await models.Post.add(membersPost, {context: {internal: true}});

        const membersPostRes = await request
            .get(localUtils.API.getApiQuery(`posts/${membersPost.id}/`))
            .set('Origin', config.get('url'))
            .expect(200);
        const membersPostData = membersPostRes.body.posts[0];
        assert.equal(membersPostData.tiers.length, 2);
    });

    it('Can include only paid tier for paid post', async function () {
        const paidPost = testUtils.DataGenerator.forKnex.createPost({
            slug: 'thou-shalt-be-paid-for',
            visibility: 'paid',
            published_at: moment().add(30, 'seconds').toDate() // here to ensure sorting is not modified
        });
        await models.Post.add(paidPost, {context: {internal: true}});

        const paidPostRes = await request
            .get(localUtils.API.getApiQuery(`posts/${paidPost.id}/`))
            .set('Origin', config.get('url'))
            .expect(200);
        const paidPostData = paidPostRes.body.posts[0];
        assert.equal(paidPostData.tiers.length, 1);
    });

    it('Can include specific tier for post with tiers visibility', async function () {
        const res = await request.get(localUtils.API.getApiQuery('tiers/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        const jsonResponse = res.body;

        const paidTier = jsonResponse.tiers.find(p => p.type === 'paid');

        const tiersPost = testUtils.DataGenerator.forKnex.createPost({
            slug: 'thou-shalt-be-for-specific-tiers',
            visibility: 'tiers',
            published_at: moment().add(30, 'seconds').toDate() // here to ensure sorting is not modified
        });

        tiersPost.tiers = [paidTier];

        await models.Post.add(tiersPost, {context: {internal: true}});

        const tiersPostRes = await request
            .get(localUtils.API.getApiQuery(`posts/${tiersPost.id}/`))
            .set('Origin', config.get('url'))
            .expect(200);
        const tiersPostData = tiersPostRes.body.posts[0];

        assert.equal(tiersPostData.tiers.length, 1);
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

        const uuid = res2.body.posts[0].uuid;
        const expectedPattern = `/p/${uuid}/, /p/${uuid}/?member_status=anonymous, /p/${uuid}/?member_status=free, /p/${uuid}/?member_status=paid`;
        assert.equal(res2.headers['x-cache-invalidate'], expectedPattern);

        // Newsletter should be returned as null
        assert.equal(res2.body.posts[0].newsletter, null);
        assert.equal(res2.body.posts[0].newsletter_id, undefined);
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

        const uuid = res2.body.posts[0].uuid;
        const expectedPattern = `/p/${uuid}/, /p/${uuid}/?member_status=anonymous, /p/${uuid}/?member_status=free, /p/${uuid}/?member_status=paid`;
        assert.equal(res2.headers['x-cache-invalidate'], expectedPattern);

        assert.equal(unsplashMock.isDone(), true);

        // mobiledoc is updated with image sizes
        const resMobiledoc = JSON.parse(res2.body.posts[0].mobiledoc);
        const cardPayload = resMobiledoc.cards[mobiledoc.cards.length - 1][1];
        assert.equal(cardPayload.width, 800);
        assert.equal(cardPayload.height, 257);

        // html is re-rendered to include srcset
        assert.match(res2.body.posts[0].html, /srcset="https:\/\/images\.unsplash\.com\/favicon_too_large\?ixlib=rb-1\.2\.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=600&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 600w, https:\/\/images\.unsplash\.com\/favicon_too_large\?ixlib=rb-1\.2\.1&amp;q=80&amp;fm=jpg&amp;crop=entropy&amp;cs=tinysrgb&amp;w=800&amp;fit=max&amp;ixid=eyJhcHBfaWQiOjExNzczfQ 800w"/);
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

        assert.equal(res2.headers['x-cache-invalidate'], '/*');
        assert.equal(res2.body.posts[0].status, 'draft');
    });

    it(`Can't change the newsletter of a post from the post body`, async function () {
        const post = {
            newsletter: testUtils.DataGenerator.Content.newsletters[0].id
        };

        const postId = testUtils.DataGenerator.Content.posts[2].id;

        const modelBefore = await models.Post.findOne({
            id: postId
        }, testUtils.context.internal);

        assert.equal(modelBefore.get('newsletter_id'), null, 'This test requires the initial post to not have a newsletter');

        const res = await request
            .get(localUtils.API.getApiQuery(`posts/${postId}/?`))
            .set('Origin', config.get('url'))
            .expect(200);

        post.updated_at = res.body.posts[0].updated_at;

        await request
            .put(localUtils.API.getApiQuery('posts/' + postId + '/'))
            .set('Origin', config.get('url'))
            .send({posts: [post]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        const model = await models.Post.findOne({
            id: postId
        }, testUtils.context.internal);

        assert.equal(model.get('newsletter_id'), null);
    });

    it(`Can't change the newsletter of a post from the post body`, async function () {
        const post = {
            newsletter: {
                id: testUtils.DataGenerator.Content.newsletters[0].id
            }
        };

        const postId = testUtils.DataGenerator.Content.posts[2].id;

        const modelBefore = await models.Post.findOne({
            id: postId
        }, testUtils.context.internal);

        assert.equal(modelBefore.get('newsletter_id'), null, 'This test requires the initial post to not have a newsletter');

        const res = await request
            .get(localUtils.API.getApiQuery(`posts/${postId}/?`))
            .set('Origin', config.get('url'))
            .expect(200);

        post.updated_at = res.body.posts[0].updated_at;

        await request
            .put(localUtils.API.getApiQuery('posts/' + postId + '/'))
            .set('Origin', config.get('url'))
            .send({posts: [post]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        const model = await models.Post.findOne({
            id: postId
        }, testUtils.context.internal);

        assert.equal(model.get('newsletter_id'), null);
    });

    it('Cannot change the newsletter via body when adding', async function () {
        const post = {
            title: 'My newsletter post',
            status: 'draft',
            feature_image_alt: 'Testing newsletter',
            feature_image_caption: 'Testing <b>feature image caption</b>',
            mobiledoc: testUtils.DataGenerator.markdownToMobiledoc('my post'),
            created_at: moment().subtract(2, 'days').toDate(),
            updated_at: moment().subtract(2, 'days').toDate(),
            newsletter: {
                // This should be ignored, the default one should be used instead
                id: testUtils.DataGenerator.Content.newsletters[0].id
            }
        };

        const res = await request.post(localUtils.API.getApiQuery('posts'))
            .set('Origin', config.get('url'))
            .send({posts: [post]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);

        // Check that the default newsletter is used instead of the one in body (not allowed)
        assert.equal(res.body.posts[0].status, 'draft');
        assert.equal(res.body.posts[0].newsletter, null);
        assert.equal(res.body.posts[0].newsletter_id, undefined);

        const id = res.body.posts[0].id;

        const model = await models.Post.findOne({
            id,
            status: 'draft' // Fix for default filter
        }, testUtils.context.internal);

        assert.equal(model.get('newsletter_id'), null);
    });

    it('Cannot send to an archived newsletter', async function () {
        const newsletterSlug = testUtils.DataGenerator.Content.newsletters[2].slug;

        assert.equal(testUtils.DataGenerator.Content.newsletters[2].status, 'archived', 'This test expects an archived newsletter in the test fixtures');

        const post = {
            title: 'My archived newsletter post',
            status: 'draft',
            feature_image_alt: 'Testing newsletter',
            feature_image_caption: 'Testing <b>feature image caption</b>',
            mobiledoc: testUtils.DataGenerator.markdownToMobiledoc('my post'),
            created_at: moment().subtract(2, 'days').toDate(),
            updated_at: moment().subtract(2, 'days').toDate()
        };

        const res = await request.post(localUtils.API.getApiQuery('posts'))
            .set('Origin', config.get('url'))
            .send({posts: [post]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);

        // Check newsletter relation is loaded, but null in response.
        assert.equal(res.body.posts[0].newsletter, null);
        assert.equal(res.body.posts[0].email_segment, 'all');
        assert.equal(res.body.posts[0].newsletter_id, undefined);

        const id = res.body.posts[0].id;

        const updatedPost = res.body.posts[0];
        updatedPost.status = 'published';

        const loggingStub = sinon.stub(logging, 'error');

        await request
            .put(localUtils.API.getApiQuery('posts/' + id + '/?newsletter=' + newsletterSlug))
            .set('Origin', config.get('url'))
            .send({posts: [updatedPost]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(400);

        sinon.assert.calledOnce(loggingStub);
    });

    it('Does not change post status when email sending fails', async function () {
        const emailService = require('../../../core/server/services/email-service');
        const newsletterSlug = testUtils.DataGenerator.Content.newsletters[1].slug;

        // Create a draft post
        const post = {
            title: 'My scheduled email-only post',
            status: 'draft',
            mobiledoc: testUtils.DataGenerator.markdownToMobiledoc('my post'),
            created_at: moment().subtract(2, 'days').toDate(),
            updated_at: moment().subtract(2, 'days').toDate()
        };

        const res = await request.post(localUtils.API.getApiQuery('posts'))
            .set('Origin', config.get('url'))
            .send({posts: [post]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);

        const id = res.body.posts[0].id;
        const createdPost = res.body.posts[0];

        // Schedule the post as email-only with a newsletter
        createdPost.status = 'scheduled';
        createdPost.published_at = moment().add(2, 'days').toDate();
        createdPost.email_only = true;

        const scheduledRes = await request
            .put(localUtils.API.getApiQuery('posts/' + id + '/?newsletter=' + newsletterSlug))
            .set('Origin', config.get('url'))
            .send({posts: [createdPost]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        const scheduledPost = scheduledRes.body.posts[0];
        assert.equal(scheduledPost.status, 'scheduled');

        // Verify the post is scheduled in the database
        let model = await models.Post.findOne({
            id,
            status: 'all'
        }, testUtils.context.internal);
        assert.equal(model.get('status'), 'scheduled');

        // Now stub checkCanSendEmail to throw a HostLimitError (simulating email limits)
        const checkCanSendEmailStub = sinon.stub(emailService.service, 'checkCanSendEmail')
            .rejects(new errors.HostLimitError({
                message: 'Email sending is temporarily disabled'
            }));
        const loggingStub = sinon.stub(logging, 'error');

        // Attempt to publish the scheduled email-only post
        scheduledPost.status = 'published';
        scheduledPost.published_at = moment().toDate();

        const failedRes = await request
            .put(localUtils.API.getApiQuery('posts/' + id + '/'))
            .set('Origin', config.get('url'))
            .send({posts: [scheduledPost]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(403);

        assert.equal(failedRes.body.errors[0].type, 'HostLimitError');

        // CRITICAL: Verify the post status was NOT changed - it should still be scheduled
        model = await models.Post.findOne({
            id,
            status: 'all'
        }, testUtils.context.internal);
        assert.equal(model.get('status'), 'scheduled', 'Post should remain scheduled when email sending fails');

        // No email should have been created
        const email = await models.Email.findOne({
            post_id: id
        }, testUtils.context.internal);
        assert.equal(email, null);

        checkCanSendEmailStub.restore();
        sinon.assert.calledOnce(loggingStub);
    });

    it('Can publish a post without email', async function () {
        const post = {
            title: 'My publish only post',
            status: 'draft',
            feature_image_alt: 'Testing posts',
            feature_image_caption: 'Testing <b>feature image caption</b>',
            mobiledoc: testUtils.DataGenerator.markdownToMobiledoc('my post'),
            created_at: moment().subtract(2, 'days').toDate(),
            updated_at: moment().subtract(2, 'days').toDate()
        };

        const res = await request.post(localUtils.API.getApiQuery('posts'))
            .set('Origin', config.get('url'))
            .send({posts: [post]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);

        // Check newsletter relation is loaded, but null in response.
        assert.equal(res.body.posts[0].newsletter, null);
        assert.equal(res.body.posts[0].newsletter_id, undefined);

        const id = res.body.posts[0].id;

        const updatedPost = res.body.posts[0];

        updatedPost.status = 'published';

        const finalPost = await request
            .put(localUtils.API.getApiQuery('posts/' + id + '/'))
            .set('Origin', config.get('url'))
            .send({posts: [updatedPost]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        // Check newsletter relation is loaded in response
        assert.equal(finalPost.body.posts[0].newsletter, null);
        assert.equal(finalPost.body.posts[0].email_segment, 'all');
        assert.equal(finalPost.body.posts[0].newsletter_id, undefined);

        const model = await models.Post.findOne({
            id
        }, testUtils.context.internal);

        assert.equal(model.get('newsletter_id'), null);

        // Check email
        // Note: we only create an email if we have members susbcribed to the newsletter
        const email = await models.Email.findOne({
            post_id: id
        }, testUtils.context.internal);

        assert.equal(email, null);
    });

    it('Interprets sent status as published for not email only posts', async function () {
        const post = {
            title: 'My publish only post',
            status: 'draft',
            feature_image_alt: 'Testing posts',
            feature_image_caption: 'Testing <b>feature image caption</b>',
            mobiledoc: testUtils.DataGenerator.markdownToMobiledoc('my post'),
            created_at: moment().subtract(2, 'days').toDate(),
            updated_at: moment().subtract(2, 'days').toDate()
        };

        const res = await request.post(localUtils.API.getApiQuery('posts'))
            .set('Origin', config.get('url'))
            .send({posts: [post]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);

        // Check newsletter relation is loaded, but null in response.
        assert.equal(res.body.posts[0].newsletter, null);
        assert.equal(res.body.posts[0].newsletter_id, undefined);

        const id = res.body.posts[0].id;

        const updatedPost = res.body.posts[0];

        updatedPost.status = 'sent';

        const initialModel = await models.Post.findOne({
            id,
            status: 'all'
        }, testUtils.context.internal);
        assert.equal(initialModel.get('published_by'), null);

        const finalPost = await request
            .put(localUtils.API.getApiQuery('posts/' + id + '/'))
            .set('Origin', config.get('url'))
            .send({posts: [updatedPost]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        // Check newsletter relation is loaded in response
        assert.equal(finalPost.body.posts[0].newsletter, null);
        assert.equal(finalPost.body.posts[0].email_segment, 'all');
        assert.equal(finalPost.body.posts[0].newsletter_id, undefined);

        // Check status is set to published
        assert.equal(finalPost.body.posts[0].status, 'published');

        const model = await models.Post.findOne({
            id
        }, testUtils.context.internal);

        assert.equal(model.get('newsletter_id'), null);
        assertExists(model.get('published_by'));

        // Check email
        // Note: we only create an email if we have members susbcribed to the newsletter
        const email = await models.Email.findOne({
            post_id: id
        }, testUtils.context.internal);

        assert.equal(email, null);
    });

    it('Can publish a post and send as email', async function () {
        const newsletterId = testUtils.DataGenerator.Content.newsletters[1].id;
        const newsletterSlug = testUtils.DataGenerator.Content.newsletters[1].slug;

        const post = {
            title: 'My newsletter_id post',
            status: 'draft',
            feature_image_alt: 'Testing newsletter_id',
            feature_image_caption: 'Testing <b>feature image caption</b>',
            mobiledoc: testUtils.DataGenerator.markdownToMobiledoc('my post'),
            created_at: moment().subtract(2, 'days').toDate(),
            updated_at: moment().subtract(2, 'days').toDate()
        };

        const res = await request.post(localUtils.API.getApiQuery('posts'))
            .set('Origin', config.get('url'))
            .send({posts: [post]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);

        // Check newsletter relation is loaded, but null in response.
        assert.equal(res.body.posts[0].newsletter, null);
        assert.equal(res.body.posts[0].newsletter_id, undefined);

        const id = res.body.posts[0].id;

        const updatedPost = res.body.posts[0];

        updatedPost.status = 'published';

        const initialModel = await models.Post.findOne({
            id,
            status: 'all'
        }, testUtils.context.internal);
        assert.equal(initialModel.get('published_by'), null);

        const finalPost = await request
            .put(localUtils.API.getApiQuery('posts/' + id + '/?newsletter=' + newsletterSlug))
            .set('Origin', config.get('url'))
            .send({posts: [updatedPost]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        // Check newsletter relation is loaded in response
        assert.equal(finalPost.body.posts[0].newsletter.id, newsletterId);
        assert.equal(finalPost.body.posts[0].email_segment, 'all');
        assert.equal(finalPost.body.posts[0].newsletter_id, undefined);

        const model = await models.Post.findOne({
            id
        }, testUtils.context.internal);

        assert.equal(model.get('newsletter_id'), newsletterId);
        assertExists(model.get('published_by'));

        // Check email
        // Note: we only create an email if we have members susbcribed to the newsletter
        const email = await models.Email.findOne({
            post_id: id
        }, testUtils.context.internal);

        assertExists(email);
        assert.equal(email.get('newsletter_id'), newsletterId);
        assert(['pending', 'submitted', 'submitting'].includes(email.get('status')));
    });

    it('Interprets sent as published for a post with email', async function () {
        const newsletterId = testUtils.DataGenerator.Content.newsletters[1].id;
        const newsletterSlug = testUtils.DataGenerator.Content.newsletters[1].slug;

        const post = {
            title: 'My newsletter_id post',
            status: 'draft',
            feature_image_alt: 'Testing newsletter_id',
            feature_image_caption: 'Testing <b>feature image caption</b>',
            mobiledoc: testUtils.DataGenerator.markdownToMobiledoc('my post'),
            created_at: moment().subtract(2, 'days').toDate(),
            updated_at: moment().subtract(2, 'days').toDate()
        };

        const res = await request.post(localUtils.API.getApiQuery('posts'))
            .set('Origin', config.get('url'))
            .send({posts: [post]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);

        // Check newsletter relation is loaded, but null in response.
        assert.equal(res.body.posts[0].newsletter, null);
        assert.equal(res.body.posts[0].newsletter_id, undefined);

        const id = res.body.posts[0].id;

        const updatedPost = res.body.posts[0];

        updatedPost.status = 'sent';

        const initialModel = await models.Post.findOne({
            id,
            status: 'all'
        }, testUtils.context.internal);
        assert.equal(initialModel.get('published_by'), null);

        const finalPost = await request
            .put(localUtils.API.getApiQuery('posts/' + id + '/?newsletter=' + newsletterSlug))
            .set('Origin', config.get('url'))
            .send({posts: [updatedPost]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        // Check newsletter relation is loaded in response
        assert.equal(finalPost.body.posts[0].newsletter.id, newsletterId);
        assert.equal(finalPost.body.posts[0].email_segment, 'all');
        assert.equal(finalPost.body.posts[0].newsletter_id, undefined);

        // Check status
        assert.equal(finalPost.body.posts[0].status, 'published');

        const model = await models.Post.findOne({
            id
        }, testUtils.context.internal);

        assert.equal(model.get('newsletter_id'), newsletterId);
        assertExists(model.get('published_by'));

        // Check email
        // Note: we only create an email if we have members susbcribed to the newsletter
        const email = await models.Email.findOne({
            post_id: id
        }, testUtils.context.internal);

        assertExists(email);
        assert.equal(email.get('newsletter_id'), newsletterId);
        assert(['pending', 'submitted', 'submitting'].includes(email.get('status')));
    });

    it('Can publish an email_only post by setting status to published', async function () {
        const newsletterId = testUtils.DataGenerator.Content.newsletters[1].id;
        const newsletterSlug = testUtils.DataGenerator.Content.newsletters[1].slug;

        const post = {
            title: 'My post',
            status: 'draft',
            feature_image_alt: 'Testing newsletter in posts',
            feature_image_caption: 'Testing <b>feature image caption</b>',
            mobiledoc: testUtils.DataGenerator.markdownToMobiledoc('my post'),
            created_at: moment().subtract(2, 'days').toDate(),
            updated_at: moment().subtract(2, 'days').toDate()
        };

        const res = await request.post(localUtils.API.getApiQuery('posts'))
            .set('Origin', config.get('url'))
            .send({posts: [post]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);

        const id = res.body.posts[0].id;

        const updatedPost = res.body.posts[0];

        updatedPost.status = 'published';
        //updatedPost.published_at = moment().add(2, 'days').toDate();
        updatedPost.email_only = true;

        const initialModel = await models.Post.findOne({
            id,
            status: 'all'
        }, testUtils.context.internal);
        assert.equal(initialModel.get('published_by'), null);

        const publishedRes = await request
            .put(localUtils.API.getApiQuery('posts/' + id + '/?newsletter=' + newsletterSlug))
            .set('Origin', config.get('url'))
            .send({posts: [updatedPost]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        const publishedPost = publishedRes.body.posts[0];

        assert.equal(publishedPost.newsletter.id, newsletterId);
        assert.equal(publishedPost.email_segment, 'all');
        assert.equal(publishedPost.status, 'sent');
        assert.equal(publishedPost.newsletter_id, undefined);

        let model = await models.Post.findOne({
            id,
            status: 'all'
        }, testUtils.context.internal);

        assert.equal(model.get('status'), 'sent');
        assert.equal(model.get('newsletter_id'), newsletterId);
        assert.equal(model.get('email_recipient_filter'), 'all');
        assertExists(model.get('published_by'));

        // We should have an email
        const email = await models.Email.findOne({
            post_id: id
        }, testUtils.context.internal);

        assert.equal(email.get('newsletter_id'), newsletterId);
        assert.equal(email.get('recipient_filter'), 'all');
        assert(['pending', 'submitted', 'submitting'].includes(email.get('status')));
    });

    it('Can publish an email_only post with free filter', async function () {
        const newsletterId = testUtils.DataGenerator.Content.newsletters[1].id;
        const newsletterSlug = testUtils.DataGenerator.Content.newsletters[1].slug;

        const post = {
            title: 'My post',
            status: 'draft',
            feature_image_alt: 'Testing newsletter in posts',
            feature_image_caption: 'Testing <b>feature image caption</b>',
            mobiledoc: testUtils.DataGenerator.markdownToMobiledoc('my post'),
            created_at: moment().subtract(2, 'days').toDate(),
            updated_at: moment().subtract(2, 'days').toDate()
        };

        const res = await request.post(localUtils.API.getApiQuery('posts'))
            .set('Origin', config.get('url'))
            .send({posts: [post]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);

        const id = res.body.posts[0].id;

        const updatedPost = res.body.posts[0];

        updatedPost.status = 'published';
        updatedPost.email_only = true;

        const initialModel = await models.Post.findOne({
            id,
            status: 'all'
        }, testUtils.context.internal);
        assert.equal(initialModel.get('published_by'), null);

        const publishedRes = await request
            .put(localUtils.API.getApiQuery('posts/' + id + '/?newsletter=' + newsletterSlug + '&email_segment=status%3Afree'))
            .set('Origin', config.get('url'))
            .send({posts: [updatedPost]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        const publishedPost = publishedRes.body.posts[0];

        assert.equal(publishedPost.newsletter.id, newsletterId);
        assert.equal(publishedPost.email_segment, 'status:free');
        assert.equal(publishedPost.status, 'sent');
        assert.equal(publishedPost.newsletter_id, undefined);

        let model = await models.Post.findOne({
            id,
            status: 'all'
        }, testUtils.context.internal);

        assert.equal(model.get('status'), 'sent');
        assert.equal(model.get('newsletter_id'), newsletterId);
        assert.equal(model.get('email_recipient_filter'), 'status:free');
        assertExists(model.get('published_by'));

        // We should have an email
        const email = await models.Email.findOne({
            post_id: id
        }, testUtils.context.internal);

        assert.equal(email.get('newsletter_id'), newsletterId);
        assert.equal(email.get('recipient_filter'), 'status:free');
        assert(['pending', 'submitted', 'submitting'].includes(email.get('status')));
    });

    it('Can publish an email_only post by setting the status to sent', async function () {
        const newsletterId = testUtils.DataGenerator.Content.newsletters[1].id;
        const newsletterSlug = testUtils.DataGenerator.Content.newsletters[1].slug;

        const post = {
            title: 'My post',
            status: 'draft',
            feature_image_alt: 'Testing newsletter in posts',
            feature_image_caption: 'Testing <b>feature image caption</b>',
            mobiledoc: testUtils.DataGenerator.markdownToMobiledoc('my post'),
            created_at: moment().subtract(2, 'days').toDate(),
            updated_at: moment().subtract(2, 'days').toDate()
        };

        const res = await request.post(localUtils.API.getApiQuery('posts'))
            .set('Origin', config.get('url'))
            .send({posts: [post]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);

        const id = res.body.posts[0].id;

        const updatedPost = res.body.posts[0];

        updatedPost.status = 'sent';
        updatedPost.email_only = true;

        const initialModel = await models.Post.findOne({
            id,
            status: 'all'
        }, testUtils.context.internal);
        assert.equal(initialModel.get('published_by'), null);

        const publishedRes = await request
            .put(localUtils.API.getApiQuery('posts/' + id + '/?newsletter=' + newsletterSlug + '&email_segment=status%3Afree'))
            .set('Origin', config.get('url'))
            .send({posts: [updatedPost]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        const publishedPost = publishedRes.body.posts[0];

        assert.equal(publishedPost.newsletter.id, newsletterId);
        assert.equal(publishedPost.email_segment, 'status:free');
        assert.equal(publishedPost.status, 'sent');
        assert.equal(publishedPost.newsletter_id, undefined);

        let model = await models.Post.findOne({
            id,
            status: 'all'
        }, testUtils.context.internal);

        assert.equal(model.get('status'), 'sent');
        assert.equal(model.get('newsletter_id'), newsletterId);
        assert.equal(model.get('email_recipient_filter'), 'status:free');
        assertExists(model.get('published_by'));

        // We should have an email
        const email = await models.Email.findOne({
            post_id: id
        }, testUtils.context.internal);

        assert.equal(email.get('newsletter_id'), newsletterId);
        assert.equal(email.get('recipient_filter'), 'status:free');
        assert(['pending', 'submitted', 'submitting'].includes(email.get('status')));
    });

    it('Can publish a scheduled post', async function () {
        const newsletterId = testUtils.DataGenerator.Content.newsletters[1].id;
        const newsletterSlug = testUtils.DataGenerator.Content.newsletters[1].slug;

        const post = {
            title: 'My scheduled post',
            status: 'draft',
            feature_image_alt: 'Testing newsletter_id in scheduled posts',
            feature_image_caption: 'Testing <b>feature image caption</b>',
            mobiledoc: testUtils.DataGenerator.markdownToMobiledoc('my post'),
            created_at: moment().subtract(2, 'days').toDate(),
            updated_at: moment().subtract(2, 'days').toDate()
        };

        const res = await request.post(localUtils.API.getApiQuery('posts'))
            .set('Origin', config.get('url'))
            .send({posts: [post]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);

        const id = res.body.posts[0].id;

        const updatedPost = res.body.posts[0];

        updatedPost.status = 'scheduled';
        updatedPost.published_at = moment().add(2, 'days').toDate();

        const scheduledRes = await request
            .put(localUtils.API.getApiQuery('posts/' + id + '/?newsletter=' + newsletterSlug))
            .set('Origin', config.get('url'))
            .send({posts: [updatedPost]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        const scheduledPost = scheduledRes.body.posts[0];

        assert.equal(scheduledPost.newsletter.id, newsletterId);
        assert.equal(scheduledPost.email_segment, 'all');
        assert.equal(scheduledPost.newsletter_id, undefined);

        let model = await models.Post.findOne({
            id,
            status: 'scheduled'
        }, testUtils.context.internal);

        assert.equal(model.get('newsletter_id'), newsletterId);
        assert.equal(model.get('email_recipient_filter'), 'all');
        assert.equal(model.get('published_by'), null);

        // We should not have an email
        let email = await models.Email.findOne({
            post_id: id
        }, testUtils.context.internal);

        assert.equal(email, null);

        // Publish now, without passing the newsletter_id or other options again!
        scheduledPost.status = 'published';
        scheduledPost.published_at = moment().toDate();

        const publishedRes = await request
            .put(localUtils.API.getApiQuery('posts/' + id + '/'))
            .set('Origin', config.get('url'))
            .send({posts: [scheduledPost]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        const publishedPost = publishedRes.body.posts[0];

        model = await models.Post.findOne({
            id
        }, testUtils.context.internal);

        assert.equal(model.get('newsletter_id'), newsletterId);
        assert.equal(model.get('email_recipient_filter'), 'all');
        assertExists(model.get('published_by'));

        assert.equal(publishedPost.newsletter.id, newsletterId);
        assert.equal(publishedPost.newsletter_id, undefined);

        // Check email is sent to the correct newsletter
        email = await models.Email.findOne({
            post_id: id
        }, testUtils.context.internal);

        assert.equal(email.get('newsletter_id'), newsletterId);
        assert.equal(email.get('recipient_filter'), 'all');
        assert(['pending', 'submitted', 'submitting'].includes(email.get('status')));
    });

    it('Can publish a scheduled post with custom email segment', async function () {
        const newsletterId = testUtils.DataGenerator.Content.newsletters[1].id;
        const newsletterSlug = testUtils.DataGenerator.Content.newsletters[1].slug;

        const post = {
            title: 'My scheduled post 2',
            status: 'draft',
            feature_image_alt: 'Testing newsletter_id in scheduled posts',
            feature_image_caption: 'Testing <b>feature image caption</b>',
            mobiledoc: testUtils.DataGenerator.markdownToMobiledoc('my post'),
            created_at: moment().subtract(2, 'days').toDate(),
            updated_at: moment().subtract(2, 'days').toDate()
        };

        const res = await request.post(localUtils.API.getApiQuery('posts'))
            .set('Origin', config.get('url'))
            .send({posts: [post]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);

        const id = res.body.posts[0].id;

        const updatedPost = res.body.posts[0];

        updatedPost.status = 'scheduled';
        updatedPost.published_at = moment().add(2, 'days').toDate();

        const scheduledRes = await request
            .put(localUtils.API.getApiQuery('posts/' + id + '/?newsletter=' + newsletterSlug + '&email_segment=status:free'))
            .set('Origin', config.get('url'))
            .send({posts: [updatedPost]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        const scheduledPost = scheduledRes.body.posts[0];

        assert.equal(scheduledPost.newsletter.id, newsletterId);
        assert.equal(scheduledPost.email_segment, 'status:free');
        assert.equal(scheduledPost.newsletter_id, undefined);

        let model = await models.Post.findOne({
            id,
            status: 'scheduled'
        }, testUtils.context.internal);

        assert.equal(model.get('newsletter_id'), newsletterId);
        assert.equal(model.get('email_recipient_filter'), 'status:free');

        // We should not have an email
        let email = await models.Email.findOne({
            post_id: id
        }, testUtils.context.internal);

        assert.equal(email, null);

        // Publish now, without passing the newsletter_id or other options again!
        scheduledPost.status = 'published';
        scheduledPost.published_at = moment().toDate();

        const publishedRes = await request
            .put(localUtils.API.getApiQuery('posts/' + id + '/'))
            .set('Origin', config.get('url'))
            .send({posts: [scheduledPost]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        const publishedPost = publishedRes.body.posts[0];

        model = await models.Post.findOne({
            id
        }, testUtils.context.internal);

        assert.equal(model.get('newsletter_id'), newsletterId);
        assert.equal(model.get('email_recipient_filter'), 'status:free');

        assert.equal(publishedPost.newsletter.id, newsletterId);
        assert.equal(publishedPost.newsletter_id, undefined);

        // Check email is sent to the correct newsletter
        email = await models.Email.findOne({
            post_id: id
        }, testUtils.context.internal);

        assert.equal(email.get('newsletter_id'), newsletterId);
        assert.equal(email.get('recipient_filter'), 'status:free');
        assert(['pending', 'submitted', 'submitting'].includes(email.get('status')));
    });

    it('Can publish a scheduled post without newsletter', async function () {
        const post = {
            title: 'My scheduled post 3',
            status: 'draft',
            feature_image_alt: 'Testing no newsletter in scheduled posts',
            feature_image_caption: 'Testing <b>feature image caption</b>',
            mobiledoc: testUtils.DataGenerator.markdownToMobiledoc('my post'),
            created_at: moment().subtract(2, 'days').toDate(),
            updated_at: moment().subtract(2, 'days').toDate()
        };

        const res = await request.post(localUtils.API.getApiQuery('posts'))
            .set('Origin', config.get('url'))
            .send({posts: [post]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);

        const id = res.body.posts[0].id;

        const updatedPost = res.body.posts[0];

        updatedPost.status = 'scheduled';
        updatedPost.published_at = moment().add(2, 'days').toDate();

        const scheduledRes = await request
            // We also test whether email_segment is ignored if no newsletter is sent
            .put(localUtils.API.getApiQuery('posts/' + id + '/?email_segment=status:-free'))
            .set('Origin', config.get('url'))
            .send({posts: [updatedPost]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        const scheduledPost = scheduledRes.body.posts[0];

        assert.equal(scheduledPost.newsletter, null);
        assert.equal(scheduledPost.email_segment, 'all'); // should be igored
        assert.equal(scheduledPost.newsletter_id, undefined);

        let model = await models.Post.findOne({
            id,
            status: 'scheduled'
        }, testUtils.context.internal);

        assert.equal(model.get('newsletter_id'), null);
        assert.equal(model.get('email_recipient_filter'), 'all');

        // We should not have an email
        let email = await models.Email.findOne({
            post_id: id
        }, testUtils.context.internal);

        assert.equal(email, null);

        // Publish now, without passing the newsletter_id or other options again!
        scheduledPost.status = 'published';
        scheduledPost.published_at = moment().toDate();

        const publishedRes = await request
            .put(localUtils.API.getApiQuery('posts/' + id + '/'))
            .set('Origin', config.get('url'))
            .send({posts: [scheduledPost]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        const publishedPost = publishedRes.body.posts[0];

        model = await models.Post.findOne({
            id
        }, testUtils.context.internal);

        assert.equal(model.get('newsletter_id'), null);
        assert.equal(model.get('email_recipient_filter'), 'all');

        assert.equal(publishedPost.newsletter, null);
        assert.equal(publishedPost.newsletter_id, undefined);

        // Check email is sent to the correct newsletter
        email = await models.Email.findOne({
            post_id: id
        }, testUtils.context.internal);

        assert.equal(email, null);
    });

    it('Can publish a scheduled email only post', async function () {
        const newsletterId = testUtils.DataGenerator.Content.newsletters[1].id;
        const newsletterSlug = testUtils.DataGenerator.Content.newsletters[1].slug;

        const post = {
            title: 'My scheduled email only post',
            status: 'draft',
            feature_image_alt: 'Testing newsletter in scheduled posts',
            feature_image_caption: 'Testing <b>feature image caption</b>',
            mobiledoc: testUtils.DataGenerator.markdownToMobiledoc('my post'),
            created_at: moment().subtract(2, 'days').toDate(),
            updated_at: moment().subtract(2, 'days').toDate()
        };

        const res = await request.post(localUtils.API.getApiQuery('posts'))
            .set('Origin', config.get('url'))
            .send({posts: [post]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);

        const id = res.body.posts[0].id;

        const updatedPost = res.body.posts[0];

        updatedPost.status = 'scheduled';
        updatedPost.email_only = true;
        updatedPost.published_at = moment().add(2, 'days').toDate();

        const scheduledRes = await request
            .put(localUtils.API.getApiQuery('posts/' + id + '/?newsletter=' + newsletterSlug))
            .set('Origin', config.get('url'))
            .send({posts: [updatedPost]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        const scheduledPost = scheduledRes.body.posts[0];

        assert.equal(scheduledPost.newsletter.id, newsletterId);
        assert.equal(scheduledPost.email_segment, 'all');
        assert.equal(scheduledPost.status, 'scheduled');
        assert.equal(scheduledPost.email_only, true);
        assert.equal(scheduledPost.newsletter_id, undefined);

        let model = await models.Post.findOne({
            id,
            status: 'scheduled'
        }, testUtils.context.internal);

        assert.equal(model.get('newsletter_id'), newsletterId);
        assert.equal(model.get('status'), 'scheduled');
        assert.equal(model.get('email_recipient_filter'), 'all');

        // We should not have an email
        let email = await models.Email.findOne({
            post_id: id
        }, testUtils.context.internal);

        assert.equal(email, null);

        // Publish now, without passing the newsletter_id or other options again!
        scheduledPost.status = 'published';

        const publishedRes = await request
            .put(localUtils.API.getApiQuery('posts/' + id + '/'))
            .set('Origin', config.get('url'))
            .send({posts: [scheduledPost]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        const publishedPost = publishedRes.body.posts[0];

        model = await models.Post.findOne({
            id,
            status: 'all'
        }, testUtils.context.internal);

        assert.equal(model.get('newsletter_id'), newsletterId);
        assert.equal(model.get('status'), 'sent');
        assert.equal(model.get('email_recipient_filter'), 'all');

        assert.equal(publishedPost.newsletter.id, newsletterId);
        assert.equal(publishedPost.newsletter_id, undefined);

        // Check email is sent to the correct newsletter
        email = await models.Email.findOne({
            post_id: id
        }, testUtils.context.internal);

        assert.equal(email.get('newsletter_id'), newsletterId);
        assert.equal(email.get('recipient_filter'), 'all');
        assert(['pending', 'submitted', 'submitting'].includes(email.get('status')));
    });

    it('Can\'t change the newsletter once it has been sent', async function () {
        // Note: this test only works if there are members subscribed to the initial newsletter
        // (so it won't get reset when changing the post status to draft again)

        let model;
        const post = {
            title: 'My post without newsletter_id',
            status: 'draft',
            feature_image_alt: 'Testing newsletter_id',
            feature_image_caption: 'Testing <b>feature image caption</b>',
            mobiledoc: testUtils.DataGenerator.markdownToMobiledoc('my post'),
            created_at: moment().subtract(2, 'days').toDate(),
            updated_at: moment().subtract(2, 'days').toDate()
        };

        const res = await request.post(localUtils.API.getApiQuery('posts'))
            .set('Origin', config.get('url'))
            .send({posts: [post]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);

        const id = res.body.posts[0].id;
        const newsletterId = testUtils.DataGenerator.Content.newsletters[0].id;
        const newsletterSlug = testUtils.DataGenerator.Content.newsletters[0].slug;
        const newsletterSlug2 = testUtils.DataGenerator.Content.newsletters[1].slug;

        const updatedPost = {
            status: 'published',
            updated_at: res.body.posts[0].updated_at
        };

        const res2 = await request
            .put(localUtils.API.getApiQuery('posts/' + id + '/?email_segment=status:-free&newsletter=' + newsletterSlug))
            .set('Origin', config.get('url'))
            .send({posts: [updatedPost]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        // Check newsletter relation is loaded in response
        assert.equal(res2.body.posts[0].newsletter.id, newsletterId);
        assert.equal(res2.body.posts[0].email_segment, 'status:-free');

        assert.equal(res2.body.posts[0].newsletter_id, undefined);

        model = await models.Post.findOne({
            id: id,
            status: 'published'
        }, testUtils.context.internal);
        assert.equal(model.get('newsletter_id'), newsletterId);
        assert.equal(model.get('email_recipient_filter'), 'status:-free');

        // Check email is sent to the correct newsletter
        let email = await models.Email.findOne({
            post_id: id
        }, testUtils.context.internal);

        assert.equal(email.get('newsletter_id'), newsletterId);
        assert.equal(email.get('recipient_filter'), 'status:-free');
        assert(['pending', 'submitted', 'submitting'].includes(email.get('status')));

        const unpublished = {
            status: 'draft',
            updated_at: res2.body.posts[0].updated_at
        };

        const res3 = await request
            .put(localUtils.API.getApiQuery('posts/' + id + '/'))
            .set('Origin', config.get('url'))
            .send({posts: [unpublished]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        // Check newsletter relation is loaded in response
        // We should keep it, because we already sent an email
        assert.equal(res3.body.posts[0].newsletter.id, newsletterId);
        assert.equal(res2.body.posts[0].email_segment, 'status:-free');
        assert.equal(res3.body.posts[0].newsletter_id, undefined);

        model = await models.Post.findOne({
            id: id,
            status: 'draft'
        }, testUtils.context.internal);

        assert.equal(model.get('newsletter_id'), newsletterId);

        // Check email
        // Note: we only create an email if we have members susbcribed to the newsletter
        email = await models.Email.findOne({
            post_id: id
        }, testUtils.context.internal);

        assertExists(email);
        assert.equal(email.get('newsletter_id'), newsletterId);

        const republished = {
            status: 'published',
            updated_at: res3.body.posts[0].updated_at
        };

        const res4 = await request
            .put(localUtils.API.getApiQuery('posts/' + id + '/?newsletter=' + newsletterSlug2))
            .set('Origin', config.get('url'))
            .send({posts: [republished]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        // Check newsletter relation is loaded in response
        // + did update the newsletter id
        assert.equal(res4.body.posts[0].newsletter.id, newsletterId);
        assert.equal(res4.body.posts[0].email_segment, 'status:-free');
        assert.equal(res4.body.posts[0].newsletter_id, undefined);

        model = await models.Post.findOne({
            id: id,
            status: 'published'
        }, testUtils.context.internal);
        assert.equal(model.get('newsletter_id'), newsletterId);

        // Should not change if status remains published
        const res5 = await request
            .put(localUtils.API.getApiQuery('posts/' + id + '/?newsletter=' + newsletterSlug))
            .set('Origin', config.get('url'))
            .send({posts: [republished]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        // Check newsletter relation is loaded in response
        // + did not update the newsletter id
        assert.equal(res5.body.posts[0].newsletter.id, newsletterId);
        assert.equal(res5.body.posts[0].email_segment, 'status:-free');
        assert.equal(res5.body.posts[0].newsletter_id, undefined);

        model = await models.Post.findOne({
            id: id,
            status: 'published'
        }, testUtils.context.internal);

        // Test if the newsletter_id option was ignored
        assert.equal(model.get('newsletter_id'), newsletterId);
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

    describe('As Author', function () {
        before(async function () {
            const user = await testUtils.createUser({
                user: testUtils.DataGenerator.forKnex.createUser({
                    email: 'test+author@ghost.org'
                }),
                role: testUtils.DataGenerator.Content.roles[2].name
            });

            request.user = user;
            await localUtils.doAuth(request);
        });

        it('Can publish a post and send as email', async function () {
            const newsletterId = testUtils.DataGenerator.Content.newsletters[1].id;
            const newsletterSlug = testUtils.DataGenerator.Content.newsletters[1].slug;

            const post = {
                title: 'Author newsletter_id post',
                status: 'draft',
                authors: [{id: request.user.id}],
                feature_image_alt: 'Testing newsletter_id',
                feature_image_caption: 'Testing <b>feature image caption</b>',
                mobiledoc: testUtils.DataGenerator.markdownToMobiledoc('my post'),
                created_at: moment().subtract(2, 'days').toDate(),
                updated_at: moment().subtract(2, 'days').toDate()
            };

            const res = await request.post(localUtils.API.getApiQuery('posts'))
                .set('Origin', config.get('url'))
                .send({posts: [post]})
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(201);

            // Check newsletter relation is loaded, but null in response.
            assert.equal(res.body.posts[0].newsletter, null);
            assert.equal(res.body.posts[0].newsletter_id, undefined);

            const id = res.body.posts[0].id;

            const updatedPost = res.body.posts[0];

            updatedPost.status = 'published';

            const finalPost = await request
                .put(localUtils.API.getApiQuery('posts/' + id + '/?newsletter=' + newsletterSlug))
                .set('Origin', config.get('url'))
                .send({posts: [updatedPost]})
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            // Check newsletter relation is loaded in response
            assert.equal(finalPost.body.posts[0].newsletter.id, newsletterId);
            assert.equal(finalPost.body.posts[0].email_segment, 'all');
            assert.equal(finalPost.body.posts[0].newsletter_id, undefined);

            const model = await models.Post.findOne({
                id
            }, testUtils.context.internal);

            assert.equal(model.get('newsletter_id'), newsletterId);

            // Check email
            // Note: we only create an email if we have members susbcribed to the newsletter
            const email = await models.Email.findOne({
                post_id: id
            }, testUtils.context.internal);

            assertExists(email);
            assert.equal(email.get('newsletter_id'), newsletterId);
            assert(['pending', 'submitted', 'submitting'].includes(email.get('status')));
        });

        it('Can publish an email_only post', async function () {
            const newsletterId = testUtils.DataGenerator.Content.newsletters[1].id;
            const newsletterSlug = testUtils.DataGenerator.Content.newsletters[1].slug;

            const post = {
                title: 'My post',
                status: 'draft',
                authors: [{id: request.user.id}],
                feature_image_alt: 'Testing newsletter in posts',
                feature_image_caption: 'Testing <b>feature image caption</b>',
                mobiledoc: testUtils.DataGenerator.markdownToMobiledoc('my post'),
                created_at: moment().subtract(2, 'days').toDate(),
                updated_at: moment().subtract(2, 'days').toDate()
            };

            const res = await request.post(localUtils.API.getApiQuery('posts'))
                .set('Origin', config.get('url'))
                .send({posts: [post]})
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(201);

            const id = res.body.posts[0].id;

            const updatedPost = res.body.posts[0];

            updatedPost.status = 'published';
            //updatedPost.published_at = moment().add(2, 'days').toDate();
            updatedPost.email_only = true;

            const publishedRes = await request
                .put(localUtils.API.getApiQuery('posts/' + id + '/?newsletter=' + newsletterSlug))
                .set('Origin', config.get('url'))
                .send({posts: [updatedPost]})
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            const publishedPost = publishedRes.body.posts[0];

            assert.equal(publishedPost.newsletter.id, newsletterId);
            assert.equal(publishedPost.email_segment, 'all');
            assert.equal(publishedPost.status, 'sent');
            assert.equal(publishedPost.newsletter_id, undefined);

            let model = await models.Post.findOne({
                id,
                status: 'all'
            }, testUtils.context.internal);

            assert.equal(model.get('status'), 'sent');
            assert.equal(model.get('newsletter_id'), newsletterId);
            assert.equal(model.get('email_recipient_filter'), 'all');

            // We should have an email
            const email = await models.Email.findOne({
                post_id: id
            }, testUtils.context.internal);

            assert.equal(email.get('newsletter_id'), newsletterId);
            assert.equal(email.get('recipient_filter'), 'all');
            assert(['pending', 'submitted', 'submitting'].includes(email.get('status')));
        });
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
            await localUtils.doAuth(request, 'users:extra', 'posts', 'emails', 'newsletters');

            const draftPostResponse = await request
                .get(localUtils.API.getApiQuery(`posts/${testUtils.DataGenerator.Content.posts[3].id}/`))
                .set('Origin', config.get('url'))
                .expect(200);

            const draftPost = draftPostResponse.body.posts[0];

            const newsletterSlug = testUtils.DataGenerator.Content.newsletters[1].slug;

            const loggingStub = sinon.stub(logging, 'error');

            const response = await request
                .put(localUtils.API.getApiQuery(`posts/${draftPost.id}/?newsletter=${newsletterSlug}`))
                .set('Origin', config.get('url'))
                .send({posts: [{
                    status: 'published',
                    updated_at: draftPost.updated_at
                }]})
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(403);

            assert.equal(response.body.errors[0].type, 'HostLimitError');
            assert.equal(response.body.errors[0].context, 'No email shalt be sent');
            sinon.assert.calledOnce(loggingStub);
        });
    });
});
