const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../../utils');
const localUtils = require('./utils');
const configUtils = require('../../../utils/configUtils');
const config = require('../../../../core/shared/config');

let request;

describe('api/canary/content/pages', function () {
    const key = localUtils.getValidKey();

    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await testUtils.initFixtures('users:no-owner', 'user:inactive', 'posts', 'tags:extra', 'api_keys');
    });

    afterEach(function () {
        configUtils.restore();
    });

    it('Returns a validation error when unsupported "page" filter is used', function () {
        return request.get(localUtils.API.getApiQuery(`pages/?key=${key}&filter=page:false`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(400);
    });

    it('browse pages with slug filter, should order in slug order', function () {
        return request.get(localUtils.API.getApiQuery(`pages/?key=${key}&filter=slug:[static-page-test]`))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                const jsonResponse = res.body;

                jsonResponse.pages.should.be.an.Array().with.lengthOf(1);
                jsonResponse.pages[0].slug.should.equal('static-page-test');
            });
    });

    it('can\'t read post', function () {
        return request
            .get(localUtils.API.getApiQuery(`pages/${testUtils.DataGenerator.Content.posts[0].id}/?key=${key}`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(404);
    });
});
