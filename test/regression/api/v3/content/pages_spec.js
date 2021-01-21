const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../../../utils');
const localUtils = require('./utils');
const configUtils = require('../../../../utils/configUtils');
const config = require('../../../../../core/shared/config');

const ghost = testUtils.startGhost;
let request;

describe('api/v3/content/pages', function () {
    const key = localUtils.getValidKey();

    before(function () {
        return ghost()
            .then(function () {
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return testUtils.initFixtures('users:no-owner', 'user:inactive', 'posts', 'tags:extra', 'api_keys');
            });
    });

    afterEach(function () {
        configUtils.restore();
    });

    it('Can browse pages with page:false', function () {
        return request.get(localUtils.API.getApiQuery(`pages/?key=${key}&filter=page:false`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                res.headers.vary.should.eql('Accept-Encoding');
                should.exist(res.headers['access-control-allow-origin']);
                should.not.exist(res.headers['x-cache-invalidate']);

                const jsonResponse = res.body;
                should.exist(jsonResponse.pages);
                should.exist(jsonResponse.meta);

                jsonResponse.pages.should.have.length(0);
            });
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
