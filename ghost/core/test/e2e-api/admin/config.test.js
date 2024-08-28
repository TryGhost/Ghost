const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyContentVersion, anyEtag, anyContentLength, stringMatching} = matchers;

/**
 * This is a snapshot test for the happy path of the config API
 * It does not test the full range of possible config values
 * as that should be tested in the unit tests for the public-config service
 */
describe('Config API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init();
        await agent.loginAsOwner();
    });

    it('Can retrieve config and all expected properties', async function () {
        await agent
            .get('/config/')
            .expectStatus(200)
            .matchBodySnapshot({
                config: {
                    database: stringMatching(/sqlite3|mysql|mysql2/),
                    environment: stringMatching(/^testing/),
                    version: stringMatching(/\d+\.\d+\.\d+/)
                }
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                'content-length': anyContentLength, // Length can differ slightly based on the database, environment and version values
                etag: anyEtag
            });
    });
});
