const {agentProvider, fixtureManager, mockManager} = require('../../utils/e2e-framework');

// The successful download path streams a large zip over real HTTP and lives in
// exports-download.test.js — the in-process test agent used here cannot stream
// large response bodies (its mock socket never signals drain).
describe('Exports API', function () {
    let agent;

    beforeAll(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users');
        await agent.loginAsOwner();
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('Cannot request the media component', async function () {
        await agent
            .get('exports/download/?components=media')
            .expectStatus(422);
    });

    it('Cannot request an unknown component', async function () {
        await agent
            .get('exports/download/?components=content,everything')
            .expectStatus(422);
    });

    it('Cannot download an export without the selfServeArchives flag', async function () {
        mockManager.mockLabsDisabled('selfServeArchives');

        await agent
            .get('exports/download/')
            .expectStatus(404);
    });

    it('Cannot download an export as an editor', async function () {
        await agent.loginAsEditor();

        await agent
            .get('exports/download/')
            .expectStatus(403);

        await agent.loginAsOwner();
    });
});
