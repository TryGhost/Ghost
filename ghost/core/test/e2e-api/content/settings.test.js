const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyEtag, anyContentLength, anyContentVersion, anyUuid, anyString, anyObject} = matchers;

const settingsMatcher = {
    version: anyString,
    labs: anyObject,
    site_uuid: anyUuid
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
