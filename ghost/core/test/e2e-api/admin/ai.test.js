const assert = require('node:assert/strict');
const sinon = require('sinon');
const errors = require('@tryghost/errors');
const {agentProvider, fixtureManager} = require('../../utils/e2e-framework');
const aiService = require('../../../core/server/services/ai');

describe('AI API', function () {
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

    describe('POST /ai/alt-text', function () {
        it('requires authentication', async function () {
            await unauthenticatedAgent
                .post('/ai/alt-text/')
                .body({
                    image_url: '/content/images/2026/07/cyclist.png'
                })
                .expectStatus(403);
        });

        it('generates alt text for an image URL', async function () {
            const generate = sinon.stub(aiService, 'generateImageAltText').resolves('A cyclist riding beside the sea.');

            await agent
                .post('/ai/alt-text/')
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
            const generate = sinon.stub(aiService, 'generateImageAltText');

            await agent
                .post('/ai/alt-text/')
                .body({})
                .expectStatus(422);

            assert.equal(generate.called, false);
        });

        it('returns service errors cleanly', async function () {
            sinon.stub(aiService, 'generateImageAltText').rejects(new errors.BadRequestError({
                message: 'The URL did not return a supported image.'
            }));

            await agent
                .post('/ai/alt-text/')
                .body({
                    image_url: 'https://cdn.example/content/images/not-an-image.png'
                })
                .expectStatus(400)
                .expect(({body}) => {
                    assert.equal(body.errors[0].message, 'The URL did not return a supported image.');
                });
        });

        it('returns a clean error when no AI provider is configured', async function () {
            sinon.stub(aiService, 'generateImageAltText').rejects(new errors.ValidationError({
                message: 'An AI provider is not configured.'
            }));

            await agent
                .post('/ai/alt-text/')
                .body({
                    image_url: '/content/images/2026/07/cyclist.png'
                })
                .expectStatus(422)
                .expect(({body}) => {
                    assert.equal(body.errors[0].message, 'An AI provider is not configured.');
                });
        });
    });
});
