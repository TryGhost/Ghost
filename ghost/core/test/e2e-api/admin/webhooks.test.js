const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyEtag, anyErrorId, anyObjectId, anyISODate, stringMatching, anyContentLength} = matchers;

const webhookMatcher = {
    id: anyObjectId,
    api_version: stringMatching(/v\d+\.\d+/),
    integration_id: anyObjectId,
    created_at: anyISODate,
    updated_at: anyISODate
};

describe('Webhooks API', function () {
    let agent;
    let createdWebhookId;
    let webhookData;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('integrations');
        await agent.loginAsOwner();

        // create a webhook linked to a real integration
        webhookData = {
            event: 'test.create',
            target_url: 'http://example.com/webhooks/test/extra/1',
            name: 'test',
            secret: 'thisissecret',
            integration_id: fixtureManager.get('integrations', 0).id
        };
    });

    it('Can create a webhook', async function () {
        const {body} = await agent.post('/webhooks/')
            .body({webhooks: [webhookData]})
            .expectStatus(201)
            .matchHeaderSnapshot({
                // Note: No location header as there is no read method for webhooks
                etag: anyEtag,
                'content-length': anyContentLength

            })
            .matchBodySnapshot({
                webhooks: [webhookMatcher]
            });

        // Store an id for use in future tests. Not the best pattern but does keep the tests readable.
        createdWebhookId = body.webhooks[0].id;
    });

    it('Fails nicely when adding a duplicate webhook', async function () {
        await agent.post('/webhooks/')
            .body({webhooks: [webhookData]})
            .expectStatus(422)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot({
                errors: [{
                    id: anyErrorId
                }]
            });
    });

    it('Fails nicely when creating an orphaned webhook', async function () {
        await agent
            .post('/webhooks/')
            .body({webhooks: [{
                event: 'test.create',
                target_url: 'http://example.com/webhooks/test/extra/10',
                name: 'test',
                secret: 'thisissecret',
                integration_id: `fake-integration`
            }]})
            .expectStatus(422)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot({
                errors: [{
                    id: anyErrorId
                }]
            });
    });

    it('Can edit a webhook', async function () {
        await agent.put(`/webhooks/${createdWebhookId}/`)
            .body({
                webhooks: [{
                    name: 'Edit Test',
                    event: 'member.added',
                    target_url: 'https://example.com/new-member',
                    integration_id: 'ignore_me'
                }]
            })
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag,
                'content-length': anyContentLength
            })
            .matchBodySnapshot({
                webhooks: [webhookMatcher]
            });
    });

    it('Can delete a webhook', async function () {
        await agent
            .delete(`/webhooks/${createdWebhookId}/`)
            .expectStatus(204)
            .expectEmptyBody()
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });
});
