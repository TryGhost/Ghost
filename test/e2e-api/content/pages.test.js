const url = require('url');
const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../utils');
const configUtils = require('../../utils/configUtils');
const config = require('../../../core/shared/config');
const localUtils = require('./utils');

describe('Pages Content API', function () {
    let request;

    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await testUtils.initFixtures('users:no-owner', 'user:inactive', 'posts', 'tags:extra', 'api_keys');
    });

    afterEach(function () {
        configUtils.restore();
    });

    it('Can request pages', async function () {
        const key = localUtils.getValidKey();
        const res = await request.get(localUtils.API.getApiQuery(`pages/?key=${key}`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        res.headers.vary.should.eql('Accept-Encoding');
        should.exist(res.headers['access-control-allow-origin']);
        should.not.exist(res.headers['x-cache-invalidate']);

        const jsonResponse = res.body;
        should.exist(jsonResponse.pages);
        should.exist(jsonResponse.meta);
        jsonResponse.pages.should.have.length(5);

        res.body.pages[0].slug.should.eql('about');

        const urlParts = url.parse(res.body.pages[0].url);
        should.exist(urlParts.protocol);
        should.exist(urlParts.host);
    });

    it('Can request page', async function () {
        const key = localUtils.getValidKey();
        const res = await request.get(localUtils.API.getApiQuery(`pages/${testUtils.DataGenerator.Content.posts[5].id}/?key=${key}`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        res.headers.vary.should.eql('Accept-Encoding');
        should.exist(res.headers['access-control-allow-origin']);
        should.not.exist(res.headers['x-cache-invalidate']);

        const jsonResponse = res.body;
        should.exist(jsonResponse.pages);
        jsonResponse.pages.should.have.length(1);

        res.body.pages[0].slug.should.eql(testUtils.DataGenerator.Content.posts[5].slug);

        const urlParts = url.parse(res.body.pages[0].url);
        should.exist(urlParts.protocol);
        should.exist(urlParts.host);
    });
});
