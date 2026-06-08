const assert = require('node:assert/strict');
const {assertExists} = require('../../utils/assertions');
const sinon = require('sinon');
const supertest = require('supertest');
const testUtils = require('../../utils');
const config = require('../../../core/shared/config');
const localUtils = require('./utils');
const urlUtilsHelper = require('../../utils/url-utils');

describe('Tag API', function () {
    let request;

    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request, 'posts');
    });

    it('Can request all tags', async function () {
        const res = await request
            .get(localUtils.API.getApiQuery('tags/?include=count.posts&order=name%20DESC'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        assert.equal(res.headers['x-cache-invalidate'], undefined);
        const jsonResponse = res.body;
        assertExists(jsonResponse);
        assertExists(jsonResponse.tags);
        assert.equal(jsonResponse.tags.length, 7);
        localUtils.API.checkResponse(jsonResponse.tags[0], 'tag', ['count', 'url']);

        assert.equal(testUtils.API.isISO8601(jsonResponse.tags[0].created_at), true);
        assert.equal(typeof jsonResponse.tags[0].created_at, 'string');

        assert.equal(jsonResponse.meta.pagination.page, 1);
        assert.equal(jsonResponse.meta.pagination.limit, 15);
        assert.equal(jsonResponse.meta.pagination.pages, 1);
        assert.equal(jsonResponse.meta.pagination.total, 7);
        assert.equal(jsonResponse.meta.pagination.next, null);
        assert.equal(jsonResponse.meta.pagination.prev, null);

        // returns 404 because this tag has no published posts
        assert.equal(new URL(jsonResponse.tags[0].url).pathname, '/404/');

        // Find specific tags by slug to verify URL generation
        const kitchenSinkTag = jsonResponse.tags.find(t => t.slug === 'kitchen-sink');

        // kitchen-sink has published posts, so it should have a valid URL
        assert.equal(new URL(kitchenSinkTag.url).pathname, '/tag/kitchen-sink/');
        assertExists(kitchenSinkTag.count.posts);
        assert.equal(kitchenSinkTag.count.posts, 2);
    });

    it('Can paginate tags', async function () {
        const res = await request
            .get(localUtils.API.getApiQuery('tags/?page=2'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        assert.equal(res.body.meta.pagination.page, 2);
    });

    it('Can read a tag', async function () {
        const res = await request
            .get(localUtils.API.getApiQuery(`tags/${testUtils.getExistingData().tags[0].id}/?include=count.posts`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        assert.equal(res.headers['x-cache-invalidate'], undefined);
        const jsonResponse = res.body;
        assertExists(jsonResponse);
        assertExists(jsonResponse.tags);
        assert.equal(jsonResponse.tags.length, 1);
        localUtils.API.checkResponse(jsonResponse.tags[0], 'tag', ['count', 'url']);
        assertExists(jsonResponse.tags[0].count.posts);
        assert.equal(jsonResponse.tags[0].count.posts, 7);

        assert.equal(new URL(jsonResponse.tags[0].url).pathname, '/tag/getting-started/');
    });

    it('Can add a tag', async function () {
        const tag = testUtils.DataGenerator.forKnex.createTag();

        const res = await request
            .post(localUtils.API.getApiQuery('tags/'))
            .set('Origin', config.get('url'))
            .send({
                tags: [tag]
            })
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);

        assertExists(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        assertExists(jsonResponse);
        assertExists(jsonResponse.tags);
        assert.equal(jsonResponse.tags.length, 1);

        localUtils.API.checkResponse(jsonResponse.tags[0], 'tag', ['url']);
        assert.equal(testUtils.API.isISO8601(jsonResponse.tags[0].created_at), true);

        assertExists(res.headers.location);
        assert.equal(new URL(res.headers.location).pathname, `/ghost/api/admin/tags/${res.body.tags[0].id}/`);
    });

    it('Can add an internal tag', async function () {
        const tag = testUtils.DataGenerator.forKnex.createTag({
            name: '#test',
            slug: null
        });

        const res = await request
            .post(localUtils.API.getApiQuery('tags/'))
            .set('Origin', config.get('url'))
            .send({
                tags: [tag]
            })
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);

        assertExists(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        assertExists(jsonResponse);
        assert.equal(jsonResponse.tags[0].visibility, 'internal');
        assert.equal(jsonResponse.tags[0].name, '#test');
        assert.equal(jsonResponse.tags[0].slug, 'hash-test');

        assertExists(res.headers.location);
        assert.equal(new URL(res.headers.location).pathname, `/ghost/api/admin/tags/${res.body.tags[0].id}/`);
    });

    it('Can edit a tag', async function () {
        const res = await request
            .put(localUtils.API.getApiQuery(`tags/${testUtils.getExistingData().tags[0].id}`))
            .set('Origin', config.get('url'))
            .send({
                tags: [Object.assign({}, testUtils.getExistingData().tags[0], {description: 'hey ho ab ins klo'})]
            })
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        assertExists(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        assertExists(jsonResponse);
        assertExists(jsonResponse.tags);
        assert.equal(jsonResponse.tags.length, 1);
        localUtils.API.checkResponse(jsonResponse.tags[0], 'tag', ['url']);
        assert.equal(jsonResponse.tags[0].description, 'hey ho ab ins klo');
    });

    it('Can destroy a tag', async function () {
        const res = await request
            .del(localUtils.API.getApiQuery(`tags/${testUtils.getExistingData().tags[0].id}`))
            .set('Origin', config.get('url'))
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(204);

        assertExists(res.headers['x-cache-invalidate']);
        assert.deepEqual(res.body, {});
    });

    it('Can destroy a non-existent tag', async function () {
        const res = await request
            .del(localUtils.API.getApiQuery(`tags/abcd1234abcd1234abcd1234`))
            .set('Origin', config.get('url'))
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(404);

        assert.equal(res.body.errors[0].message, 'Resource not found error, cannot delete tag.');
    });

    describe('URL transformations', function () {
        const siteUrl = config.get('url');

        afterEach(function () {
            sinon.restore();
        });

        it('Can read tag with all image URLs as absolute site URLs', async function () {
            const res = await request
                .get(localUtils.API.getApiQuery('tags/slug/tag-with-images/'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            const tag = res.body.tags[0];

            assert.equal(tag.feature_image, `${siteUrl}/content/images/tag-feature.jpg`);
            assert.equal(tag.og_image, `${siteUrl}/content/images/tag-og.jpg`);
            assert.equal(tag.twitter_image, `${siteUrl}/content/images/tag-twitter.jpg`);
        });

        it('Transforms image URLs to CDN URLs when image CDN is configured', async function () {
            const cdnUrl = 'https://cdn.example.com';
            urlUtilsHelper.stubUrlUtilsWithCdn({
                assetBaseUrls: {media: cdnUrl, image: cdnUrl}
            }, sinon);

            const res = await request
                .get(localUtils.API.getApiQuery('tags/slug/tag-with-images/'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            const tag = res.body.tags[0];

            assert.equal(tag.feature_image, `${cdnUrl}/content/images/tag-feature.jpg`);
            assert.equal(tag.og_image, `${cdnUrl}/content/images/tag-og.jpg`);
            assert.equal(tag.twitter_image, `${cdnUrl}/content/images/tag-twitter.jpg`);
        });
    });
});
