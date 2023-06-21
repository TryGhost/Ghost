const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');

describe('Tiers Content API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getContentAPIAgent();
        await fixtureManager.init('members', 'api_keys', 'tiers:archived', 'tiers:hidden');
        await agent.authenticate();
    });

    it('Can request only active tiers', async function () {
        await agent.get('/tiers/?include=monthly_price')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': matchers.anyContentVersion,
                etag: matchers.anyEtag
            })
            .matchBodySnapshot({
                tiers: Array(3).fill({
                    id: matchers.anyObjectId,
                    created_at: matchers.anyISODate,
                    updated_at: matchers.anyISODate
                })
            });
    });

    it('Can filter on visibility', async function () {
        await agent.get('/tiers/?filter=visibility:public')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': matchers.anyContentVersion,
                etag: matchers.anyEtag
            })
            .matchBodySnapshot({
                tiers: Array(2).fill({
                    id: matchers.anyObjectId,
                    created_at: matchers.anyISODate,
                    updated_at: matchers.anyISODate
                })
            });
    });
});
