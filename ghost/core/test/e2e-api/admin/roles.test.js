const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyContentVersion, anyEtag, anyISODateTime, anyObjectId} = matchers;

const rolesObjectMatcher = {
    id: anyObjectId,
    created_at: anyISODateTime,
    updated_at: anyISODateTime
};

describe('Roles API', function () {
    /** @type {import('../../utils/agents').AdminAPITestAgent} */
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init();
        await agent.loginAsOwner();
    });

    it('Can request all roles', async function () {
        await agent.get('roles/')
            .expectStatus(200)
            .matchBodySnapshot({
                roles: Array(11).fill(rolesObjectMatcher)
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Can request roles which i am able to assign to other users', async function () {
        await agent.get('roles/?permissions=assign')
            .expectStatus(200)
            .matchBodySnapshot({
                roles: Array(5).fill(rolesObjectMatcher)
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });
});
