const {
    agentProvider,
    mockManager,
    fixtureManager,
    matchers
} = require('../utils/e2e-framework');
const {
    anyGhostAgent,
    anyUuid,
    anyLocalURL,
    anyISODateTime,
    anyObjectId,
    anyContentVersion,
    anyNumber
} = matchers;

const tierSnapshot = {
    id: anyObjectId,
    created_at: anyISODateTime,
    updated_at: anyISODateTime
};

const buildAuthorSnapshot = (roles = false) => {
    const authorSnapshot = {
        last_seen: anyISODateTime,
        created_at: anyISODateTime,
        updated_at: anyISODateTime
    };

    return authorSnapshot;
};

const buildPageSnapshotWithTiers = ({
    published,
    tiersCount,
    roles = false
}) => {
    return {
        id: anyObjectId,
        uuid: anyUuid,
        comment_id: anyObjectId,
        published_at: published ? anyISODateTime : null,
        created_at: anyISODateTime,
        updated_at: anyISODateTime,
        url: anyLocalURL,
        tiers: new Array(tiersCount).fill(tierSnapshot),
        primary_author: buildAuthorSnapshot(roles),
        authors: new Array(1).fill(buildAuthorSnapshot(roles))
    };
};

describe('page.* events', function () {
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

    it('page.added event is triggered', async function () {
        const webhookURL = 'https://test-webhook-receiver.com/page-added/';
        await webhookMockReceiver.mock(webhookURL);
        await fixtureManager.insertWebhook({
            event: 'page.added',
            url: webhookURL
        });

        await adminAPIAgent
            .post('pages/')
            .body({
                pages: [
                    {
                        title: 'testing page.added webhook',
                        status: 'draft',
                        displayName: 'webhookz'
                    }
                ]
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
                page: {
                    current: buildPageSnapshotWithTiers({
                        published: false,
                        tiersCount: 2
                    })
                }
            });
    });

    it('page.published event is triggered', async function () {
        const webhookURL = 'https://test-webhook-receiver.com/page-published/';
        await webhookMockReceiver.mock(webhookURL);
        await fixtureManager.insertWebhook({
            event: 'page.published',
            url: webhookURL
        });

        const res = await adminAPIAgent
            .post('pages/')
            .body({
                pages: [
                    {
                        title: 'testing page.published webhook',
                        status: 'draft',
                        displayName: 'webhookz'
                    }
                ]
            })
            .expectStatus(201);

        const page = res.body.pages[0];
        const updatedPage = {...page, status: 'published'};

        await adminAPIAgent
            .put('pages/' + page.id)
            .body({
                pages: [updatedPage]
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
                page: {
                    current: buildPageSnapshotWithTiers({
                        published: true,
                        tiersCount: 2
                    }),
                    previous: buildPageSnapshotWithTiers({
                        tiersCount: 2
                    })
                }
            });
    });
});
