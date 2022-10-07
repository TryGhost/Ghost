const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyEtag, anyISODate, anyObjectId} = matchers;

let agent;

describe('Stats API', function () {
    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('posts', 'members');
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

    describe('Post attribution stats', function () {
        it('Can fetch attribution stats', async function () {
            await agent
                .get(`/stats/referrers/posts/${fixtureManager.get('posts', 1).id}/`)
                .expectStatus(200)
                .matchBodySnapshot({
                    stats: [
                        {
                            source: 'Direct',
                            signups: 2,
                            paid_conversions: 1
                        },
                        {
                            source: 'Twitter',
                            signups: 1,
                            paid_conversions: 0
                        }
                    ],
                    meta: {}
                });
        });
    });

    describe('Referrer source history stats', function () {
        it('Can fetch attribution stats', async function () {
            await agent
                .get(`/stats/referrers/`)
                .expectStatus(200)
                .matchBodySnapshot({
                    stats: [
                        {
                            date: anyISODate,
                            source: 'Direct',
                            signups: 4,
                            paid_conversions: 1
                        },
                        {
                            date: anyISODate,
                            source: 'Twitter',
                            signups: 4,
                            paid_conversions: 2
                        }
                    ],
                    meta: {}
                });
        });
    });
});
