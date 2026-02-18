const assert = require('node:assert/strict');
const {assertExists} = require('../../utils/assertions');
const _ = require('lodash');
const should = require('should');
const supertest = require('supertest');
const config = require('../../../core/shared/config');
const testUtils = require('../../utils');
const localUtils = require('./utils');
const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyEtag, anyErrorId, anyContentVersion} = matchers;

describe('Integrations API', function () {
    let request;

    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request, 'integrations');
    });

    const findBy = (prop, val) => object => object[prop] === val;

    it('Can browse all integrations', async function () {
        const res = await request.get(localUtils.API.getApiQuery(`integrations/`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        assert.equal(res.body.integrations.length, 6);

        // there is no enforced order for integrations which makes order different on SQLite and MySQL
        const zapierIntegration = _.find(res.body.integrations, {name: 'Zapier'}); // from migrations
        assertExists(zapierIntegration);

        const testIntegration = _.find(res.body.integrations, {name: 'Test Integration'}); // from fixtures
        assertExists(testIntegration);

        const exploreIntegration = _.find(res.body.integrations, {name: 'Test Core Integration'}); // from fixtures
        assertExists(exploreIntegration);

        const selfServeMigrationIntegration = _.find(res.body.integrations, {name: 'Self-Serve Migration Integration'}); // from fixtures
        assertExists(selfServeMigrationIntegration);
    });

    it('Can not read internal integration', async function () {
        await request.get(localUtils.API.getApiQuery(`integrations/${testUtils.DataGenerator.Content.integrations[1].id}/`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(404);
    });

    it('Can successfully create a single integration with auto generated content and admin api key', async function () {
        const res = await request.post(localUtils.API.getApiQuery('integrations/'))
            .set('Origin', config.get('url'))
            .send({
                integrations: [{
                    name: 'Dis-Integrate!!'
                }]
            })
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);

        assert.equal(res.body.integrations.length, 1);

        const [integration] = res.body.integrations;
        assert.equal(integration.name, 'Dis-Integrate!!');

        assert.equal(integration.api_keys.length, 2);

        const contentApiKey = integration.api_keys.find(findBy('type', 'content'));
        assert.equal(contentApiKey.integration_id, integration.id);

        const adminApiKey = integration.api_keys.find(findBy('type', 'admin'));
        assert.equal(adminApiKey.integration_id, integration.id);
        assertExists(adminApiKey.secret);

        // check Admin API key secret format
        const [id, secret] = adminApiKey.secret.split(':');
        assertExists(id);
        assert.equal(id, adminApiKey.id);
        assertExists(secret);
        assert.equal(secret.length, 64);

        assertExists(res.headers.location);
        assert.equal(new URL(res.headers.location).pathname, `/ghost/api/admin/integrations/${res.body.integrations[0].id}/`);
    });

    it('Can successfully create a single integration with a webhook', async function () {
        const res = await request.post(localUtils.API.getApiQuery('integrations/'))
            .set('Origin', config.get('url'))
            .send({
                integrations: [{
                    name: 'Integratatron4000',
                    webhooks: [{
                        event: 'something',
                        target_url: 'http://example.com'
                    }]
                }]
            })
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);

        assert.equal(res.body.integrations.length, 1);

        const [integration] = res.body.integrations;
        assert.equal(integration.name, 'Integratatron4000');

        assert.equal(integration.webhooks.length, 1);

        const webhook = integration.webhooks[0];
        assert.equal(webhook.integration_id, integration.id);

        assertExists(res.headers.location);
        assert.equal(new URL(res.headers.location).pathname, `/ghost/api/admin/integrations/${res.body.integrations[0].id}/`);
    });

    it('Can successfully get a created integration', async function () {
        const res = await request.post(localUtils.API.getApiQuery('integrations/'))
            .set('Origin', config.get('url'))
            .send({
                integrations: [{
                    name: 'Interrogation Integration'
                }]
            })
            .expect(201);

        const [createdIntegration] = res.body.integrations;

        const res2 = await request.get(localUtils.API.getApiQuery(`integrations/${createdIntegration.id}/`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        assert.equal(res2.body.integrations.length, 1);

        const [integration] = res2.body.integrations;

        assert.equal(integration.id, createdIntegration.id);
        assert.equal(integration.name, createdIntegration.name);
        assert.equal(integration.slug, createdIntegration.slug);
        assert.equal(integration.description, createdIntegration.description);
        assert.equal(integration.icon_image, createdIntegration.icon_image);
    });

    it('Can successfully get *all* created integrations with api_keys', async function () {
        await request.post(localUtils.API.getApiQuery('integrations/'))
            .set('Origin', config.get('url'))
            .send({
                integrations: [{
                    name: 'Integrate with this!'
                }]
            })
            .expect(201);

        await request.post(localUtils.API.getApiQuery('integrations/'))
            .set('Origin', config.get('url'))
            .send({
                integrations: [{
                    name: 'Winter-(is)-great'
                }]
            })
            .expect(201);

        const res = await request.get(localUtils.API.getApiQuery(`integrations/?include=api_keys&limit=all`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        const body = res.body;
        // This is the only page
        assert.equal(body.meta.pagination.page, 1);
        assert.equal(body.meta.pagination.pages, 1);
        assert.equal(body.meta.pagination.next, null);
        assert.equal(body.meta.pagination.prev, null);

        body.integrations.forEach((integration) => {
            assertExists(integration.api_keys);
            if (integration.api_keys.length) {
                integration.api_keys.forEach((apiKey) => {
                    assertExists(apiKey.secret);

                    if (apiKey.type === 'content') {
                        assert.equal(apiKey.secret.split(':').length, 1, `${integration.name} api key secret should have correct key format without ":"`);
                    } else if (apiKey.type === 'admin') {
                        assert.equal(apiKey.secret.split(':').length, 2, `${integration.name} api key secret should have correct key format with ":"`);
                    }
                });
            }
        });
    });

    it('Can successfully edit a created integration', async function () {
        const res = await request.post(localUtils.API.getApiQuery('integrations/'))
            .set('Origin', config.get('url'))
            .send({
                integrations: [{
                    name: 'Rubbish Integration Name'
                }]
            })
            .expect(201);

        const [createdIntegration] = res.body.integrations;

        await request.put(localUtils.API.getApiQuery(`integrations/${createdIntegration.id}/`))
            .set('Origin', config.get('url'))
            .send({
                integrations: [{
                    name: 'Awesome Integration Name',
                    description: 'Finally got round to writing this...'
                }]
            })
            .expect(200);

        const res2 = await request.get(localUtils.API.getApiQuery(`integrations/${createdIntegration.id}/`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        const [updatedIntegration] = res2.body.integrations;

        assert.equal(updatedIntegration.id, createdIntegration.id);
        assert.equal(updatedIntegration.name, 'Awesome Integration Name');
        assert.equal(updatedIntegration.description, 'Finally got round to writing this...');
    });

    it('Can successfully refresh an integration api key', async function () {
        const res = await request.post(localUtils.API.getApiQuery('integrations/?include=api_keys'))
            .set('Origin', config.get('url'))
            .send({
                integrations: [{
                    name: 'Rubbish Integration Name'
                }]
            })
            .expect(201);

        const [createdIntegration] = res.body.integrations;
        const apiKeys = createdIntegration.api_keys;
        const adminApiKey = apiKeys.find(key => key.type === 'admin');

        await request.post(localUtils.API.getApiQuery(`integrations/${createdIntegration.id}/api_key/${adminApiKey.id}/refresh`))
            .set('Origin', config.get('url'))
            .send({
                integrations: [{
                    id: createdIntegration.id
                }]
            })
            .expect(200);

        const res2 = await request.get(localUtils.API.getApiQuery(`integrations/${createdIntegration.id}/?include=api_keys`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        const [updatedIntegration] = res2.body.integrations;
        const updatedAdminApiKey = updatedIntegration.api_keys.find(key => key.type === 'admin');
        assert.equal(updatedIntegration.id, createdIntegration.id);
        assert.notEqual(updatedAdminApiKey.secret, adminApiKey.secret);

        const res3 = await request.get(localUtils.API.getApiQuery(`actions/?filter=resource_id:'${adminApiKey.id}'&include=actor`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        const actions = res3.body.actions;
        const refreshedAction = actions.find((action) => {
            return action.event === 'refreshed';
        });
        assertExists(refreshedAction);
    });

    it('Can successfully add and delete a created integrations webhooks', async function () {
        const res = await request.post(localUtils.API.getApiQuery('integrations/'))
            .set('Origin', config.get('url'))
            .send({
                integrations: [{
                    name: 'Webhook-less Integration'
                }]
            })
            .expect(201);

        const [createdIntegration] = res.body.integrations;

        await request.put(localUtils.API.getApiQuery(`integrations/${createdIntegration.id}/`))
            .set('Origin', config.get('url'))
            .send({
                integrations: [{
                    webhooks: [{
                        event: 'somestuff',
                        target_url: 'http://example.com'
                    }]
                }]
            })
            .expect(200);

        const res2 = await request.get(localUtils.API.getApiQuery(`integrations/${createdIntegration.id}/?include=webhooks`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        const [updatedIntegration] = res2.body.integrations;

        assert.equal(updatedIntegration.webhooks.length, 1);

        const webhook = updatedIntegration.webhooks[0];
        assert.equal(webhook.integration_id, updatedIntegration.id);

        await request.put(localUtils.API.getApiQuery(`integrations/${createdIntegration.id}/`))
            .set('Origin', config.get('url'))
            .send({
                integrations: [{
                    webhooks: []
                }]
            })
            .expect(200);

        const res3 = await request.get(localUtils.API.getApiQuery(`integrations/${createdIntegration.id}/?include=webhooks`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        const [updatedIntegration2] = res3.body.integrations;
        assert.equal(updatedIntegration2.webhooks.length, 0);
    });

    it('Can successfully delete a created integration', async function () {
        const res = await request.post(localUtils.API.getApiQuery('integrations/'))
            .set('Origin', config.get('url'))
            .send({
                integrations: [{
                    name: 'Short Lived Integration'
                }]
            })
            .expect(201);

        const [createdIntegration] = res.body.integrations;

        await request.del(localUtils.API.getApiQuery(`integrations/${createdIntegration.id}/`))
            .set('Origin', config.get('url'))
            .expect(204)
            .expect(({body}) => {
                assert.deepEqual(body, {});
            });

        await request.get(localUtils.API.getApiQuery(`integrations/${createdIntegration.id}/`))
            .set('Origin', config.get('url'))
            .expect(404);

        const editRes = await request.put(localUtils.API.getApiQuery(`integrations/${createdIntegration.id}/`))
            .send({
                integrations: [createdIntegration]
            })
            .set('Origin', config.get('url'))
            .expect(404);

        assert.equal(editRes.body.errors[0].context, 'Integration not found.');
    });

    describe('As Administrator', function () {
        let agent;

        before(async function () {
            agent = await agentProvider.getAdminAPIAgent();
            await fixtureManager.init('users', 'integrations');
            await agent.loginAsContributor();
        });

        it('Can\'t see Self-Serve or any other integration', async function () {
            await agent
                .get('integrations')
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    errors: [
                        {
                            id: anyErrorId
                        }
                    ]
                })
                .expectStatus(403);
        });
    });
});
