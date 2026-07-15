const assert = require('node:assert/strict');
const sinon = require('sinon');
const errors = require('@tryghost/errors');
const {agentProvider, fixtureManager} = require('../../utils/e2e-framework');
const imageAltTextService = require('../../../core/server/services/image-alt-text');

describe('Image alt text API', function () {
    let agent;
    let unauthenticatedAgent;

    beforeAll(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        unauthenticatedAgent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init();
        await agent.loginAsOwner();
    });

    afterEach(function () {
        sinon.restore();
    });

    it('requires authentication', async function () {
        await unauthenticatedAgent
            .post('/images/alt-text/')
            .body({
                image_url: '/content/images/2026/07/cyclist.png'
            })
            .expectStatus(403);
    });

    it('generates alt text for an image URL', async function () {
        const generate = sinon.stub(imageAltTextService, 'generate').resolves('A cyclist riding beside the sea.');

        await agent
            .post('/images/alt-text/')
            .body({
                image_url: '/content/images/2026/07/cyclist.png'
            })
            .expectStatus(200)
            .expect(({body}) => {
                assert.deepEqual(body, {
                    alt_text: 'A cyclist riding beside the sea.'
                });
            });

        assert.equal(generate.calledOnceWithExactly('/content/images/2026/07/cyclist.png'), true);
    });

    it('requires an image URL', async function () {
        const generate = sinon.stub(imageAltTextService, 'generate');

        await agent
            .post('/images/alt-text/')
            .body({})
            .expectStatus(422);

        assert.equal(generate.called, false);
    });

    it('returns service errors cleanly', async function () {
        sinon.stub(imageAltTextService, 'generate').rejects(new errors.BadRequestError({
            message: 'The URL did not return a supported image.'
        }));

        await agent
            .post('/images/alt-text/')
            .body({
                image_url: 'https://cdn.example/content/images/not-an-image.png'
            })
            .expectStatus(400)
            .expect(({body}) => {
                assert.equal(body.errors[0].message, 'The URL did not return a supported image.');
            });
    });
});
