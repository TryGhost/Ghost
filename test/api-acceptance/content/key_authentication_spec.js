const should = require('should');
const supertest = require('supertest');
const _ = require('lodash');
const testUtils = require('../../utils');
const localUtils = require('./utils');
const config = require('../../../core/server/config');

const ghost = testUtils.startGhost;

describe('Content API key authentication', function () {
    let request;

    before(function () {
        return ghost()
            .then(function () {
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return testUtils.initFixtures('api_keys');
            });
    });

    it('Can not access without key', function () {
        return request.get(localUtils.API.getApiQuery('posts/'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(403);
    });

    it('Can access with with valid key', function () {
        const key = localUtils.getValidKey();

        return request.get(localUtils.API.getApiQuery(`posts/?key=${key}`))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);
    });
});
