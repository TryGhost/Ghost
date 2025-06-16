const {agentProvider, matchers} = require('../../utils/e2e-framework');
const {anyEtag, stringMatching, anyContentLength, anyContentVersion, anyUuid} = matchers;

describe('Site API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
    });

    it('can retrieve config and all expected properties', async function () {
        await agent
            .get('site/')
            .matchBodySnapshot({
                site: {
                    version: stringMatching(/\d+\.\d+/),
                    site_uuid: anyUuid
                }
            })
            .matchHeaderSnapshot({
                etag: anyEtag,
                'content-length': anyContentLength,
                'content-version': anyContentVersion
            });
    });
});
