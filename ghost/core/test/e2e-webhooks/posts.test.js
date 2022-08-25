const {agentProvider, mockManager, fixtureManager, matchers} = require('../utils/e2e-framework');
const {anyObjectId, anyISODateTime, anyUuid, stringMatching} = matchers;

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

    // NOTE: this is such a bad hack! for the reasons I did not investigate the "add" event does not include
    //       the roles but the "published" does! massive inconsistency and needs to be fixed one day
    if (roles) {
        authorSnapshot.roles = new Array(1).fill({
            id: anyObjectId,
            created_at: anyISODateTime,
            updated_at: anyISODateTime
        });
    }

    return authorSnapshot;
};

const buildPostSnapshotWithTiers = ({published, tiersCount, roles = false}) => {
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
        tiers: new Array(tiersCount).fill(tierSnapshot),
        primary_author: buildAuthorSnapshot(roles),
        authors: new Array(1).fill(buildAuthorSnapshot(roles))
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

    it('post.published event is triggered', async function () {
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
                        tiersCount: 2,
                        roles: true
                    }),
                    previous: buildPreviousPostSnapshotWithTiers({
                        tiersCount: 2
                    })
                }
            });
    });

    it('post.added event is triggered', async function () {
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
