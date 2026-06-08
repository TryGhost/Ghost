const assert = require('node:assert/strict');
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

    it('serves plain text 404 for non-existing resized + original files', async function () {
        const response = await frontendAgent
            .get('/content/images/size/w2000/1995/12/daniel.jpg')
            .expect(404)
            .expect('Content-Type', 'text/plain; charset=utf-8');

        assert.equal(response.text, 'Image not found');
    });

    it('returns plain text 404 for non-existing asset files with extensions', async function () {
        const response = await frontendAgent
            .get('/assets/css/missing.css')
            .expect(404)
            .expect('Content-Type', 'text/plain; charset=utf-8');

        assert.equal(response.text, 'File not found');
    });

    it('returns plain text 404 for non-existing arbitrary files with extensions', async function () {
        const response = await frontendAgent
            .get('/images/fake.png')
            .expect(404)
            .expect('Content-Type', 'text/plain; charset=utf-8');

        assert.equal(response.text, 'File not found');
    });
});
