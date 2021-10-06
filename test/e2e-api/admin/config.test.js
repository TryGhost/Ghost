const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../utils');
const localUtils = require('./utils');
const config = require('../../../core/shared/config');

describe('Config API', function () {
    let request;

    before(async function () {
        await testUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request);
    });

    it('can retrieve config and all expected properties', async function () {
        const res = await request
            .get(localUtils.API.getApiQuery('config/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        localUtils.API.checkResponse(res.body.config, 'config');

        // full version
        res.body.config.version.should.match(/\d+\.\d+\.\d+/);
    });
});
