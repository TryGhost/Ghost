const should = require('should');
const supertest = require('supertest');
const localUtils = require('./utils');
const testUtils = require('../../../../utils');
const configUtils = require('../../../../utils/configUtils');
const config = require('../../../../../server/config');

const ghost = testUtils.startGhost;

describe('Authors Content API', function () {
    const validKey = localUtils.getValidKey();
    let request;

    before(function () {
        return ghost()
            .then(function (_ghostServer) {
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return testUtils.initFixtures('owner:post', 'users:no-owner', 'user:inactive', 'posts', 'api_keys');
            });
    });

    afterEach(function () {
        configUtils.restore();
    });

    it('can read authors with fields', function () {
        return request.get(localUtils.API.getApiQuery(`authors/1/?key=${validKey}&fields=name`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);

                // We don't expose any other attrs.
                localUtils.API.checkResponse(res.body.authors[0], 'author', null, null, ['id', 'name']);
            });
    });
});
