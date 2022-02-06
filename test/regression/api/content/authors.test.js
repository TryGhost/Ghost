const should = require('should');
const supertest = require('supertest');
const localUtils = require('./utils');
const testUtils = require('../../../utils');
const configUtils = require('../../../utils/configUtils');
const config = require('../../../../core/shared/config');

describe('Authors Content API', function () {
    const validKey = localUtils.getValidKey();
    let request;

    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await testUtils.initFixtures('owner:post', 'users:no-owner', 'user:inactive', 'posts', 'api_keys');
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

    it('browse authors with slug filter, should order in slug order', function () {
        return request.get(localUtils.API.getApiQuery(`authors/?key=${validKey}&filter=slug:[joe-bloggs,ghost,slimer-mcectoplasm]`))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                const jsonResponse = res.body;

                jsonResponse.authors.should.be.an.Array().with.lengthOf(3);
                jsonResponse.authors[0].slug.should.equal('joe-bloggs');
                jsonResponse.authors[1].slug.should.equal('ghost');
                jsonResponse.authors[2].slug.should.equal('slimer-mcectoplasm');
            });
    });
});
