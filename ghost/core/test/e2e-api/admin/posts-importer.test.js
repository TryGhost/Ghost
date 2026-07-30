const {agentProvider, fixtureManager, assertions, mockManager, resetRateLimits} = require('../../utils/e2e-framework');
const {cacheInvalidateHeaderNotSet} = assertions;
const path = require('path');

const csvPath = path.join(__dirname, '../../utils/fixtures/csv/valid-posts-import.csv');

describe('Posts Importer API', function () {
    let agent;

    beforeAll(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users');
    });

    beforeEach(async function () {
        // Each test logs in as a different role — reset the login rate limiter
        // so the repeated logins don't trip spam prevention
        await resetRateLimits();
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('Can upload a posts CSV as Owner', async function () {
        await agent.loginAsOwner();

        await agent
            .post('posts/upload/')
            .attach('postsfile', csvPath)
            .expectStatus(202)
            .expect(cacheInvalidateHeaderNotSet());
    });

    it('Can upload a posts CSV as Administrator', async function () {
        await agent.loginAsAdmin();

        await agent
            .post('posts/upload/')
            .attach('postsfile', csvPath)
            .expectStatus(202)
            .expect(cacheInvalidateHeaderNotSet());
    });

    it('Cannot upload a posts CSV as Editor', async function () {
        await agent.loginAsEditor();

        await agent
            .post('posts/upload/')
            .attach('postsfile', csvPath)
            .expectStatus(403);
    });

    it('Cannot upload a posts CSV as Author', async function () {
        await agent.loginAsAuthor();

        await agent
            .post('posts/upload/')
            .attach('postsfile', csvPath)
            .expectStatus(403);
    });

    it('Can upload a posts CSV as the Self-Serve Migration Integration', async function () {
        await agent.useSelfServeMigrationAdminAPIKey();

        await agent
            .post('posts/upload/')
            .attach('postsfile', csvPath)
            .expectStatus(202)
            .expect(cacheInvalidateHeaderNotSet());
    });

    it('Cannot upload a posts CSV as a regular Admin Integration', async function () {
        await agent.useZapierAdminAPIKey();

        await agent
            .post('posts/upload/')
            .attach('postsfile', csvPath)
            .expectStatus(403);
    });

    it('Cannot upload a posts CSV as Contributor', async function () {
        await agent.loginAsContributor();

        await agent
            .post('posts/upload/')
            .attach('postsfile', csvPath)
            .expectStatus(403);
    });

    it('Cannot upload a posts CSV when the csvContentImporter flag is disabled', async function () {
        mockManager.mockLabsDisabled('csvContentImporter');
        await agent.loginAsOwner();

        await agent
            .post('posts/upload/')
            .attach('postsfile', csvPath)
            .expectStatus(404);
    });

    it('Cannot upload a file that is not a CSV', async function () {
        await agent.loginAsOwner();

        await agent
            .post('posts/upload/')
            .attach('postsfile', path.join(__dirname, '../../utils/fixtures/data/redirects.json'))
            .expectStatus(415);
    });

    it('Cannot upload without a file', async function () {
        await agent.loginAsOwner();

        await agent
            .post('posts/upload/')
            .expectStatus(422);
    });
});
