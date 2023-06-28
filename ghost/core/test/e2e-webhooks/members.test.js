const {agentProvider, mockManager, fixtureManager, matchers} = require('../utils/e2e-framework');
const {anyGhostAgent, anyObjectId, anyISODateTime, anyUuid, anyContentVersion, anyNumber} = matchers;

const buildNewsletterSnapshot = () => {
    const newsLetterSnapshot = {
        id: anyObjectId,
        uuid: anyUuid,
        created_at: anyISODateTime,
        updated_at: anyISODateTime
    };

    return newsLetterSnapshot;
};

const buildMemberSnapshot = () => {
    const memberSnapshot = {
        id: anyObjectId,
        uuid: anyUuid,
        created_at: anyISODateTime,
        updated_at: anyISODateTime,
        newsletters: new Array(1).fill(buildNewsletterSnapshot())
    };

    return memberSnapshot;
};

describe('member.* events', function () {
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

    it('member.added event is triggered', async function () {
        const webhookURL = 'https://test-webhook-receiver.com/member-added/';
        await webhookMockReceiver.mock(webhookURL);
        await fixtureManager.insertWebhook({
            event: 'member.added',
            url: webhookURL
        });

        await adminAPIAgent
            .post('members/')
            .body({
                members: [{
                    name: 'Test Member',
                    email: 'testemail@example.com',
                    note: 'test note'
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
                member: {
                    current: buildMemberSnapshot()
                }
            });
    });

    it('member.deleted event is triggered', async function () {
        const webhookURL = 'https://test-webhook-receiver.com/member-deleted/';
        await webhookMockReceiver.mock(webhookURL);
        await fixtureManager.insertWebhook({
            event: 'member.deleted',
            url: webhookURL
        });

        const res = await adminAPIAgent
            .post('members/')
            .body({
                members: [{
                    name: 'Test Member2',
                    email: 'testemail2@example.com',
                    note: 'test note2'
                }]
            })
            .expectStatus(201);

        const id = res.body.members[0].id;

        await adminAPIAgent
            .delete('members/' + id)
            .expectStatus(204);

        await webhookMockReceiver.receivedRequest();

        webhookMockReceiver
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                'content-length': anyNumber,
                'user-agent': anyGhostAgent
            })
            .matchBodySnapshot({
                member: {
                    current: {},
                    previous: buildMemberSnapshot()
                }
            });
    });

    it('member.edited event is triggered', async function () {
        const webhookURL = 'https://test-webhook-receiver.com/member-edited/';
        await webhookMockReceiver.mock(webhookURL);
        await fixtureManager.insertWebhook({
            event: 'member.edited',
            url: webhookURL
        });

        const res = await adminAPIAgent
            .post('members/')
            .body({
                members: [{
                    name: 'Test Member3',
                    email: 'testemail3@example.com',
                    note: 'test note3'
                }]
            })
            .expectStatus(201);

        const id = res.body.members[0].id;

        await adminAPIAgent
            .put('members/' + id)
            .body({
                members: [{name: 'Ghost'}]
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
                member: {
                    current: buildMemberSnapshot(),
                    previous: {
                        updated_at: anyISODateTime
                    }
                }
            });
    });
});
