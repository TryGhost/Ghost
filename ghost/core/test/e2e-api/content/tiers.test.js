const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');

describe('Tiers Content API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getContentAPIAgent();
        await fixtureManager.init('members', 'api_keys', 'tiers:archived');
        await agent.authenticate();
    });

    it('Can request only active tiers', async function () {
        await agent.get('/tiers/?include=monthly_price')
            .expectStatus(200)
            .matchHeaderSnapshot({
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
