const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../utils');
const localUtils = require('./utils');
const config = require('../../../core/shared/config');
const configUtils = require('../../utils/configUtils');

describe('Content API key authentication', function () {
    let request;

    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await testUtils.initFixtures('api_keys');
    });

    it('Can not access without key', async function () {
        await request.get(localUtils.API.getApiQuery('posts/'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(403);
    });

    it('Can access with with valid key', async function () {
        const key = localUtils.getValidKey();

        await request.get(localUtils.API.getApiQuery(`posts/?key=${key}`))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);
    });

    describe('Host Settings: custom integration limits', function () {
        afterEach(function () {
            configUtils.set('hostSettings:limits', undefined);
        });

        it('Blocks the request when host limit is in place for custom integrations', async function () {
            configUtils.set('hostSettings:limits', {
                customIntegrations: {
                    disabled: true,
                    error: 'Custom limit error message'
                }
            });

            // NOTE: need to do a full reboot to reinitialize hostSettings
            await localUtils.startGhost();
            await testUtils.initFixtures('api_keys');

            const key = localUtils.getValidKey();

            const response = await request.get(localUtils.API.getApiQuery(`posts/?key=${key}`))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(403);

            response.body.errors[0].type.should.equal('HostLimitError');
            response.body.errors[0].message.should.equal('Custom limit error message');
        });
    });
});
