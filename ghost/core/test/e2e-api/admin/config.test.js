const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../utils');
const localUtils = require('./utils');
const config = require('../../../core/shared/config');
const configUtils = require('../../utils/configUtils');

describe('Config API', function () {
    let request;

    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request);
    });

    afterEach(function () {
        configUtils.set('tenor:googleApiKey', undefined);
    });

    it('can retrieve config and all expected properties', async function () {
        // set any non-default keys so we can be sure they're exposed
        configUtils.set('tenor:googleApiKey', 'TENOR_KEY');

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

    describe('mailgunIsConfigured', function () {
        it('is a boolean when it is configured', async function () {
            // set any non-default keys so we can be sure they're exposed
            configUtils.set('bulkEmail', {
                mailgun: 'exists'
            });

            const res = await request
                .get(localUtils.API.getApiQuery('config/'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            should.equal(typeof res.body.config.mailgunIsConfigured, 'boolean');
        });

        it('is a boolean when it is not configured', async function () {
            // set any non-default keys so we can be sure they're exposed
            configUtils.set('bulkEmail', {});

            const res = await request
                .get(localUtils.API.getApiQuery('config/'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            should.equal(typeof res.body.config.mailgunIsConfigured, 'boolean');
        });
    });
});
