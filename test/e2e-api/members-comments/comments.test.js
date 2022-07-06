const {agentProvider, mockManager, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyEtag, anyObjectId, anyLocationFor, anyISODateTime, anyUuid} = matchers;

let membersAgent, membersService, postId;

describe('Comments API', function () {
    before(async function () {
        membersAgent = await agentProvider.getMembersAPIAgent();

        await fixtureManager.init('posts', 'members');
        //await fixtureManager.init('comments');

        postId = fixtureManager.get('posts', 0).id;
    });

    afterEach(function () {
        mockManager.restore();
    });

    describe('when not authenticated', function () {
        it('can browse posts');
    });

    describe('when authenticated', function () {
        before(async function () {
            await membersAgent.loginAs('member@example.com');
        });

        it('Can comment on a post', async function () {
            const {body} = await membersAgent
                .post(`/api/comments/`)
                .body({comments: [{
                    post_id: postId,
                    html: 'This is a message'
                }]})
                .expectStatus(201)
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    location: anyLocationFor('comments')
                })
                .matchBodySnapshot({
                    comments: [{
                        id: anyObjectId,
                        member_id: anyObjectId,
                        post_id: anyObjectId,
                        created_at: anyISODateTime,
                        updated_at: anyISODateTime
                    }]
                });
        });

        it('Can browse all comments of a post', async function () {
            const {body} = await membersAgent
                .get(`/api/comments/?filter=post_id:${postId}&include=member`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    comments: [{
                        id: anyObjectId,
                        member_id: anyObjectId,
                        member: {
                            id: anyObjectId,
                            created_at: anyISODateTime,
                            updated_at: anyISODateTime,
                            uuid: anyUuid
                        },
                        post_id: anyObjectId,
                        created_at: anyISODateTime,
                        updated_at: anyISODateTime
                    }]
                });
        });
    });
});
