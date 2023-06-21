const {agentProvider, mockManager, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyEtag, anyErrorId, anyObjectId, anyContentLength, anyContentVersion, anyUuid, anyISODate, anyString, anyObject, anyNumber} = matchers;

const assert = require('assert/strict');
const moment = require('moment');
const sinon = require('sinon');
const logging = require('@tryghost/logging');

let agent;

async function testPagination(skippedTypes, postId, totalExpected, limit) {
    const postFilter = postId ? `+data.post_id:${postId}` : '';

    // To make the test cover more edge cases, we test different limit configurations
    const {body: firstPage} = await agent
        .get(`/members/events?filter=${encodeURIComponent(`type:-[${skippedTypes.join(',')}]${postFilter}`)}&limit=${limit}`)
        .expectStatus(200)
        .matchHeaderSnapshot({
            etag: anyEtag,
            'content-version': anyContentVersion,
            'content-length': anyContentLength // Depending on random conditions (ID generation) the order of events can change
        })
        .matchBodySnapshot({
            events: new Array(limit).fill({
                type: anyString,
                data: anyObject
            })
        })
        .expect(({body}) => {
            if (postId) {
                assert(!body.events.find(e => (e.data?.post?.id ?? e.data?.attribution?.id ?? e.data?.email?.post_id) !== postId && e.type !== 'aggregated_click_event'), 'Should only return events for the post');
            }

            // Assert total is correct
            assert.equal(body.meta.pagination.total, totalExpected, 'Expected total of ' + totalExpected + ' at limit ' + limit);
        });
    let previousPage = firstPage;
    let page = 1;

    const allEvents = previousPage.events;

    while (allEvents.length < totalExpected && page < 50) {
        page += 1;

        // Calculate next page
        let lastId = previousPage.events[previousPage.events.length - 1].data.id;
        let lastCreatedAt = moment(previousPage.events[previousPage.events.length - 1].data.created_at).format('YYYY-MM-DD HH:mm:ss');

        const remaining = totalExpected - (page - 1) * limit;

        const {body: secondPage} = await agent
            .get(`/members/events?filter=${encodeURIComponent(`type:-[${skippedTypes.join(',')}]${postFilter}+(data.created_at:<'${lastCreatedAt}',(data.created_at:'${lastCreatedAt}'+id:<${lastId}))`)}&limit=${limit}`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag,
                'content-version': anyContentVersion,
                'content-length': anyContentLength // Depending on random conditions (ID generation) the order of events can change
            })
            .matchBodySnapshot({
                events: new Array(Math.min(remaining, limit)).fill({
                    type: anyString,
                    data: anyObject
                })
            })
            .expect(({body}) => {
                if (postId) {
                    assert(!body.events.find(e => (e.data?.post?.id ?? e.data?.attribution?.id ?? e.data?.email?.post_id) !== postId && e.type !== 'aggregated_click_event'), 'Should only return events for the post');
                }

                // Assert total is correct
                assert.equal(body.meta.pagination.total, remaining, 'Expected total to be correct for page ' + page + ' with limit ' + limit);
            });
        allEvents.push(...secondPage.events);
    }

    // Check if the ordering is correct and we didn't receive duplicate events
    assert.equal(allEvents.length, totalExpected, 'Total actually received should match the total');
    for (const event of allEvents) {
        // Check no other events have the same id
        assert.equal(allEvents.filter(e => e.data.id === event.data.id).length, 1);
    }
}

describe('Activity Feed API', function () {
    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('posts', 'newsletters', 'members:newsletters', 'comments', 'redirects', 'clicks', 'feedback', 'members:emails');
        await agent.loginAsOwner();
    });

    beforeEach(function () {
        mockManager.mockMail();
    });

    afterEach(function () {
        mockManager.restore();
        sinon.restore();
    });

    describe('Filter splitting', function () {
        it('Can use NQL OR for type only', async function () {
            // Check activity feed
            await agent
                .get(`/members/events?filter=type:comment_event,type:click_event`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    'content-version': anyContentVersion
                })
                .matchBodySnapshot({
                    events: new Array(10).fill({
                        type: anyString,
                        data: anyObject
                    })
                })
                .expect(({body}) => {
                    assert(!body.events.find(e => e.type !== 'click_event' && e.type !== 'comment_event'), 'Expected only click and comment events');
                });
        });

        it('Cannot combine type filter with OR filter', async function () {
            // This query is not allowed because we need to split the filter in two AND filters
            const loggingStub = sinon.stub(logging, 'error');
            await agent
                .get(`/members/events?filter=type:comment_event,data.post_id:123`)
                .expectStatus(400)
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    'content-version': anyContentVersion
                })
                .matchBodySnapshot({
                    errors: [
                        {
                            id: anyErrorId
                        }
                    ]
                });
            sinon.assert.calledOnce(loggingStub);
        });

        it('Can only combine type and other filters at the root level', async function () {
            const loggingStub = sinon.stub(logging, 'error');
            await agent
                .get(`/members/events?filter=${encodeURIComponent('(type:comment_event+data.post_id:123)+data.post_id:123')}`)
                .expectStatus(400)
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    'content-version': anyContentVersion
                })
                .matchBodySnapshot({
                    errors: [
                        {
                            id: anyErrorId
                        }
                    ]
                });
            sinon.assert.calledOnce(loggingStub);
        });

        it('Can use OR as long as it is not combined with type', async function () {
            const postId = fixtureManager.get('posts', 0).id;
            const memberId = fixtureManager.get('members', 0).id;

            await agent
                .get(`/members/events?filter=${encodeURIComponent(`data.post_id:${postId},data.member_id:${memberId}`)}`)
                .expectStatus(200)
                .matchBodySnapshot({
                    events: new Array(10).fill({
                        type: anyString,
                        data: anyObject
                    })
                })
                .expect(({body}) => {
                    assert(!body.events.find(e => (e.data?.post?.id ?? e.data?.attribution?.id ?? e.data?.email?.post_id) !== postId && e.data?.member?.id !== memberId), 'Expected only events either from the given post or member');
                });
        });

        it('Can AND two ORs', async function () {
            const postId = fixtureManager.get('posts', 0).id;
            const memberId = fixtureManager.get('members', 0).id;

            await agent
                .get(`/members/events?filter=${encodeURIComponent(`(type:comment_event,type:click_event)+(data.post_id:${postId},data.member_id:${memberId})`)}`)
                .expectStatus(200)
                .matchBodySnapshot({
                    events: new Array(3).fill({
                        type: anyString,
                        data: anyObject
                    })
                })
                .expect(({body}) => {
                    assert(!body.events.find(e => e.type !== 'click_event' && e.type !== 'comment_event'), 'Expected only click and comment events');
                    assert(!body.events.find(e => (e.data?.post?.id ?? e.data?.attribution?.id ?? e.data?.email?.post_id) !== postId && e.data?.member?.id !== memberId), 'Expected only events either from the given post or member');
                });
        });
    });

    describe('Filter-based pagination', function () {
        it('Can do filter based pagination for all posts', async function () {
            // There is an annoying restriction in the pagination. It doesn't work for mutliple email events at the same time because they have the same id (causes issues as we use id to deduplicate the created_at timestamp)
            // If that is ever fixed (it is difficult) we can update this test to not use a filter
            // Same for click_event and aggregated_click_event (use same id)
            const skippedTypes = ['email_opened_event', 'email_failed_event', 'email_delivered_event', 'aggregated_click_event'];
            await testPagination(skippedTypes, null, 36, 36);
        });

        it('Can do filter based pagination for one post', async function () {
            const postId = fixtureManager.get('posts', 0).id;

            // There is an annoying restriction in the pagination. It doesn't work for mutliple email events at the same time because they have the same id (causes issues as we use id to deduplicate the created_at timestamp)
            // If that is ever fixed (it is difficult) we can update this test to not use a filter
            // Same for click_event and aggregated_click_event (use same id)
            const skippedTypes = ['email_opened_event', 'email_failed_event', 'email_delivered_event', 'aggregated_click_event'];

            await testPagination(skippedTypes, postId, 12, 10);
        });

        it('Can do filter based pagination for aggregated clicks for one post', async function () {
            // Same as previous but with aggregated clicks instead of normal click events + email_delivered_events instead of sent events
            const postId = fixtureManager.get('posts', 0).id;
            const skippedTypes = ['email_opened_event', 'email_failed_event', 'email_sent_event', 'click_event'];

            await testPagination(skippedTypes, postId, 9, 8);
        });

        it('Can do filter based pagination for aggregated clicks for all posts', async function () {
            // Same as previous but with aggregated clicks instead of normal click events + email_delivered_events instead of sent events
            const skippedTypes = ['email_opened_event', 'email_failed_event', 'email_sent_event', 'click_event'];
            await testPagination(skippedTypes, null, 33, 32);
        });
    });

    // Activity feed
    it('Returns comments in activity feed', async function () {
        // Check activity feed
        await agent
            .get(`/members/events?filter=type:comment_event`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag,
                'content-version': anyContentVersion
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
                etag: anyEtag,
                'content-version': anyContentVersion
            })
            .matchBodySnapshot({
                events: new Array(8).fill({
                    type: anyString,
                    data: {
                        id: anyObjectId,
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
                etag: anyEtag,
                'content-version': anyContentVersion
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
                etag: anyEtag,
                'content-version': anyContentVersion
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

    it('Returns email sent events in activity feed', async function () {
        // Check activity feed
        await agent
            .get(`/members/events?filter=type:email_sent_event`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag,
                'content-version': anyContentVersion
            })
            .matchBodySnapshot({
                events: new Array(4).fill({
                    type: anyString,
                    data: anyObject
                })
            })
            .expect(({body}) => {
                assert(body.events.find(e => e.type === 'email_sent_event'), 'Expected an email sent event');
                assert(!body.events.find(e => e.type !== 'email_sent_event'), 'Expected only email sent events');
            });
    });

    it('Returns email delivered events in activity feed', async function () {
        // Check activity feed
        await agent
            .get(`/members/events?filter=type:email_delivered_event`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag,
                'content-version': anyContentVersion
            })
            .matchBodySnapshot({
                events: new Array(1).fill({
                    type: anyString,
                    data: anyObject
                })
            })
            .expect(({body}) => {
                assert(body.events.find(e => e.type === 'email_delivered_event'), 'Expected an email delivered event');
                assert(!body.events.find(e => e.type !== 'email_delivered_event'), 'Expected only email delivered events');
            });
    });

    it('Returns email opened events in activity feed', async function () {
        // Check activity feed
        await agent
            .get(`/members/events?filter=type:email_opened_event`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag,
                'content-version': anyContentVersion
            })
            .matchBodySnapshot({
                events: new Array(1).fill({
                    type: anyString,
                    data: anyObject
                })
            })
            .expect(({body}) => {
                assert(body.events.find(e => e.type === 'email_opened_event'), 'Expected an email opened event');
                assert(!body.events.find(e => e.type !== 'email_opened_event'), 'Expected only email opened events');
            });
    });

    it('Can filter events by post id', async function () {
        const postId = fixtureManager.get('posts', 0).id;

        await agent
            .get(`/members/events?filter=data.post_id:${postId}&limit=20`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag,
                'content-version': anyContentVersion
            })
            .matchBodySnapshot({
                events: new Array(15).fill({
                    type: anyString,
                    data: anyObject
                })
            })
            .expect(({body}) => {
                assert(!body.events.find(e => (e.data?.post?.id ?? e.data?.attribution?.id ?? e.data?.email?.post_id) !== postId && e.type !== 'aggregated_click_event'), 'Should only return events for the post');

                // Check all post_id event types are covered by this test
                assert(body.events.find(e => e.type === 'click_event'), 'Expected a click event');
                assert(body.events.find(e => e.type === 'comment_event'), 'Expected a comment event');
                assert(body.events.find(e => e.type === 'aggregated_click_event'), 'Expected an aggregated click event');
                assert(body.events.find(e => e.type === 'feedback_event'), 'Expected a feedback event');
                assert(body.events.find(e => e.type === 'signup_event'), 'Expected a signup event');
                assert(body.events.find(e => e.type === 'subscription_event'), 'Expected a subscription event');
                assert(body.events.find(e => e.type === 'email_delivered_event'), 'Expected an email delivered event');
                assert(body.events.find(e => e.type === 'email_sent_event'), 'Expected an email sent event');
                assert(body.events.find(e => e.type === 'email_opened_event'), 'Expected an email opened event');

                // Assert total is correct
                assert.equal(body.meta.pagination.total, 15);
            });
    });

    it('Can limit events', async function () {
        const postId = fixtureManager.get('posts', 0).id;
        await agent
            .get(`/members/events?filter=data.post_id:${postId}&limit=2`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag,
                'content-version': anyContentVersion,
                'content-length': anyContentLength // Depending on random conditions (ID generation) the order of events can change
            })
            .matchBodySnapshot({
                events: new Array(2).fill({
                    type: anyString,
                    data: anyObject
                })
            })
            .expect(({body}) => {
                assert(!body.events.find(e => (e.data?.post?.id ?? e.data?.attribution?.id ?? e.data?.email?.post_id) !== postId), 'Should only return events for the post');

                // Assert total is correct
                assert.equal(body.meta.pagination.total, 15);
            });
    });
});
