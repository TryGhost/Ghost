const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../utils');
const config = require('../../../core/shared/config');
const localUtils = require('./utils');

const ghost = testUtils.startGhost;
let request;

describe('Webhooks API', function () {
    let ghostServer;

    before(function () {
        return ghost()
            .then(function (_ghostServer) {
                ghostServer = _ghostServer;
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return localUtils.doAuth(request);
            });
    });

    it('Can creates a webhook', function () {
        let webhookData = {
            event: 'test.create',
            target_url: 'http://example.com/webhooks/test/extra/1',
            name: 'test',
            secret: 'thisissecret',
            api_version: 'v2',
            integration_id: '12345'
        };

        return request.post(localUtils.API.getApiQuery('webhooks/'))
            .set('Origin', config.get('url'))
            .send({webhooks: [webhookData]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201)
            .then((res) => {
                const jsonResponse = res.body;

                should.exist(jsonResponse.webhooks);

                localUtils.API.checkResponse(jsonResponse.webhooks[0], 'webhook');

                jsonResponse.webhooks[0].event.should.equal(webhookData.event);
                jsonResponse.webhooks[0].target_url.should.equal(webhookData.target_url);
                jsonResponse.webhooks[0].secret.should.equal(webhookData.secret);
                jsonResponse.webhooks[0].name.should.equal(webhookData.name);
                jsonResponse.webhooks[0].api_version.should.equal(webhookData.api_version);
                jsonResponse.webhooks[0].integration_id.should.equal(webhookData.integration_id);
            });
    });

    it('Can edit a webhook', function () {
        let createdIntegration;
        let createdWebhook;

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
            })
            .then(({body}) => {
                [createdWebhook] = body.webhooks;

                return request.put(localUtils.API.getApiQuery(`webhooks/${createdWebhook.id}/`))
                    .set('Origin', config.get('url'))
                    .send({
                        webhooks: [{
                            name: 'Edit Test',
                            event: 'subscriber.added',
                            target_url: 'https://example.com/new-subscriber'
                        }]
                    })
                    .expect(200)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private);
            })
            .then(({body}) => {
                const [updatedWebhook] = body.webhooks;

                should.equal(updatedWebhook.id, createdWebhook.id);
                should.equal(updatedWebhook.name, 'Edit Test');
                should.equal(updatedWebhook.event, 'subscriber.added');
                should.equal(updatedWebhook.target_url, 'https://example.com/new-subscriber');
                should.equal(updatedWebhook.integration_id, createdIntegration.id);
            });
    });

    it('Can delete a webhook', function () {
        const newWebhook = {
            event: 'test.create',
            // a different target_url from above is needed to avoid an "already exists" error
            target_url: 'http://example.com/webhooks/test/2',
            integration_id: '123423'
        };

        // create the webhook that is to be deleted
        return request.post(localUtils.API.getApiQuery('webhooks/'))
            .set('Origin', config.get('url'))
            .send({webhooks: [newWebhook]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201)
            .then((res) => {
                const jsonResponse = res.body;

                should.exist(jsonResponse.webhooks);
                localUtils.API.checkResponse(jsonResponse.webhooks[0], 'webhook');
                jsonResponse.webhooks[0].event.should.equal(newWebhook.event);
                jsonResponse.webhooks[0].target_url.should.equal(newWebhook.target_url);

                // begin delete test
                return request.del(localUtils.API.getApiQuery('webhooks/' + jsonResponse.webhooks[0].id + '/'))
                    .set('Origin', config.get('url'))
                    .expect(204);
            })
            .then((res) => {
                res.body.should.be.empty();
            });
    });
});
