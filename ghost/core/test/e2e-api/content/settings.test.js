const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyEtag, anyContentLength, anyContentVersion} = matchers;

const settingsMatcher = {
    version: matchers.anyString
};

describe('Settings Content API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getContentAPIAgent();
        await fixtureManager.init('api_keys');
        await agent.authenticate();
    });

    it('Can request settings', async function () {
        await agent.get('settings/')
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag,
                'content-version': anyContentVersion,
                'content-length': anyContentLength
            })
            .matchBodySnapshot({
                settings: settingsMatcher
            });
    });
});
