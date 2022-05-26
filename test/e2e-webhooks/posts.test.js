const {agentProvider, mockManager, fixtureManager} = require('../utils/e2e-framework');

describe('post.* events', function () {
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

    it('post.published even is triggered', async function () {
        await webhookMockReceiver.mock('post.published');
        await fixtureManager.insertWebhook({
            event: 'post.published',
            url: 'https://test-webhook-receiver.com/webhook'
        });

        const res = await adminAPIAgent
            .post('posts/')
            .body({
                posts: [{
                    title: 'webhookz',
                    status: 'draft'
                }]
            })
            .expectStatus(201);

        const id = res.body.posts[0].id;
        const updatedPost = res.body.posts[0];
        updatedPost.status = 'published';

        await adminAPIAgent
            .put('posts/' + id)
            .body({
                posts: [updatedPost]
            })
            .expectStatus(200);

        await webhookMockReceiver
            .matchBodySnapshot();
    });
});
