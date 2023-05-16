const {
    agentProvider,
    fixtureManager,
    mockManager
} = require('../../utils/e2e-framework');

describe.only('Collections API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users');
        await agent.loginAsOwner();
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('Can browse Collections', async function () {
        await agent
            .get('/collections/')
            .expectStatus(200)
            .matchHeaderSnapshot()
            .matchBodySnapshot();
    });
});
