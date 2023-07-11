const {agentProvider, fixtureManager, mockManager, matchers} = require('../../utils/e2e-framework');
const {anyObjectId, anyISODateTime, anyString} = matchers;

const matchMentionShallowIncludes = {
    id: anyObjectId,
    source: anyString,
    target: anyString,
    timestamp: anyISODateTime,
    source_title: anyString
};

describe('Mentions API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        mockManager.mockLabsEnabled('webmentions');
        // TODO: test various users' access
        await fixtureManager.init('users','mentions');
        await agent.loginAsOwner();
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('Can browse with limits', async function () {
        await agent.get('mentions/?limit=2')
            .expectStatus(200)
            .matchBodySnapshot({
                mentions: new Array(2).fill(matchMentionShallowIncludes)
            });
    });

    it('Cannot browse when lab disabled', async function () {
        mockManager.mockLabsDisabled('webmentions');
        await agent.get('mentions/')
            .expectStatus(404);
    });
});
