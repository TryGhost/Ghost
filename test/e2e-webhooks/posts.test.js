const {agentProvider, mockManager, fixtureManager, matchers} = require('../utils/e2e-framework');
const {anyObjectId, anyISODateTime, anyUuid, stringMatching} = matchers;

const tierSnapshot = {
    id: anyObjectId,
    created_at: anyISODateTime,
    updated_at: anyISODateTime
};

const buildPostSnapshotWithTiers = ({published, tiersCount}) => {
    return {
        id: anyObjectId,
        uuid: anyUuid,
        comment_id: anyObjectId,
        published_at: published ? anyISODateTime : null,
        created_at: anyISODateTime,
        updated_at: anyISODateTime,
        // @TODO: hack here! it's due to https://github.com/TryGhost/Toolbox/issues/341
        //        this matcher should be removed once the issue is solved
        url: stringMatching(/http:\/\/127.0.0.1:2369\/\w+\//),
        tiers: new Array(tiersCount).fill(tierSnapshot)
    };
};

const buildPreviousPostSnapshotWithTiers = ({tiersCount}) => {
    return {
        updated_at: anyISODateTime,
        tiers: new Array(tiersCount).fill(tierSnapshot)
    };
};

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
        const webhookURL = 'https://test-webhook-receiver.com/post-published/';
        await webhookMockReceiver.mock(webhookURL);
        await fixtureManager.insertWebhook({
            event: 'post.published',
            url: webhookURL
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
            // TODO: implement header matching feature next!
            // .matchHeaderSnapshot();
            .matchBodySnapshot({
                post: {
                    current: buildPostSnapshotWithTiers({
                        published: true,
                        tiersCount: 2
                    }),
                    previous: buildPreviousPostSnapshotWithTiers({tiersCount: 2})
                }
            });
    });

    it('post.added even is triggered', async function () {
        const webhookURL = 'https://test-webhook-receiver.com/post-added/';
        await webhookMockReceiver.mock(webhookURL);
        await fixtureManager.insertWebhook({
            event: 'post.added',
            url: webhookURL
        });

        await adminAPIAgent
            .post('posts/')
            .body({
                posts: [{
                    title: 'testing post.added webhook',
                    status: 'draft'
                }]
            })
            .expectStatus(201);

        await webhookMockReceiver
            // TODO: implement header matching feature next!
            // .matchHeaderSnapshot();
            .matchBodySnapshot({
                post: {
                    current: buildPostSnapshotWithTiers({
                        published: false,
                        tiersCount: 2
                    })
                }
            });
    });
});
