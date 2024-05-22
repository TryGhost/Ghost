const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyISODateTime, anyObjectId} = matchers;

const collectionMatcher = {
    id: anyObjectId,
    created_at: anyISODateTime,
    updated_at: anyISODateTime
};

describe('Collections Content API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getContentAPIAgent();
        await fixtureManager.init('users', 'api_keys');
        await agent.authenticate();
    });

    it('Can request a collection by slug and id', async function () {
        const {body: {collections: [collection]}} = await agent
            .get(`collections/slug/featured`)
            .expectStatus(200)
            .matchBodySnapshot({
                collections: [collectionMatcher]
            });

        await agent
            .get(`collections/${collection.id}`)
            .expectStatus(200)
            .matchBodySnapshot({
                collections: [collectionMatcher]
            });
    });
});
