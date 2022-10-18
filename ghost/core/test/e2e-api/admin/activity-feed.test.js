const {agentProvider, mockManager, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyEtag, anyObjectId, anyUuid, anyISODate, anyString, anyObject, anyNumber} = matchers;

const assert = require('assert');

let agent;
describe('Activity Feed API', function () {
    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('posts', 'newsletters', 'members:newsletters', 'comments', 'redirects', 'clicks', 'feedback');
        await agent.loginAsOwner();
    });

    beforeEach(function () {
        mockManager.mockStripe();
        mockManager.mockMail();
    });

    afterEach(function () {
        mockManager.restore();
    });

    // Activity feed
    it('Returns comments in activity feed', async function () {
        // Check activity feed
        await agent
            .get(`/members/events?filter=type:comment_event`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot({
                events: new Array(2).fill({
                    type: anyString,
                    data: anyObject
                })
            })
            .expect(({body}) => {
                assert(body.events.find(e => e.type === 'comment_event'), 'Expected a comment event');
                assert(!body.events.find(e => e.type !== 'comment_event'), 'Expected only comment events');
            });
    });

    it('Returns click events in activity feed', async function () {
        // Check activity feed
        await agent
            .get(`/members/events?filter=type:click_event`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot({
                events: new Array(8).fill({
                    type: anyString,
                    data: {
                        created_at: anyISODate,
                        member: {
                            id: anyObjectId,
                            uuid: anyUuid
                        },
                        post: {
                            id: anyObjectId,
                            uuid: anyUuid,
                            url: anyString
                        }
                    }
                })
            })
            .expect(({body}) => {
                assert(body.events.find(e => e.type === 'click_event'), 'Expected a click event');
                assert(!body.events.find(e => e.type !== 'click_event'), 'Expected only click events');
            });
    });

    it('Returns feedback events in activity feed', async function () {
        // Check activity feed
        await agent
            .get(`/members/events?filter=type:feedback_event`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot({
                events: new Array(8).fill({
                    type: anyString,
                    data: {
                        created_at: anyISODate,
                        id: anyObjectId,
                        member: {
                            id: anyObjectId,
                            uuid: anyUuid
                        },
                        post: {
                            id: anyObjectId,
                            uuid: anyUuid,
                            url: anyString
                        },
                        score: anyNumber
                    }
                })
            })
            .expect(({body}) => {
                assert(body.events.find(e => e.type === 'feedback_event'), 'Expected a feedback event');
                assert(!body.events.find(e => e.type !== 'feedback_event'), 'Expected only feedback events');
            });
    });

    it('Returns signup events in activity feed', async function () {
        // Check activity feed
        await agent
            .get(`/members/events?filter=type:signup_event`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot({
                events: new Array(8).fill({
                    type: anyString,
                    data: anyObject
                })
            })
            .expect(({body}) => {
                assert(body.events.find(e => e.type === 'signup_event'), 'Expected a signup event');
                assert(!body.events.find(e => e.type !== 'signup_event'), 'Expected only signup events');
            });
    });

    it('Can filter events by post id', async function () {
        const postId = fixtureManager.get('posts', 0).id;
        await agent
            .get(`/members/events?filter=data.post_id:${postId}`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot({
                events: new Array(8).fill({
                    type: anyString,
                    data: anyObject
                })
            })
            .expect(({body}) => {
                assert(!body.events.find(e => (e.data?.post?.id ?? e.data?.attribution?.id) !== postId), 'Should only return events for the post');

                // Check all post_id event types are covered by this test
                assert(body.events.find(e => e.type === 'click_event'), 'Expected a click event');
                assert(body.events.find(e => e.type === 'comment_event'), 'Expected a comment event');
                assert(body.events.find(e => e.type === 'feedback_event'), 'Expected a feedback event');
                assert(body.events.find(e => e.type === 'signup_event'), 'Expected a signup event');
                assert(body.events.find(e => e.type === 'subscription_event'), 'Expected a subscription event');

                // Assert total is correct
                assert.equal(body.meta.pagination.total, 8);
            });
    });

    it('Can limit events', async function () {
        const postId = fixtureManager.get('posts', 0).id;
        await agent
            .get(`/members/events?filter=data.post_id:${postId}&limit=2`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot({
                events: new Array(2).fill({
                    type: anyString,
                    data: anyObject
                })
            })
            .expect(({body}) => {
                assert(!body.events.find(e => (e.data?.post?.id ?? e.data?.attribution?.id) !== postId), 'Should only return events for the post');

                // Assert total is correct
                assert.equal(body.meta.pagination.total, 8);
            });
    });
});
