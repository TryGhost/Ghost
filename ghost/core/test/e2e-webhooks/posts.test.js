const moment = require('moment-timezone');
const {agentProvider, mockManager, fixtureManager, matchers} = require('../utils/e2e-framework');
const {anyGhostAgent, anyObjectId, anyISODateTime, anyUuid, anyContentVersion, anyNumber, anyLocalURL, anyString} = matchers;

const tierSnapshot = {
    id: anyObjectId,
    created_at: anyISODateTime,
    updated_at: anyISODateTime
};

const tagSnapshot = {
    created_at: anyISODateTime,
    description: null,
    id: anyObjectId,
    name: anyString,
    slug: anyString,
    updated_at: anyISODateTime,
    url: anyLocalURL,
    visibility: anyString
};

const buildAuthorSnapshot = (roles = true) => {
    const authorSnapshot = {
        last_seen: anyISODateTime,
        created_at: anyISODateTime,
        updated_at: anyISODateTime
    };

    if (roles) {
        authorSnapshot.roles = new Array(1).fill({
            id: anyObjectId,
            created_at: anyISODateTime,
            updated_at: anyISODateTime
        });
    }

    return authorSnapshot;
};

const buildPostSnapshotWithTiers = ({published, tiersCount, roles = true}) => {
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

const buildPostSnapshotWithTiersAndTags = ({published, tiersCount, tags, roles = true}) => {
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
        authors: new Array(1).fill(buildAuthorSnapshot(roles)),
        primary_tag: tags ? tagSnapshot : null,
        tags: tags ? new Array(1).fill(tagSnapshot) : []
    };
};

const buildPreviousPostSnapshotWithTiers = ({tiersCount}) => {
    return {
        updated_at: anyISODateTime,
        tiers: new Array(tiersCount).fill(tierSnapshot)
    };
};

const buildPreviousPostSnapshotForDeletedPost = () => {
    return {
        id: anyObjectId,
        uuid: anyUuid,
        comment_id: anyObjectId,
        created_at: anyISODateTime,
        updated_at: anyISODateTime,
        authors: new Array(1).fill(buildAuthorSnapshot(true))
    };
};

const buildPreviousPostSnapshotWithTiersAndTags = ({tiersCount, tags}) => {
    const previousSnapshot = {
        tags: tags ? new Array(1).fill(tagSnapshot) : []
    };

    if (tiersCount > 0){
        previousSnapshot.tiers = new Array(tiersCount).fill(tierSnapshot);
    }

    return previousSnapshot;
};

const buildPreviousPostSnapshotWithTiersPublished = ({tiersCount, published}) => {
    return {
        updated_at: anyISODateTime,
        published_at: published ? anyISODateTime : null,
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
                    status: 'draft',
                    mobiledoc: fixtureManager.get('posts', 1).mobiledoc
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

        await webhookMockReceiver.receivedRequest();

        webhookMockReceiver
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                'content-length': anyNumber,
                'user-agent': anyGhostAgent
            })
            .matchBodySnapshot({
                post: {
                    current: buildPostSnapshotWithTiers({
                        published: true,
                        tiersCount: 2
                    }),
                    previous: buildPreviousPostSnapshotWithTiers({
                        tiersCount: 2
                    })
                }
            });
    });

    it('post.unpublished event is triggered', async function () {
        const webhookURL = 'https://test-webhook-receiver.com/post-unpublished/';
        await webhookMockReceiver.mock(webhookURL);
        await fixtureManager.insertWebhook({
            event: 'post.unpublished',
            url: webhookURL
        });

        const res = await adminAPIAgent
            .post('posts/')
            .body({
                posts: [
                    {
                        title: 'webhookz',
                        status: 'published',
                        mobiledoc: fixtureManager.get('posts', 1).mobiledoc
                    }
                ]
            })
            .expectStatus(201);

        const id = res.body.posts[0].id;
        const updatedPost = res.body.posts[0];
        updatedPost.status = 'draft';

        await adminAPIAgent
            .put('posts/' + id)
            .body({
                posts: [updatedPost]
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
                post: {
                    current: buildPostSnapshotWithTiers({
                        published: true,
                        tiersCount: 2
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

        await webhookMockReceiver.receivedRequest();

        webhookMockReceiver
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                'content-length': anyNumber,
                'user-agent': anyGhostAgent
            })
            .matchBodySnapshot({
                post: {
                    current: buildPostSnapshotWithTiers({
                        published: false,
                        tiersCount: 2,
                        // @NOTE: post.added event does not include post author's roles
                        //        see commit message for more context
                        roles: false
                    })
                }
            });
    });

    it('post.deleted event is triggered', async function () {
        const webhookURL = 'https://test-webhook-receiver.com/post-deleted/';
        await webhookMockReceiver.mock(webhookURL);
        await fixtureManager.insertWebhook({
            event: 'post.deleted',
            url: webhookURL
        });

        const res = await adminAPIAgent
            .post('posts/')
            .body({
                posts: [{
                    title: 'testing post.deleted webhook',
                    status: 'draft'
                }]
            })
            .expectStatus(201);

        const id = res.body.posts[0].id;

        await adminAPIAgent
            .delete('posts/' + id)
            .expectStatus(204);

        await webhookMockReceiver.receivedRequest();

        webhookMockReceiver
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                'content-length': anyNumber,
                'user-agent': anyGhostAgent
            })
            .matchBodySnapshot({
                post: {
                    current: {},
                    previous: buildPreviousPostSnapshotForDeletedPost()
                }
            });
    });

    it('post.scheduled event is triggered', async function () {
        const webhookURL = 'https://test-webhook-receiver.com/post-scheduled/';
        await webhookMockReceiver.mock(webhookURL);
        await fixtureManager.insertWebhook({
            event: 'post.scheduled',
            url: webhookURL
        });

        const res = await adminAPIAgent
            .post('posts/')
            .body({
                posts: [{
                    title: 'Testing post.scheduled webhook',
                    status: 'draft'
                }]
            })
            .expectStatus(201);

        const id = res.body.posts[0].id;
        const scheduledPost = res.body.posts[0];
        scheduledPost.status = 'scheduled';
        scheduledPost.published_at = moment().add(1, 'days').toISOString();

        await adminAPIAgent
            .put('posts/' + id)
            .body({
                posts: [scheduledPost]
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
                post: {
                    current: buildPostSnapshotWithTiers({
                        published: true,
                        tiersCount: 2
                    }),
                    previous: buildPreviousPostSnapshotWithTiers({
                        tiersCount: 2
                    })
                }
            });
    });

    it('post.unscheduled event is triggered', async function () {
        const webhookURL = 'https://test-webhook-receiver.com/post-unscheduled/';
        await webhookMockReceiver.mock(webhookURL);
        await fixtureManager.insertWebhook({
            event: 'post.unscheduled',
            url: webhookURL
        });

        const published_at = moment().add(1, 'days').toISOString();
        const res = await adminAPIAgent
            .post('posts/')
            .body({
                posts: [{
                    title: 'Testing post.unscheduled webhook',
                    status: 'scheduled',
                    published_at: published_at
                }]
            })
            .expectStatus(201);

        const id = res.body.posts[0].id;
        const unrescheduledPost = res.body.posts[0];
        unrescheduledPost.status = 'draft';
        unrescheduledPost.published_at = null;

        await adminAPIAgent
            .put('posts/' + id)
            .body({
                posts: [unrescheduledPost]
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
                post: {
                    current: buildPostSnapshotWithTiers({
                        published: false,
                        tiersCount: 2
                    }),
                    previous: {
                        published_at: anyISODateTime,
                        updated_at: anyISODateTime,
                        tiers: new Array(2).fill(tierSnapshot)
                    }
                }
            });
    });

    it('post.tag.attached event is triggered', async function () {
        const webhookURL = 'https://test-webhook-receiver.com/post-tag-attached/';
        await webhookMockReceiver.mock(webhookURL);
        await fixtureManager.insertWebhook({
            event: 'post.tag.attached',
            url: webhookURL
        });

        const res = await adminAPIAgent
            .post('posts/')
            .body({
                posts: [{
                    title: 'test post tag attached webhook',
                    status: 'draft',
                    mobiledoc: fixtureManager.get('posts', 1).mobiledoc
                }]
            })
            .expectStatus(201);

        const id = res.body.posts[0].id;
        const updatedPost = res.body.posts[0];
        updatedPost.tags = ['Getting Started'];

        await adminAPIAgent
            .put('posts/' + id)
            .body({
                posts: [updatedPost]
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
                post: {
                    current: buildPostSnapshotWithTiersAndTags({
                        published: false,
                        tiersCount: 2,
                        tags: true
                    }),
                    previous: buildPreviousPostSnapshotWithTiersAndTags({
                        tiersCount: 2,
                        tags: false
                    })
                }
            });
    });

    it('post.tag.detached event is triggered', async function () {
        const webhookURL = 'https://test-webhook-receiver.com/post-tag-detached/';
        await webhookMockReceiver.mock(webhookURL);
        await fixtureManager.insertWebhook({
            event: 'post.tag.detached',
            url: webhookURL
        });

        const res = await adminAPIAgent
            .post('posts/')
            .body({
                posts: [{
                    title: 'test post tag detached webhook',
                    status: 'draft',
                    mobiledoc: fixtureManager.get('posts', 1).mobiledoc
                }]
            })
            .expectStatus(201);

        const id = res.body.posts[0].id;
        const updatedPost = res.body.posts[0];
        updatedPost.tags = ['Getting Started'];

        await adminAPIAgent
            .put('posts/' + id)
            .body({
                posts: [updatedPost]
            })
            .expectStatus(200);
        
        updatedPost.tags = [];

        await adminAPIAgent
            .put('posts/' + id)
            .body({
                posts: [updatedPost]
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
                post: {
                    current: buildPostSnapshotWithTiersAndTags({
                        published: false,
                        tiersCount: 2,
                        tags: false
                    }),
                    previous: buildPreviousPostSnapshotWithTiersAndTags({
                        tiersCount: 0,
                        tags: true
                    })
                }
            });
    });

    it('post.edited event is triggered', async function () {
        const webhookURL = 'https://test-webhook-receiver.com/post-edited/';
        await webhookMockReceiver.mock(webhookURL);
        await fixtureManager.insertWebhook({
            event: 'post.edited',
            url: webhookURL
        });

        const res = await adminAPIAgent
            .post('posts/')
            .body({
                posts: [{
                    title: 'testing post.edited webhook',
                    status: 'draft'
                }]
            })
            .expectStatus(201);

        const id = res.body.posts[0].id;
        const updatedPost = res.body.posts[0];
        updatedPost.title = 'testing post.edited webhook - Updated';

        await adminAPIAgent
            .put('posts/' + id)
            .body({
                posts: [updatedPost]
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
                post: {
                    current: buildPostSnapshotWithTiers({
                        published: false,
                        tiersCount: 2,
                        roles: true
                    }),
                    previous: buildPreviousPostSnapshotWithTiers({tiersCount: 2})
                }
            });
    });

    it('post.published.edited event is triggered', async function () {
        const webhookURL = 'https://test-webhook-receiver.com/post-published-edited/';
        await webhookMockReceiver.mock(webhookURL);
        await fixtureManager.insertWebhook({
            event: 'post.published.edited',
            url: webhookURL
        });

        const res = await adminAPIAgent
            .post('posts/')
            .body({
                posts: [{
                    title: 'testing post published edited webhook',
                    status: 'published'
                }]
            })
            .expectStatus(201);

        const id = res.body.posts[0].id;
        const updatedPost = res.body.posts[0];
        updatedPost.title = 'testing post published edited webhook - updated';

        await adminAPIAgent
            .put('posts/' + id)
            .body({
                posts: [updatedPost]
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
                post: {
                    current: buildPostSnapshotWithTiers({
                        published: true,
                        tiersCount: 2
                    }),
                    previous: buildPreviousPostSnapshotWithTiers({
                        tiersCount: 2
                    })
                }
            });
    });

    it('post.rescheduled event is triggered', async function () {
        const webhookURL = 'https://test-webhook-receiver.com/post-rescheduled/';
        await webhookMockReceiver.mock(webhookURL);
        await fixtureManager.insertWebhook({
            event: 'post.rescheduled',
            url: webhookURL
        });

        const published_at = moment().add(1, 'days').toISOString();

        const res = await adminAPIAgent
            .post('posts/')
            .body({
                posts: [{
                    title: 'testing post rescheduled webhook',
                    status: 'scheduled',
                    published_at: published_at
                }]
            })
            .expectStatus(201);

        const id = res.body.posts[0].id;
        const rescheduledPost = res.body.posts[0];
        rescheduledPost.status = 'scheduled';
        rescheduledPost.published_at = moment().add(2, 'days').toISOString();

        await adminAPIAgent
            .put('posts/' + id)
            .body({
                posts: [rescheduledPost]
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
                post: {
                    current: buildPostSnapshotWithTiers({
                        published: true,
                        tiersCount: 2,
                        roles: true
                    }),
                    previous: buildPreviousPostSnapshotWithTiersPublished({
                        tiersCount: 2,
                        published: true
                    })
                }
            });
    });
});
