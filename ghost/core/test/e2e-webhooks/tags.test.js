const {agentProvider, mockManager, fixtureManager, matchers} = require('../utils/e2e-framework');
const {anyGhostAgent, anyObjectId, anyISODateTime, anyString, anyContentVersion, anyNumber, anyLocalURL} = matchers;

const tagSnapshot = {
    created_at: anyISODateTime,
    description: anyString,
    id: anyObjectId,
    updated_at: anyISODateTime
};

describe('tag.* events', function () {
    let adminAPIAgent;
    let webhookMockReceiver;

    before(async function () {
        adminAPIAgent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('integrations');
        await adminAPIAgent.loginAsOwner();
    });

    beforeEach(function () {
        webhookMockReceiver = mockManager.mockWebhookRequests();
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('tag.added event is triggered', async function () {
        const webhookURL = 'https://test-webhook-receiver.com/tag-added/';
        await webhookMockReceiver.mock(webhookURL);
        await fixtureManager.insertWebhook({
            event: 'tag.added',
            url: webhookURL
        });

        await adminAPIAgent
            .post('tags/')
            .body({
                tags: [{
                    name: 'Test Tag',
                    slug: 'test-tag',
                    description: 'Test Description'
                }]
            })
            .expectStatus(201);

        await webhookMockReceiver.receivedRequest();

        webhookMockReceiver
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                'content-length': anyNumber,
                'user-agent': anyGhostAgent
            })
            .matchBodySnapshot({
                tag: {
                    current: {...tagSnapshot, url: anyLocalURL}
                }
            });
    });

    it('tag.deleted event is triggered', async function () {
        const webhookURL = 'https://test-webhook-receiver.com/tag-deleted/';
        await webhookMockReceiver.mock(webhookURL);
        await fixtureManager.insertWebhook({
            event: 'tag.deleted',
            url: webhookURL
        });

        const res = await adminAPIAgent
            .post('tags/')
            .body({
                tags: [{
                    name: 'Test Tag 2',
                    slug: 'test-tag-2',
                    description: 'Test description'
                }]
            })
            .expectStatus(201);

        const id = res.body.tags[0].id;

        await adminAPIAgent
            .delete('tags/' + id)
            .expectStatus(204);

        await webhookMockReceiver.receivedRequest();

        webhookMockReceiver
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                'content-length': anyNumber,
                'user-agent': anyGhostAgent
            })
            .matchBodySnapshot({
                tag: {
                    current: {},
                    previous: tagSnapshot
                }
            });
    });

    it('tag.edited event is triggered', async function () {
        const webhookURL = 'https://test-webhook-receiver.com/tag-edited/';
        await webhookMockReceiver.mock(webhookURL);
        await fixtureManager.insertWebhook({
            event: 'tag.edited',
            url: webhookURL
        });
    
        const res = await adminAPIAgent
            .post('tags/')
            .body({
                tags: [{
                    name: 'Test Tag 3',
                    slug: 'test-tag-3',
                    description: 'Test description'
                }]
            })
            .expectStatus(201);
    
        const id = res.body.tags[0].id;
    
        const updatedTag = res.body.tags[0];
        updatedTag.name = 'Updated Tag 3';
        updatedTag.slug = 'updated-tag-3';
    
        await adminAPIAgent
            .put('tags/' + id)
            .body({
                tags: [updatedTag]
            })
            .expectStatus(200);
    
        await webhookMockReceiver.receivedRequest();
    
        webhookMockReceiver
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                'content-length': anyNumber,
                'user-agent': anyGhostAgent
            })
            .matchBodySnapshot({
                tag: {
                    current: {...tagSnapshot, url: anyLocalURL},
                    previous: {updated_at: anyISODateTime}
                }
            });
    });
});
