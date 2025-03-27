const assert = require('assert/strict');
const {agentProvider} = require('../utils/e2e-framework');

describe('Static files', function () {
    let frontendAgent;
    let ghostServer;

    before(async function () {
        const agents = await agentProvider.getAgentsWithFrontend();
        frontendAgent = agents.frontendAgent;
        ghostServer = agents.ghostServer;
    });

    after(async function () {
        await ghostServer.stop();
    });

    it('serves unstyled 404 for non-existing resized + original files', async function () {
        const response = await frontendAgent
            .get('/content/images/size/w2000/1995/12/daniel.jpg')
            .expect(404);

        assert.ok(response.text.includes('NotFoundError: Image not found'));
    });
});
