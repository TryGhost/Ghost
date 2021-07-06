const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../utils');
const config = require('../../../core/shared/config');
const localUtils = require('./utils');

describe('Webhooks API', function () {
    let request;
    const API_VERSION = 'canary';

    before(async function () {
        await testUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request, 'integrations');
    });

    it('Can create a webhook', async function () {
        const webhookData = {
            event: 'test.create',
            target_url: 'http://example.com/webhooks/test/extra/1',
            name: 'test',
            secret: 'thisissecret',
            api_version: API_VERSION,
            integration_id: testUtils.DataGenerator.Content.integrations[0].id
        };

        const res = await request.post(localUtils.API.getApiQuery('webhooks/'))
            .set('Origin', config.get('url'))
            .send({webhooks: [webhookData]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);

        const jsonResponse = res.body;

        should.exist(jsonResponse.webhooks);

        localUtils.API.checkResponse(jsonResponse.webhooks[0], 'webhook');

        jsonResponse.webhooks[0].event.should.equal(webhookData.event);
        jsonResponse.webhooks[0].target_url.should.equal(webhookData.target_url);
        jsonResponse.webhooks[0].secret.should.equal(webhookData.secret);
        jsonResponse.webhooks[0].name.should.equal(webhookData.name);
        jsonResponse.webhooks[0].api_version.should.equal(webhookData.api_version);
        jsonResponse.webhooks[0].integration_id.should.equal(webhookData.integration_id);

        should.not.exist(res.headers.location);

        await request.post(localUtils.API.getApiQuery('webhooks/'))
            .set('Origin', config.get('url'))
            .send({webhooks: [webhookData]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(422);
    });

    it('Fails nicely when creating an orphaned webhook', async function () {
        const webhookData = {
            event: 'test.create',
            target_url: 'http://example.com/webhooks/test/extra/10',
            name: 'test',
            secret: 'thisissecret',
            api_version: API_VERSION,
            integration_id: `fake-integration`
        };

        const res = await request.post(localUtils.API.getApiQuery('webhooks/'))
            .set('Origin', config.get('url'))
            .send({webhooks: [webhookData]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(422);

        const jsonResponse = res.body;

        should.exist(jsonResponse.errors);

        jsonResponse.errors[0].type.should.equal('ValidationError');
        jsonResponse.errors[0].context.should.equal(`Validation failed for 'integration_id'. 'integration_id' value does not match any existing integration.`);
    });

    it('Can edit a webhook', async function () {
        let createdIntegration;
        let createdWebhook;

        const res = await request.post(localUtils.API.getApiQuery('integrations/'))
            .set('Origin', config.get('url'))
            .send({
                integrations: [{
                    name: 'Rubbish Integration Name'
                }]
            })
            .expect(201);

        [createdIntegration] = res.body.integrations;

        const res2 = await request.post(localUtils.API.getApiQuery('webhooks/'))
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

        [createdWebhook] = res2.body.webhooks;

        const res3 = await request.put(localUtils.API.getApiQuery(`webhooks/${createdWebhook.id}/`))
            .set('Origin', config.get('url'))
            .send({
                webhooks: [{
                    name: 'Edit Test',
                    event: 'subscriber.added',
                    target_url: 'https://example.com/new-subscriber',
                    integration_id: 'ignore_me'
                }]
            })
            .expect(200)
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private);

        const [updatedWebhook] = res3.body.webhooks;

        should.equal(updatedWebhook.id, createdWebhook.id);
        should.equal(updatedWebhook.name, 'Edit Test');
        should.equal(updatedWebhook.event, 'subscriber.added');
        should.equal(updatedWebhook.target_url, 'https://example.com/new-subscriber');
        should.equal(updatedWebhook.integration_id, createdIntegration.id);
    });

    it('Can delete a webhook', async function () {
        const newWebhook = {
            event: 'test.create',
            // a different target_url from above is needed to avoid an "already exists" error
            target_url: 'http://example.com/webhooks/test/2',
            integration_id: testUtils.DataGenerator.Content.integrations[0].id
        };

        // create the webhook that is to be deleted
        const res = await request.post(localUtils.API.getApiQuery('webhooks/'))
            .set('Origin', config.get('url'))
            .send({webhooks: [newWebhook]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);

        const jsonResponse = res.body;

        should.exist(jsonResponse.webhooks);
        localUtils.API.checkResponse(jsonResponse.webhooks[0], 'webhook');
        jsonResponse.webhooks[0].event.should.equal(newWebhook.event);
        jsonResponse.webhooks[0].target_url.should.equal(newWebhook.target_url);

        // begin delete test
        const res2 = await request.del(localUtils.API.getApiQuery('webhooks/' + jsonResponse.webhooks[0].id + '/'))
            .set('Origin', config.get('url'))
            .expect(204);

        res2.body.should.be.empty();
    });
});
