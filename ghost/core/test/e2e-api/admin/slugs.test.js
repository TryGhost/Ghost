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

    it('Will increment the slug if there is a collision', async function () {
        await agent
            .get('slugs/post/integrations/')
            .expectStatus(200)
            .matchBodySnapshot()
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Can handle collisions of the same resource if an id is provided', async function () {
        await agent
            .get('slugs/post/integrations/6194d3ce51e2700162531a71')
            .expectStatus(200)
            .matchBodySnapshot()
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Can handle collisions of a different resource if an id is provided', async function () {
        await agent
            .get('slugs/post/integrations/000000000000000000000000')
            .expectStatus(200)
            .matchBodySnapshot()
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });
});
