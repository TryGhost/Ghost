const {agentProvider, matchers} = require('../utils/e2e-framework');
const {anyString, anyEtag} = matchers;

describe('.well-known', function () {
    let agentGhostAPI;

    before(async function () {
        agentGhostAPI = await agentProvider.getGhostAPIAgent();
    });

    describe('GET /jwks.json', function () {
        it('should return a JWKS', async function () {
            await agentGhostAPI
                .get('/.well-known/jwks.json')
                .expectStatus(200)
                .matchBodySnapshot({
                    keys: [{
                        kid: anyString,
                        n: anyString
                    }]
                })
                .matchHeaderSnapshot({
                    etag: anyEtag
                });
        });
    });
});
