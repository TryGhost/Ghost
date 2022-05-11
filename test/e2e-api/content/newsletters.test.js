const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');

const newsletterSnapshot = {
    id: matchers.anyObjectId,
    uuid: matchers.anyUuid,
    name: matchers.anyString,
    slug: matchers.anyString,
    created_at: matchers.anyISODateTime,
    updated_at: matchers.anyISODateTime,
    sort_order: matchers.anyNumber
};

describe('Newsletters Content API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getContentAPIAgent();
        await fixtureManager.init('api_keys', 'newsletters');
        agent.authenticate();
    });

    it('Can request only active newsletters', async function () {
        await agent.get('/newsletters/')
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: matchers.anyEtag
            })
            .matchBodySnapshot({
                newsletters: Array(3).fill(newsletterSnapshot)
            });
    });

    it('Cannot override filters to fetch archived newsletters', async function () {
        await agent.get('/newsletters/?filter=status:archived')
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: matchers.anyEtag
            })
            .matchBodySnapshot({
                newsletters: Array(3).fill(newsletterSnapshot)
            });
    });
});
