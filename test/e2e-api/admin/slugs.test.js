const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../utils');
const config = require('../../../core/shared/config');
const localUtils = require('./utils');

describe('Slug API', function () {
    let request;

    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request);
    });

    it('Can generate a slug', async function () {
        const res = await request.get(localUtils.API.getApiQuery('slugs/post/a post title/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        should.exist(jsonResponse);
        should.exist(jsonResponse.slugs);
        jsonResponse.slugs.should.have.length(1);
        localUtils.API.checkResponse(jsonResponse.slugs[0], 'slug');
        jsonResponse.slugs[0].slug.should.equal('a-post-title');
    });
});
