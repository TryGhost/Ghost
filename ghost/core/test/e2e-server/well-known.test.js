const {agentProvider, matchers, mockManager} = require('../utils/e2e-framework');
const {anyString, anyEtag} = matchers;

describe('.well-known', function () {
    let agentGhostAPI;

    beforeAll(async function () {
        agentGhostAPI = await agentProvider.getGhostAPIAgent();
    });

    afterAll(function () {
        mockManager.restore();
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
