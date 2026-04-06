const assert = require('node:assert/strict');
const {assertExists} = require('../../../utils/assertions');
const supertest = require('supertest');
const _ = require('lodash');
const localUtils = require('./utils');
const testUtils = require('../../../utils');
const configUtils = require('../../../utils/config-utils');
const config = require('../../../../core/shared/config');

let request;

describe('api/endpoints/content/tags', function () {
    const validKey = localUtils.getValidKey();

    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await testUtils.initFixtures('users', 'user:inactive', 'posts', 'tags:extra', 'api_keys');
    });

    afterEach(async function () {
        await configUtils.restore();
    });

    it('Can read tags with fields', function () {
        return request
            .get(localUtils.API.getApiQuery(`tags/${testUtils.DataGenerator.Content.tags[0].id}/?key=${validKey}&fields=name,slug`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.public)
            .expect(200)
            .then((res) => {
                localUtils.API.checkResponse(res.body.tags[0], 'tag', null, null, ['id', 'name', 'slug']);
            });
    });

    it('Can request all tags with count.posts field', function () {
        return request
            .get(localUtils.API.getApiQuery(`tags/?key=${validKey}&include=count.posts`))
            .set('Origin', testUtils.API.getURL())
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.public)
            .expect(200)
            .then((res) => {
                assert.equal(res.headers['x-cache-invalidate'], undefined);
                const jsonResponse = res.body;
                assertExists(jsonResponse);
                assertExists(jsonResponse.tags);
                assert.equal(jsonResponse.tags.length, 5);
                localUtils.API.checkResponse(jsonResponse.tags[0], 'tag', ['count', 'url']);

                assert.equal(jsonResponse.meta.pagination.page, 1);
                assert.equal(jsonResponse.meta.pagination.limit, 15);
                assert.equal(jsonResponse.meta.pagination.pages, 4);
                assert.equal(jsonResponse.meta.pagination.total, 57);
                assert.equal(jsonResponse.meta.pagination.next, 2);
                assert.equal(jsonResponse.meta.pagination.prev, null);

                assertExists(jsonResponse.tags[0].count.posts);
                // Each tag should have the correct count
                assert.equal(_.find(jsonResponse.tags, {name: 'Getting Started'}).count.posts, 7);
                assert.equal(_.find(jsonResponse.tags, {name: 'kitchen sink'}).count.posts, 2);
                assert.equal(_.find(jsonResponse.tags, {name: 'bacon'}).count.posts, 2);
                assert.equal(_.find(jsonResponse.tags, {name: 'chorizo'}).count.posts, 1);
            });
    });

    it('Browse tags with slug filter, should order in slug order', function () {
        return request.get(localUtils.API.getApiQuery(`tags/?key=${validKey}&filter=slug:[kitchen-sink,bacon,chorizo]`))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.public)
            .expect(200)
            .then((res) => {
                const jsonResponse = res.body;

                assert(Array.isArray(jsonResponse.tags));
                assert.equal(jsonResponse.tags.length, 3);
                assert.equal(jsonResponse.tags[0].slug, 'kitchen-sink');
                assert.equal(jsonResponse.tags[1].slug, 'bacon');
                assert.equal(jsonResponse.tags[2].slug, 'chorizo');
            });
    });
});
