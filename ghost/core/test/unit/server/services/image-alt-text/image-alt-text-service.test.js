const assert = require('node:assert/strict');
const sinon = require('sinon');
const errors = require('@tryghost/errors');

const ImageAltTextService = require('../../../../../core/server/services/image-alt-text/image-alt-text-service');

describe('ImageAltTextService', function () {
    let request;
    let settingsCache;
    let getFileTypeFromBuffer;
    let service;

    beforeEach(function () {
        request = sinon.stub();
        settingsCache = {
            get: sinon.stub().withArgs('claude_api_key').returns('sk-ant-test')
        };
        getFileTypeFromBuffer = sinon.stub().resolves({mime: 'image/png'});
        service = new ImageAltTextService({
            request,
            settingsCache,
            getFileTypeFromBuffer,
            getSiteUrl: () => 'https://ghost.example/blog/'
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    it('requires a configured Claude API key', async function () {
        settingsCache.get.withArgs('claude_api_key').returns(null);

        await assert.rejects(
            service.generate('https://ghost.example/content/images/photo.png'),
            err => err instanceof errors.ValidationError && err.message === 'Claude API key is not configured.'
        );

        assert.equal(request.called, false);
    });

    it('normalizes a site-relative Ghost image path and returns generated alt text', async function () {
        const image = Buffer.from('image-bytes');
        request.onFirstCall().resolves({body: image});
        request.onSecondCall().resolves({
            statusCode: 200,
            body: JSON.stringify({
                content: [{type: 'text', text: '  A person riding a bicycle beside the sea.  '}]
            })
        });

        const result = await service.generate('/content/images/2026/07/photo.png');

        assert.equal(result, 'A person riding a bicycle beside the sea.');
        assert.equal(request.firstCall.firstArg, 'https://ghost.example/content/images/2026/07/photo.png');
        assert.deepEqual(request.firstCall.args[1], {
            followRedirect: true,
            maxResponseSize: 7500000,
            responseType: 'buffer',
            retry: {limit: 0},
            timeout: {request: 10000}
        });
        assert.equal(getFileTypeFromBuffer.calledOnceWithExactly(image), true);

        const [providerUrl, providerOptions] = request.secondCall.args;
        assert.equal(providerUrl, 'https://api.anthropic.com/v1/messages');
        assert.equal(providerOptions.method, 'POST');
        assert.deepEqual(providerOptions.headers, {
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
            'x-api-key': 'sk-ant-test'
        });
        assert.deepEqual(JSON.parse(providerOptions.body), {
            model: 'claude-haiku-4-5',
            max_tokens: 300,
            messages: [{
                role: 'user',
                content: [{
                    type: 'image',
                    source: {
                        type: 'base64',
                        media_type: 'image/png',
                        data: image.toString('base64')
                    }
                }, {
                    type: 'text',
                    text: 'Write one concise, accessibility-focused alt text description for this image. Describe the visible subject, action, and relevant context. Include visible text only when it is material. Do not use filler such as “image of” or “picture of”. Respond with only the alt text, without markdown, quotes, or a prefix.'
                }]
            }]
        });
    });

    it('accepts an absolute CDN image URL', async function () {
        request.onFirstCall().resolves({body: Buffer.from('image')});
        request.onSecondCall().resolves({
            statusCode: 200,
            body: JSON.stringify({content: [{type: 'text', text: 'Alt text'}]})
        });

        await service.generate('https://cdn.example/content/images/photo.png');

        assert.equal(request.firstCall.firstArg, 'https://cdn.example/content/images/photo.png');
    });

    for (const imageUrl of [
        '',
        'not a URL',
        '/assets/photo.png',
        'file:///content/images/photo.png'
    ]) {
        it(`rejects invalid image URL: ${imageUrl || '(empty)'}`, async function () {
            await assert.rejects(
                service.generate(imageUrl),
                err => err instanceof errors.ValidationError && err.message === 'A valid Ghost image URL is required.'
            );

            assert.equal(request.called, false);
        });
    }

    it('rejects unsupported image data', async function () {
        request.onFirstCall().resolves({body: Buffer.from('<html>not an image</html>')});
        getFileTypeFromBuffer.resolves({mime: 'text/html'});

        await assert.rejects(
            service.generate('https://ghost.example/content/images/photo.png'),
            err => err instanceof errors.BadRequestError && err.message === 'The URL did not return a supported image.'
        );

        assert.equal(request.callCount, 1);
    });

    it('wraps image download failures in a clean error', async function () {
        request.onFirstCall().rejects(new Error('socket details'));

        await assert.rejects(
            service.generate('https://ghost.example/content/images/photo.png'),
            err => err instanceof errors.BadRequestError && err.message === 'Ghost could not download the image.'
        );
    });

    it('wraps Claude provider failures in a clean error', async function () {
        request.onFirstCall().resolves({body: Buffer.from('image')});
        request.onSecondCall().rejects(new Error('provider details'));

        await assert.rejects(
            service.generate('https://ghost.example/content/images/photo.png'),
            err => err instanceof errors.InternalServerError && err.message === 'Claude could not generate alt text.'
        );
    });

    it('rejects an empty Claude response', async function () {
        request.onFirstCall().resolves({body: Buffer.from('image')});
        request.onSecondCall().resolves({statusCode: 200, body: JSON.stringify({content: []})});

        await assert.rejects(
            service.generate('https://ghost.example/content/images/photo.png'),
            err => err instanceof errors.InternalServerError && err.message === 'Claude could not generate alt text.'
        );
    });
});
