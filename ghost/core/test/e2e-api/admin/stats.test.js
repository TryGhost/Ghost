const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyEtag, anyISODate, anyObjectId} = matchers;

let agent;

describe('Stats API', function () {
    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('members');
        await agent.loginAsOwner();
    });

    it('Can fetch member count history', async function () {
        await agent
            .get(`/stats/member_count`)
            .expectStatus(200)
            .matchBodySnapshot({
                stats: [{
                    date: anyISODate
                }]
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can fetch MRR history', async function () {
        await agent
            .get(`/stats/mrr`)
            .expectStatus(200)
            .matchBodySnapshot({
                stats: [{
                    date: anyISODate
                }, {
                    date: anyISODate
                }]
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });

    it('Can fetch subscriptions history', async function () {
        await agent
            .get(`/stats/subscriptions`)
            .expectStatus(200)
            .matchBodySnapshot({
                stats: [{
                    date: anyISODate,
                    tier: anyObjectId
                }, {
                    date: anyISODate,
                    tier: anyObjectId
                }],
                meta: {
                    tiers: [anyObjectId],
                    totals: [{
                        tier: anyObjectId
                    }]
                }
            })
            .matchHeaderSnapshot({
                etag: anyEtag
            });
    });
});
