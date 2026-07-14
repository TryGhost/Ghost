const assert = require('node:assert/strict');
const sinon = require('sinon');
const errors = require('@tryghost/errors');

const AIService = require('../../../../../core/server/services/ai/ai-service');

describe('AIService', function () {
    let request;
    let settingsCache;
    let getFileTypeFromBuffer;
    let describeImage;
    let FakeProvider;
    let providers;
    let service;

    beforeEach(function () {
        request = sinon.stub();
        describeImage = sinon.stub().resolves('A person riding a bicycle beside the sea.');

        FakeProvider = function (deps) {
            this.deps = deps;
            this.describeImage = describeImage;
        };
        FakeProvider.capabilities = new Set(['vision-to-text']);

        providers = {
            listProviders: sinon.stub().returns([{slug: 'anthropic', ProviderClass: FakeProvider}])
        };

        settingsCache = {
            get: sinon.stub()
        };
        settingsCache.get.withArgs('ai_anthropic_api_key').returns('sk-ant-test');

        getFileTypeFromBuffer = sinon.stub().resolves({mime: 'image/png'});

        service = new AIService({
            request,
            settingsCache,
            getFileTypeFromBuffer,
            getSiteUrl: () => 'https://ghost.example/blog/',
            providers
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('isConfigured', function () {
        it('is true when a provider that supports the capability has an API key set', function () {
            assert.equal(service.isConfigured, true);
        });

        it('is false when no configured provider has an API key', function () {
            settingsCache.get.withArgs('ai_anthropic_api_key').returns(null);
            assert.equal(service.isConfigured, false);
        });

        it('is false when no registered provider advertises the required capability', function () {
            FakeProvider.capabilities = new Set(['text-generation']);
            assert.equal(service.isConfigured, false);
        });

        it('skips providers whose capabilities set is missing', function () {
            delete FakeProvider.capabilities;
            assert.equal(service.isConfigured, false);
        });
    });

    describe('generateImageAltText', function () {
        it('requires a configured provider', async function () {
            settingsCache.get.withArgs('ai_anthropic_api_key').returns(null);

            await assert.rejects(
                service.generateImageAltText('https://ghost.example/content/images/photo.png'),
                err => err instanceof errors.ValidationError && err.message === 'An AI provider is not configured.'
            );

            assert.equal(request.called, false);
        });

        it('routes to the first configured provider that advertises the required capability', async function () {
            const textOnlyDescribe = sinon.stub().rejects(new Error('should not be called'));
            const TextOnlyProvider = function () {
                this.describeImage = textOnlyDescribe;
            };
            TextOnlyProvider.capabilities = new Set(['text-generation']);

            providers.listProviders.returns([
                {slug: 'text-only', ProviderClass: TextOnlyProvider},
                {slug: 'anthropic', ProviderClass: FakeProvider}
            ]);
            settingsCache.get.withArgs('ai_text-only_api_key').returns('key');
            request.resolves({body: Buffer.from('image')});

            await service.generateImageAltText('https://ghost.example/content/images/photo.png');

            assert.equal(textOnlyDescribe.called, false);
            assert.equal(describeImage.calledOnce, true);
        });

        it('normalizes a site-relative image path, downloads it, and delegates to the provider', async function () {
            const image = Buffer.from('image-bytes');
            request.resolves({body: image});

            const result = await service.generateImageAltText('/content/images/2026/07/photo.png');

            assert.equal(result, 'A person riding a bicycle beside the sea.');
            assert.equal(request.firstCall.firstArg, 'https://ghost.example/content/images/2026/07/photo.png');
            assert.deepEqual(request.firstCall.args[1], {
                followRedirect: true,
                responseType: 'buffer',
                retry: {limit: 0},
                timeout: {request: 10000}
            });

            assert.equal(getFileTypeFromBuffer.calledOnceWithExactly(image), true);
            assert.equal(describeImage.calledOnce, true);
            const [{image: sentImage, mediaType, prompt}] = describeImage.firstCall.args;
            assert.equal(sentImage, image);
            assert.equal(mediaType, 'image/png');
            assert.match(prompt, /alt text/i);
        });

        it('accepts an absolute CDN image URL', async function () {
            request.resolves({body: Buffer.from('image')});

            await service.generateImageAltText('https://cdn.example/content/images/photo.png');

            assert.equal(request.firstCall.firstArg, 'https://cdn.example/content/images/photo.png');
        });

        it('asks the provider to reply in the site locale when non-English', async function () {
            service.getLocale = () => 'fr';
            request.resolves({body: Buffer.from('image')});

            await service.generateImageAltText('https://ghost.example/content/images/photo.png');

            const [{prompt}] = describeImage.firstCall.args;
            assert.match(prompt, /locale code "fr"/);
        });

        for (const imageUrl of [
            '',
            'not a URL',
            '/assets/photo.png',
            'file:///content/images/photo.png'
        ]) {
            it(`rejects invalid image URL: ${imageUrl || '(empty)'}`, async function () {
                await assert.rejects(
                    service.generateImageAltText(imageUrl),
                    err => err instanceof errors.ValidationError
                );

                assert.equal(request.called, false);
            });
        }

        it('rejects unsupported image data', async function () {
            request.resolves({body: Buffer.from('<html>not an image</html>')});
            getFileTypeFromBuffer.resolves({mime: 'text/html'});

            await assert.rejects(
                service.generateImageAltText('https://ghost.example/content/images/photo.png'),
                err => err instanceof errors.BadRequestError && err.message === 'The URL did not return a supported image.'
            );

            assert.equal(request.callCount, 1);
        });

        it('rejects images larger than the size limit', async function () {
            request.resolves({body: Buffer.alloc(7500001)});

            await assert.rejects(
                service.generateImageAltText('https://ghost.example/content/images/photo.png'),
                err => err instanceof errors.BadRequestError && err.message === 'The image is too large to generate alt text for.'
            );

            assert.equal(request.callCount, 1);
            assert.equal(getFileTypeFromBuffer.called, false);
        });

        it('wraps image download failures in a clean error', async function () {
            request.rejects(new Error('socket details'));

            await assert.rejects(
                service.generateImageAltText('https://ghost.example/content/images/photo.png'),
                err => err instanceof errors.BadRequestError && err.message === 'Ghost could not download the image.'
            );
        });

        it('propagates provider failures', async function () {
            request.resolves({body: Buffer.from('image')});
            describeImage.rejects(new errors.NoPermissionError({message: 'Invalid API key.'}));

            await assert.rejects(
                service.generateImageAltText('https://ghost.example/content/images/photo.png'),
                err => err instanceof errors.NoPermissionError && err.message === 'Invalid API key.'
            );
        });
    });
});
