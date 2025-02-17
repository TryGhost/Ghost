const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyContentVersion, anyEtag} = matchers;

describe('Slug API', function () {
    /** @type {import('../../utils/agents').AdminAPITestAgent} */
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init();
        await agent.loginAsOwner();
    });

    it('Can generate a slug', async function () {
        await agent
            .get('slugs/post/a post title/')
            .expectStatus(200)
            .matchBodySnapshot()
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });
});
