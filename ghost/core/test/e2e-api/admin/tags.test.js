const assert = require('node:assert/strict');
const {assertExists} = require('../../utils/assertions');
const should = require('should');
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
        jsonResponse.tags[0].created_at.should.be.an.instanceof(String);

        jsonResponse.meta.pagination.should.have.property('page', 1);
        jsonResponse.meta.pagination.should.have.property('limit', 15);
        jsonResponse.meta.pagination.should.have.property('pages', 1);
        jsonResponse.meta.pagination.should.have.property('total', 7);
        jsonResponse.meta.pagination.should.have.property('next', null);
        jsonResponse.meta.pagination.should.have.property('prev', null);

        // returns 404 because this tag has no published posts
        jsonResponse.tags[0].url.should.eql(`${config.get('url')}/404/`);

        // Find specific tags by slug to verify URL generation
        const kitchenSinkTag = jsonResponse.tags.find(t => t.slug === 'kitchen-sink');

        // kitchen-sink has published posts, so it should have a valid URL
        kitchenSinkTag.url.should.eql(`${config.get('url')}/tag/kitchen-sink/`);
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

        jsonResponse.tags[0].url.should.eql(`${config.get('url')}/tag/getting-started/`);
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
        res.headers.location.should.equal(`http://127.0.0.1:2369${localUtils.API.getApiQuery('tags/')}${res.body.tags[0].id}/`);
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
        res.headers.location.should.equal(`http://127.0.0.1:2369${localUtils.API.getApiQuery('tags/')}${res.body.tags[0].id}/`);
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
        res.body.should.eql({});
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

            tag.feature_image.should.equal(`${siteUrl}/content/images/tag-feature.jpg`);
            tag.og_image.should.equal(`${siteUrl}/content/images/tag-og.jpg`);
            tag.twitter_image.should.equal(`${siteUrl}/content/images/tag-twitter.jpg`);
        });

        it('Transforms image URLs to absolute site URLs even when CDN is configured', async function () {
            urlUtilsHelper.stubUrlUtilsWithCdn({
                assetBaseUrls: {media: 'https://cdn.example.com', files: 'https://cdn.example.com'}
            }, sinon);

            const res = await request
                .get(localUtils.API.getApiQuery('tags/slug/tag-with-images/'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            const tag = res.body.tags[0];

            tag.feature_image.should.equal(`${siteUrl}/content/images/tag-feature.jpg`);
            tag.og_image.should.equal(`${siteUrl}/content/images/tag-og.jpg`);
            tag.twitter_image.should.equal(`${siteUrl}/content/images/tag-twitter.jpg`);
        });
    });
});
