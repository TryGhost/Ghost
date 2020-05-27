const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../utils');
const localUtils = require('./utils');
const config = require('../../../core/shared/config');
const ghost = testUtils.startGhost;

let request;

describe('Config API', function () {
    before(function () {
        return ghost()
            .then(function () {
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return localUtils.doAuth(request);
            });
    });

    it('can retrieve config and all expected properties', function () {
        return request
            .get(localUtils.API.getApiQuery('config/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                localUtils.API.checkResponse(res.body.config, 'config');

                // full version
                res.body.config.version.should.match(/\d+\.\d+\.\d+/);
            });
    });
});
