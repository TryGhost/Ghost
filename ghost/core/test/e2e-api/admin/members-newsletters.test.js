const {agentProvider, mockManager, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyEtag, anyObjectId, anyUuid, anyISODateTime, anyISODate, anyString, anyArray, anyLocationFor, anyErrorId} = matchers;

const memberMatcherShallowIncludesForNewsletters = {
    id: anyObjectId,
    uuid: anyUuid,
    created_at: anyISODateTime,
    updated_at: anyISODateTime,
    subscriptions: anyArray,
    labels: anyArray,
    newsletters: anyArray
};

let agent;

describe('Members API - With Newsletters', function () {
    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('newsletters', 'members:newsletters');
        await agent.loginAsOwner();
    });

    afterEach(function () {
        mockManager.restore();
    });

    // List Members

    it('Can fetch members who are subscribed', async function () {
        await agent
            .get('/members/?filter=newsletters.status:active')
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(6).fill(memberMatcherShallowIncludesForNewsletters)
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can fetch members who are NOT subscribed', async function () {
        await agent
            .get('/members/?filter=newsletters.status:-active')
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(2).fill(memberMatcherShallowIncludesForNewsletters)
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });
});

describe('Members API - With Newsletters - compat mode', function () {
    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('newsletters', 'members:newsletters');
        await agent.loginAsOwner();
    });

    afterEach(function () {
        mockManager.restore();
    });

    // List Members

    it('Can fetch members who are subscribed', async function () {
        await agent
            .get('/members/?filter=subscribed:true')
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(6).fill(memberMatcherShallowIncludesForNewsletters)
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can fetch members who are NOT subscribed', async function () {
        await agent
            .get('/members/?filter=subscribed:false')
            .expectStatus(200)
            .matchBodySnapshot({
                members: new Array(2).fill(memberMatcherShallowIncludesForNewsletters)
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });
});
