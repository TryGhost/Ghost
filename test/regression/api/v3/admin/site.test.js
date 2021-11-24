const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../../../utils');
const localUtils = require('../../v3/admin/utils');
const config = require('../../../../../core/shared/config');

describe('Config API (v3)', function () {
    let request;

    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request);
    });

    it('can retrieve config and all expected properties', async function () {
        const res = await request
            .get(localUtils.API.getApiQuery('site/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        localUtils.API.checkResponse(res.body.site, 'site');

        // minor (safe) version
        res.body.site.version.should.match(/\d+\.\d+/);
    });
});
