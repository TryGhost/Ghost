const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyString, anyEtag} = matchers;

describe('Members .well-known', function () {
    let membersAgent;

    before(async function () {
        const agents = await agentProvider.getAgentsForMembers();
        membersAgent = agents.membersAgent;
    });

    describe('GET /jwks.json', function () {
        it('should return a JWKS', async function () {
            await membersAgent
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
