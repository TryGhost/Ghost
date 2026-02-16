const assert = require('node:assert/strict');
const {assertExists} = require('../../utils/assertions');
const should = require('should');
const supertest = require('supertest');
const _ = require('lodash');
const url = require('url');
const configUtils = require('../../utils/config-utils');
const config = require('../../../core/shared/config');
const testUtils = require('../../utils');
const dbUtils = require('../../utils/db-utils');
const localUtils = require('./utils');

describe('Tags Content API', function () {
    let request;

    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await testUtils.initFixtures('users', 'user:inactive', 'posts', 'tags:extra', 'api_keys');
    });

    afterEach(async function () {
        await configUtils.restore();
    });

    const validKey = localUtils.getValidKey();

    it('Can request tags', async function () {
        const res = await request.get(localUtils.API.getApiQuery(`tags/?key=${validKey}`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.public)
            .expect(200);

        assert.equal(res.headers['x-cache-invalidate'], undefined);
        const jsonResponse = res.body;
        assertExists(jsonResponse.tags);
        localUtils.API.checkResponse(jsonResponse, 'tags');
        assert.equal(jsonResponse.tags.length, 5);
        localUtils.API.checkResponse(jsonResponse.tags[0], 'tag', ['url']);
        localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');

        // Default order 'name asc' check
        // the ordering difference is described in https://github.com/TryGhost/Ghost/issues/6104
        // this condition should be removed once issue mentioned above ^ is resolved
        if (dbUtils.isMySQL()) {
            assert.equal(jsonResponse.tags[0].name, 'bacon');
            assert.equal(jsonResponse.tags[3].name, 'kitchen sink');
        } else {
            assert.equal(jsonResponse.tags[0].name, 'Getting Started');
            assert.equal(jsonResponse.tags[4].name, 'kitchen sink');
        }

        assertExists(res.body.tags[0].url);
        assertExists(url.parse(res.body.tags[0].url).protocol);
        assertExists(url.parse(res.body.tags[0].url).host);
    });

    it('Can request tags with limit=all', async function () {
        const res = await request.get(localUtils.API.getApiQuery(`tags/?limit=all&key=${validKey}`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.public)
            .expect(200);

        assert.equal(res.headers['x-cache-invalidate'], undefined);
        const jsonResponse = res.body;
        assertExists(jsonResponse.tags);
        localUtils.API.checkResponse(jsonResponse, 'tags');
        assert.equal(jsonResponse.tags.length, 5);
        localUtils.API.checkResponse(jsonResponse.tags[0], 'tag', ['url']);
        localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
    });

    it('Can limit tags to receive', async function () {
        const res = await request.get(localUtils.API.getApiQuery(`tags/?limit=3&key=${validKey}`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.public)
            .expect(200);

        assert.equal(res.headers['x-cache-invalidate'], undefined);
        const jsonResponse = res.body;
        assertExists(jsonResponse.tags);
        localUtils.API.checkResponse(jsonResponse, 'tags');
        assert.equal(jsonResponse.tags.length, 3);
        localUtils.API.checkResponse(jsonResponse.tags[0], 'tag', ['url']);
        localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
    });

    it('Can include post count', async function () {
        const res = await request.get(localUtils.API.getApiQuery(`tags/?key=${validKey}&include=count.posts`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.public)
            .expect(200);

        const jsonResponse = res.body;

        assertExists(jsonResponse.tags);
        jsonResponse.tags.should.be.an.Array().with.lengthOf(5);

        // Each tag should have the correct count
        assert.equal(_.find(jsonResponse.tags, {name: 'Getting Started'}).count.posts, 7);
        assert.equal(_.find(jsonResponse.tags, {name: 'kitchen sink'}).count.posts, 2);
        assert.equal(_.find(jsonResponse.tags, {name: 'bacon'}).count.posts, 2);
        assert.equal(_.find(jsonResponse.tags, {name: 'chorizo'}).count.posts, 1);
    });

    it('Can use multiple fields and have valid url fields', async function () {
        const res = await request.get(localUtils.API.getApiQuery(`tags/?key=${validKey}&fields=url,name`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.public)
            .expect(200);

        const jsonResponse = res.body;

        assert(jsonResponse.tags);

        const getTag = name => jsonResponse.tags.find(tag => tag.name === name);

        assert(getTag('Getting Started').url.endsWith('/tag/getting-started/'));
        assert(getTag('kitchen sink').url.endsWith('/tag/kitchen-sink/'));
        assert(getTag('bacon').url.endsWith('/tag/bacon/'));
        assert(getTag('chorizo').url.endsWith('/tag/chorizo/'));
    });

    it('Can request tags with slug filter ordering', async function () {
        const res = await request.get(localUtils.API.getApiQuery(`tags/?key=${validKey}&filter=slug:[bacon,chorizo]`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.public)
            .expect(200);

        const jsonResponse = res.body;
        assertExists(jsonResponse.tags);
        // Should return tags matching the slug filter, ordered by slug position
        assert.equal(jsonResponse.tags[0].slug, 'bacon');
        assert.equal(jsonResponse.tags[1].slug, 'chorizo');
    });

    it('Can use single url field and have valid url fields', async function () {
        const res = await request.get(localUtils.API.getApiQuery(`tags/?key=${validKey}&fields=url`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.public)
            .expect(200);

        const jsonResponse = res.body;

        assert(jsonResponse.tags);

        const getTag = path => jsonResponse.tags.find(tag => tag.url.endsWith(path));

        assert(getTag('/tag/getting-started/'));
        assert(getTag('/tag/kitchen-sink/'));
        assert(getTag('/tag/bacon/'));
        assert(getTag('/tag/chorizo/'));
    });
});
