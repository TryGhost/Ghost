const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../../utils');
const config = require('../../../../core/shared/config');
const localUtils = require('./utils');

describe('Webhooks API (canary)', function () {
    let request;
    const API_VERSION = 'canary';

    before(async function () {
        await localUtils.startGhost();

        request = supertest.agent(config.get('url'));

        await localUtils.doAuth(request, 'integrations', 'api_keys', 'webhooks');
    });

    it('Can create a webhook using integration', function () {
        let webhookData = {
            event: 'test.create',
            target_url: 'http://example.com/webhooks/test/extra/canary',
            integration_id: 'ignore_me',
            name: 'test',
            secret: 'thisissecret',
            api_version: API_VERSION
        };

        return request.post(localUtils.API.getApiQuery('webhooks/'))
            .set('Authorization', `Ghost ${localUtils.getValidAdminToken('/admin/', testUtils.DataGenerator.Content.api_keys[0])}`)
            .send({webhooks: [webhookData]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;

                should.exist(jsonResponse);
                should.exist(jsonResponse.webhooks);
                should.exist(jsonResponse.webhooks[0].event);
                should.exist(jsonResponse.webhooks[0].target_url);

                jsonResponse.webhooks[0].event.should.eql('test.create');
                jsonResponse.webhooks[0].target_url.should.eql('http://example.com/webhooks/test/extra/canary');
                jsonResponse.webhooks[0].integration_id.should.eql(testUtils.DataGenerator.Content.api_keys[0].integration_id);
                jsonResponse.webhooks[0].name.should.eql('test');
                jsonResponse.webhooks[0].secret.should.eql('thisissecret');
                jsonResponse.webhooks[0].api_version.should.eql('canary');

                localUtils.API.checkResponse(jsonResponse.webhooks[0], 'webhook');
            });
    });

    it('Fails validation for when integration_id is missing', function () {
        let webhookData = {
            event: 'test.create',
            target_url: 'http://example.com/webhooks/test/extra/1',
            name: 'test',
            secret: 'thisissecret',
            api_version: API_VERSION
        };

        return request.post(localUtils.API.getApiQuery('webhooks/'))
            .set('Origin', config.get('url'))
            .send({webhooks: [webhookData]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(422);
    });

    it('Fails validation for non-lowercase event name', function () {
        let webhookData = {
            event: 'tEst.evenT',
            target_url: 'http://example.com/webhooks/test/extra/1',
            name: 'test',
            secret: 'thisissecret',
            api_version: API_VERSION
        };

        return request.post(localUtils.API.getApiQuery('webhooks/'))
            .set('Origin', config.get('url'))
            .send({webhooks: [webhookData]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(422);
    });

    it('Fails validation when required fields are not present', function () {
        let webhookData = {
            api_version: API_VERSION,
            integration_id: 'dummy'
        };

        return request.post(localUtils.API.getApiQuery('webhooks/'))
            .set('Origin', config.get('url'))
            .send({webhooks: [webhookData]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(422);
    });

    it('Integration cannot edit or delete other integration\'s webhook', function () {
        let createdIntegration;
        let createdWebhook;

        return Promise.resolve()
            .then(() => {
                return request.post(localUtils.API.getApiQuery('integrations/'))
                    .set('Origin', config.get('url'))
                    .send({
                        integrations: [{
                            name: 'Rubbish Integration Name'
                        }]
                    })
                    .expect(201)
                    .then(({body}) => {
                        [createdIntegration] = body.integrations;

                        return request.post(localUtils.API.getApiQuery('webhooks/'))
                            .set('Origin', config.get('url'))
                            .send({
                                webhooks: [{
                                    name: 'Testing',
                                    event: 'site.changed',
                                    target_url: 'https://example.com/rebuild',
                                    integration_id: createdIntegration.id
                                }]
                            })
                            .expect(201);
                    });
            })
            .then(({body}) => {
                [createdWebhook] = body.webhooks;

                return request.put(localUtils.API.getApiQuery(`webhooks/${createdWebhook.id}/`))
                    .set('Authorization', `Ghost ${localUtils.getValidAdminToken('/admin/', testUtils.DataGenerator.Content.api_keys[0])}`)
                    .send({
                        webhooks: [{
                            name: 'Edit Test',
                            event: 'member.added',
                            target_url: 'https://example.com/new-subscriber'
                        }]
                    })
                    .expect(403);
            })
            .then(() => {
                return request.del(localUtils.API.getApiQuery(`webhooks/${createdWebhook.id}/`))
                    .set('Authorization', `Ghost ${localUtils.getValidAdminToken('/admin/', testUtils.DataGenerator.Content.api_keys[0])}`)
                    .expect(403);
            });
    });

    it('Integration editing non-existing webhook returns 404', function () {
        return request.put(localUtils.API.getApiQuery(`webhooks/5f27d0287c75da744d8615da/`))
            .set('Authorization', `Ghost ${localUtils.getValidAdminToken('/admin/', testUtils.DataGenerator.Content.api_keys[0])}`)
            .send({
                webhooks: [{
                    name: 'Edit Test'
                }]
            })
            .expect(404);
    });

    it('Integration deleting non-existing webhook returns 404', function () {
        return request.delete(localUtils.API.getApiQuery(`webhooks/5f27d0287c75da744d8615db/`))
            .set('Authorization', `Ghost ${localUtils.getValidAdminToken('/admin/', testUtils.DataGenerator.Content.api_keys[0])}`)
            .expect(404);
    });

    it('Cannot edit webhooks using content api keys', function () {
        let webhookData = {
            event: 'post.create',
            target_url: 'http://example.com/webhooks/test/extra/2'
        };

        return request.post(localUtils.API.getApiQuery('webhooks/'))
            .set('Authorization', `Ghost ${localUtils.getValidAdminToken('/admin/', testUtils.DataGenerator.Content.api_keys[1])}`)
            .send({webhooks: [webhookData]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(401);
    });
});
