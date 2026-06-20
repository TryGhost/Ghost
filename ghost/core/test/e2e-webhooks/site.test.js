const {agentProvider, mockManager, fixtureManager, matchers} = require('../utils/e2e-framework');
const {anyGhostAgent, anyContentVersion, anyContentLength} = matchers;

describe('site.* events', function () {
    let adminAPIAgent;
    let webhookMockReceiver;

    beforeAll(async function () {
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
                'content-length': anyContentLength,
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

        const requestWasReceived = await Promise.race([
            receivedRequest,
            wait
        ]);

        if (requestWasReceived) {
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
                'content-length': anyContentLength,
                'user-agent': anyGhostAgent
            })
            .matchBodySnapshot();
    });

    it('site.changed event is NOT triggered when draft posts are deleted', async function () {
        const webhookURL = 'https://test-webhook-receiver.com/site-changed';
        await webhookMockReceiver.mock(webhookURL);
        await fixtureManager.insertWebhook({
            event: 'site.changed',
            url: webhookURL
        });

        const res = await adminAPIAgent
            .post('posts/')
            .body({
                posts: [{
                    title: 'webhookz',
                    status: 'draft',
                    mobiledoc: fixtureManager.get('posts', 1).mobiledoc
                }]
            })
            .expectStatus(201);

        const id = res.body.posts[0].id;

        await adminAPIAgent
            .delete('posts/' + id)
            .expectStatus(204);

        const receivedRequest = webhookMockReceiver.receivedRequest().then(() => true);
        const wait = new Promise((resolve) => {
            setTimeout(resolve, 2000, false);
        });

        const requestWasReceived = await Promise.race([
            receivedRequest,
            wait
        ]);

        if (requestWasReceived) {
            throw new Error('The webhook should not have been sent.');
        }
    });

    it('site.changed event is NOT triggered when only draft posts are bulk deleted', async function () {
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
                    title: 'bulk draft webhookz',
                    status: 'draft',
                    mobiledoc: fixtureManager.get('posts', 1).mobiledoc
                }]
            })
            .expectStatus(201);

        const filter = 'title:\'bulk draft webhookz\'';

        await adminAPIAgent
            .delete('posts/?filter=' + encodeURIComponent(filter))
            .expectStatus(200);

        const receivedRequest = webhookMockReceiver.receivedRequest().then(() => true);
        const wait = new Promise((resolve) => {
            setTimeout(resolve, 2000, false);
        });

        const requestWasReceived = await Promise.race([
            receivedRequest,
            wait
        ]);

        if (requestWasReceived) {
            throw new Error('The webhook should not have been sent.');
        }
    });

    it('invalidates the cache when a published post is deleted', async function () {
        const res = await adminAPIAgent
            .post('posts/')
            .body({
                posts: [{
                    title: 'published webhookz',
                    status: 'published',
                    mobiledoc: fixtureManager.get('posts', 1).mobiledoc
                }]
            })
            .expectStatus(201);

        const id = res.body.posts[0].id;

        await adminAPIAgent
            .delete('posts/' + id)
            .expectStatus(204)
            .expectHeader('X-Cache-Invalidate', '/*');
    });

    it('site.changed event is NOT triggered when a draft page is deleted', async function () {
        const webhookURL = 'https://test-webhook-receiver.com/site-changed';
        await webhookMockReceiver.mock(webhookURL);
        await fixtureManager.insertWebhook({
            event: 'site.changed',
            url: webhookURL
        });

        const res = await adminAPIAgent
            .post('pages/')
            .body({
                pages: [{
                    title: 'draft page webhookz',
                    status: 'draft',
                    mobiledoc: fixtureManager.get('posts', 1).mobiledoc
                }]
            })
            .expectStatus(201);

        const id = res.body.pages[0].id;

        await adminAPIAgent
            .delete('pages/' + id)
            .expectStatus(204);

        const receivedRequest = webhookMockReceiver.receivedRequest().then(() => true);
        const wait = new Promise((resolve) => {
            setTimeout(resolve, 2000, false);
        });

        const requestWasReceived = await Promise.race([
            receivedRequest,
            wait
        ]);

        if (requestWasReceived) {
            throw new Error('The webhook should not have been sent.');
        }
    });

    it('site.changed event is NOT triggered when only draft pages are bulk deleted', async function () {
        const webhookURL = 'https://test-webhook-receiver.com/site-changed';
        await webhookMockReceiver.mock(webhookURL);
        await fixtureManager.insertWebhook({
            event: 'site.changed',
            url: webhookURL
        });

        await adminAPIAgent
            .post('pages/')
            .body({
                pages: [{
                    title: 'bulk draft page webhookz',
                    status: 'draft',
                    mobiledoc: fixtureManager.get('posts', 1).mobiledoc
                }]
            })
            .expectStatus(201);

        const filter = 'title:\'bulk draft page webhookz\'';

        await adminAPIAgent
            .delete('pages/?filter=' + encodeURIComponent(filter))
            .expectStatus(200);

        const receivedRequest = webhookMockReceiver.receivedRequest().then(() => true);
        const wait = new Promise((resolve) => {
            setTimeout(resolve, 2000, false);
        });

        const requestWasReceived = await Promise.race([
            receivedRequest,
            wait
        ]);

        if (requestWasReceived) {
            throw new Error('The webhook should not have been sent.');
        }
    });

    it('invalidates the cache when a published page is deleted', async function () {
        const res = await adminAPIAgent
            .post('pages/')
            .body({
                pages: [{
                    title: 'published page webhookz',
                    status: 'published',
                    mobiledoc: fixtureManager.get('posts', 1).mobiledoc
                }]
            })
            .expectStatus(201);

        const id = res.body.pages[0].id;

        await adminAPIAgent
            .delete('pages/' + id)
            .expectStatus(204)
            .expectHeader('X-Cache-Invalidate', '/*');
    });
});
