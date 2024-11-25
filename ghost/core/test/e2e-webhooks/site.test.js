const {agentProvider, mockManager, fixtureManager, matchers} = require('../utils/e2e-framework');
const {anyGhostAgent, anyContentVersion, anyNumber} = matchers;

describe('site.* events', function () {
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

    it('site.changed event is triggered', async function () {
        const webhookURL = 'https://test-webhook-receiver.com/site-changed';
        await webhookMockReceiver.mock(webhookURL);
        await fixtureManager.insertWebhook({
            event: 'site.changed',
            url: webhookURL
        });

        await adminAPIAgent
            .post('posts/')
            .body({
                posts: [{
                    title: 'webhookz',
                    status: 'published',
                    mobiledoc: fixtureManager.get('posts', 1).mobiledoc
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
            .matchBodySnapshot();
    });

    it('site.changed event is triggered but the custom integrations are limited', async function () {
        const webhookURL = 'https://test-webhook-receiver.com/site-changed';
        await webhookMockReceiver.mock(webhookURL);
        await fixtureManager.insertWebhook({
            event: 'site.changed',
            url: webhookURL
        });

        mockManager.mockLimitService('customIntegrations', {
            isLimited: true,
            wouldGoOverLimit: true
        });

        await adminAPIAgent
            .post('posts/')
            .body({
                posts: [{
                    title: 'webhookz',
                    status: 'published',
                    mobiledoc: fixtureManager.get('posts', 1).mobiledoc
                }]
            })
            .expectStatus(201);

        const receivedRequest = webhookMockReceiver.receivedRequest().then(() => true);
        const wait = new Promise((resolve) => {
            setTimeout(resolve, 2000, false);
        });

        const requestWasRecieved = await Promise.race([
            receivedRequest,
            wait
        ]);

        if (requestWasRecieved) {
            throw new Error('The webhook should not have been sent.');
        }
    });

    it('site.changed event is triggered, custom integrations are limited but we have an internal webhook', async function () {
        const webhookURL = 'https://test-webhook-receiver.com/site-changed';
        await webhookMockReceiver.mock(webhookURL);
        await fixtureManager.insertWebhook({
            event: 'site.changed',
            url: webhookURL,
            integrationType: 'internal'
        });

        mockManager.mockLimitService('customIntegrations', {
            isLimited: true,
            wouldGoOverLimit: true
        });

        await adminAPIAgent
            .post('posts/')
            .body({
                posts: [{
                    title: 'webhookz',
                    status: 'published',
                    mobiledoc: fixtureManager.get('posts', 1).mobiledoc
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
            .matchBodySnapshot();
    });
});
