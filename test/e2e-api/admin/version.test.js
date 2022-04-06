const {agentProvider, matchers} = require('../../utils/e2e-framework');
const {anyString, stringMatching} = matchers;

describe('API Versioning', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
    });

    it('responds with no content version header when accept version header is NOT PRESENT', async function () {
        await agent
            .get('site/')
            .matchHeaderSnapshot({
                etag: anyString
            });
    });

    it('responds with current content version header when requested version is behind current version with no known changes', async function () {
        await agent
            .get('site/')
            .header('Accept-Version', 'v3.0')
            .matchHeaderSnapshot({
                etag: anyString,
                'content-version': stringMatching(/v\d+\.\d+/)
            });
    });
});
