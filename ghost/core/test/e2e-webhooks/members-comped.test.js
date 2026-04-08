const assert = require('node:assert/strict');
const {agentProvider, mockManager, fixtureManager} = require('../utils/e2e-framework');

describe('member.edited webhook with comped subscription', function () {
    let adminAPIAgent;
    let webhookMockReceiver;

    before(async function () {
        adminAPIAgent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('integrations');
        await adminAPIAgent.loginAsOwner();
    });

    beforeEach(function () {
        mockManager.mockStripe();
        webhookMockReceiver = mockManager.mockWebhookRequests();
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('member.edited webhook includes subscriptions when adding a comp', async function () {
        const webhookURL = 'https://test-webhook-receiver.com/member-comped/';
        await webhookMockReceiver.mock(webhookURL);
        await fixtureManager.insertWebhook({
            event: 'member.edited',
            url: webhookURL
        });

        // Create a free member first
        const res = await adminAPIAgent
            .post('members/')
            .body({
                members: [{
                    name: 'Comped Test Member',
                    email: 'comped-test@example.com'
                }]
            })
            .expectStatus(201);

        const memberId = res.body.members[0].id;

        // Now comp the member - this triggers member.edited
        const editRes = await adminAPIAgent
            .put('members/' + memberId)
            .body({
                members: [{
                    comped: true
                }]
            })
            .expectStatus(200);

        // Verify the API response has both tiers and subscriptions
        const apiMember = editRes.body.members[0];
        assert.ok(apiMember.tiers.length > 0, 'API response should have tiers');
        assert.ok(apiMember.subscriptions.length > 0, 'API response should have subscriptions');

        await webhookMockReceiver.receivedRequest();

        // Verify the webhook payload
        const webhookPayload = webhookMockReceiver.body.body;
        const current = webhookPayload.member.current;

        assert.ok(current.tiers.length > 0, 'Webhook should include tiers');
        assert.ok(current.subscriptions.length > 0, 'Webhook should include subscriptions but they are missing');
    });
});
