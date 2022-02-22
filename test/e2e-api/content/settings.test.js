const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');

describe('Settings Content API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getContentAPIAgent();
        await fixtureManager.init('api_keys');
        agent.authenticate();
    });

    it('Can request settings', async function () {
        await agent.get('settings/')
            .expectStatus(200)
            .matchHeaderSnapshot()
            .matchBodySnapshot();
    });
});
