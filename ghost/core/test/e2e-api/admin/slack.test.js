const {agentProvider, fixtureManager, matchers, mockManager} = require('../../utils/e2e-framework');
const {anyContentVersion, anyEtag} = matchers;

describe('Slack API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init();
        await agent.loginAsOwner();

        mockManager.mockEvents();
    });

    after(function () {
        mockManager.restore();
    });

    it('Can post slack test', async function () {
        await agent
            .post('slack/test/')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot();

        mockManager.assert.emittedEvent('slack.test');
    });
});
