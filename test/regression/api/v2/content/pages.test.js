const url = require('url');
const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../../../utils');
const localUtils = require('./utils');
const configUtils = require('../../../../utils/configUtils');
const config = require('../../../../../core/shared/config');

let request;

describe('api/v2/content/pages', function () {
    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await testUtils.initFixtures('users:no-owner', 'user:inactive', 'posts', 'tags:extra', 'api_keys');
    });

    afterEach(function () {
        configUtils.restore();
    });

    it('Can request pages', function () {
        const key = localUtils.getValidKey();
        return request.get(localUtils.API.getApiQuery(`pages/?key=${key}`))
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
                jsonResponse.pages.should.have.length(5);

                res.body.pages[0].slug.should.eql('about');

                const urlParts = url.parse(res.body.pages[0].url);
                should.exist(urlParts.protocol);
                should.exist(urlParts.host);
            });
    });

    it('Can browse pages with page:false', function () {
        const key = localUtils.getValidKey();
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

    it('can\'t read post', function () {
        const key = localUtils.getValidKey();

        return request
            .get(localUtils.API.getApiQuery(`pages/${testUtils.DataGenerator.Content.posts[0].id}/?key=${key}`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(404);
    });
});
