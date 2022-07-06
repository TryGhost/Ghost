const should = require('should');
const supertest = require('supertest');
const _ = require('lodash');
const url = require('url');
const configUtils = require('../../utils/configUtils');
const config = require('../../../core/shared/config');
const testUtils = require('../../utils');
const dbUtils = require('../../utils/db-utils');
const localUtils = require('./utils');

describe('Tags Content API', function () {
    let request;

    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await testUtils.initFixtures('users:no-owner', 'user:inactive', 'posts', 'tags:extra', 'api_keys');
    });

    afterEach(function () {
        configUtils.restore();
    });

    const validKey = localUtils.getValidKey();

    it('Can request tags', async function () {
        const res = await request.get(localUtils.API.getApiQuery(`tags/?key=${validKey}`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        should.exist(jsonResponse.tags);
        localUtils.API.checkResponse(jsonResponse, 'tags');
        jsonResponse.tags.should.have.length(4);
        localUtils.API.checkResponse(jsonResponse.tags[0], 'tag', ['url']);
        localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');

        // Default order 'name asc' check
        // the ordering difference is described in https://github.com/TryGhost/Ghost/issues/6104
        // this condition should be removed once issue mentioned above ^ is resolved
        if (dbUtils.isMySQL()) {
            jsonResponse.tags[0].name.should.eql('bacon');
            jsonResponse.tags[3].name.should.eql('kitchen sink');
        } else {
            jsonResponse.tags[0].name.should.eql('Getting Started');
            jsonResponse.tags[3].name.should.eql('kitchen sink');
        }

        should.exist(res.body.tags[0].url);
        should.exist(url.parse(res.body.tags[0].url).protocol);
        should.exist(url.parse(res.body.tags[0].url).host);
    });

    it('Can request tags with limit=all', async function () {
        const res = await request.get(localUtils.API.getApiQuery(`tags/?limit=all&key=${validKey}`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        should.exist(jsonResponse.tags);
        localUtils.API.checkResponse(jsonResponse, 'tags');
        jsonResponse.tags.should.have.length(4);
        localUtils.API.checkResponse(jsonResponse.tags[0], 'tag', ['url']);
        localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
    });

    it('Can limit tags to receive', async function () {
        const res = await request.get(localUtils.API.getApiQuery(`tags/?limit=3&key=${validKey}`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        should.exist(jsonResponse.tags);
        localUtils.API.checkResponse(jsonResponse, 'tags');
        jsonResponse.tags.should.have.length(3);
        localUtils.API.checkResponse(jsonResponse.tags[0], 'tag', ['url']);
        localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
    });

    it('Can include post count', async function () {
        const res = await request.get(localUtils.API.getApiQuery(`tags/?key=${validKey}&include=count.posts`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        const jsonResponse = res.body;

        should.exist(jsonResponse.tags);
        jsonResponse.tags.should.be.an.Array().with.lengthOf(4);

        // Each tag should have the correct count
        _.find(jsonResponse.tags, {name: 'Getting Started'}).count.posts.should.eql(7);
        _.find(jsonResponse.tags, {name: 'kitchen sink'}).count.posts.should.eql(2);
        _.find(jsonResponse.tags, {name: 'bacon'}).count.posts.should.eql(2);
        _.find(jsonResponse.tags, {name: 'chorizo'}).count.posts.should.eql(1);
    });
});
