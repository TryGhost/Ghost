const assert = require('node:assert/strict');
const sinon = require('sinon');
const errors = require('@tryghost/errors');

const AnthropicProvider = require('../../../../../../core/server/services/ai/providers/anthropic-provider');

describe('AnthropicProvider', function () {
    let request;
    let provider;

    beforeEach(function () {
        request = sinon.stub();
        provider = new AnthropicProvider({apiKey: 'sk-ant-test', request});
    });

    afterEach(function () {
        sinon.restore();
    });

    it('requires an API key', function () {
        assert.throws(
            () => new AnthropicProvider({request}),
            err => err instanceof errors.IncorrectUsageError
        );
    });

    it('sends the image and prompt to the Anthropic messages API and returns the generated text', async function () {
        const image = Buffer.from('image-bytes');
        request.resolves({
            statusCode: 200,
            body: JSON.stringify({
                content: [{type: 'text', text: '  A person riding a bicycle beside the sea.  '}]
            })
        });

        const result = await provider.describeImage({image, mediaType: 'image/png', prompt: 'Describe this image.'});

        assert.equal(result, 'A person riding a bicycle beside the sea.');

        const [url, options] = request.firstCall.args;
        assert.equal(url, 'https://api.anthropic.com/v1/messages');
        assert.equal(options.method, 'POST');
        assert.deepEqual(options.headers, {
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
            'x-api-key': 'sk-ant-test'
        });
        assert.deepEqual(JSON.parse(options.body), {
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
                    text: 'Describe this image.'
                }]
            }]
        });
    });

    it('wraps network failures in a clean error', async function () {
        request.rejects(new Error('socket details'));

        await assert.rejects(
            provider.describeImage({image: Buffer.from('x'), mediaType: 'image/png', prompt: 'Describe.'}),
            err => err instanceof errors.InternalServerError && err.message === 'Could not reach the Anthropic API.'
        );
    });

    it('maps 401 responses to a permission error', async function () {
        request.resolves({statusCode: 401, body: JSON.stringify({error: {message: 'invalid key'}})});

        await assert.rejects(
            provider.describeImage({image: Buffer.from('x'), mediaType: 'image/png', prompt: 'Describe.'}),
            err => err instanceof errors.NoPermissionError
        );
    });

    it('maps 403 responses to a permission error', async function () {
        request.resolves({statusCode: 403, body: JSON.stringify({error: {message: 'forbidden'}})});

        await assert.rejects(
            provider.describeImage({image: Buffer.from('x'), mediaType: 'image/png', prompt: 'Describe.'}),
            err => err instanceof errors.NoPermissionError
        );
    });

    it('maps 429 responses to a rate limit error', async function () {
        request.resolves({statusCode: 429, body: JSON.stringify({error: {message: 'rate limited'}})});

        await assert.rejects(
            provider.describeImage({image: Buffer.from('x'), mediaType: 'image/png', prompt: 'Describe.'}),
            err => err instanceof errors.TooManyRequestsError
        );
    });

    it('maps 5xx responses to an internal server error', async function () {
        request.resolves({statusCode: 503, body: JSON.stringify({error: {message: 'overloaded'}})});

        await assert.rejects(
            provider.describeImage({image: Buffer.from('x'), mediaType: 'image/png', prompt: 'Describe.'}),
            err => err instanceof errors.InternalServerError
        );
    });

    it('maps other 4xx responses to a validation error', async function () {
        request.resolves({statusCode: 400, body: JSON.stringify({error: {message: 'bad request'}})});

        await assert.rejects(
            provider.describeImage({image: Buffer.from('x'), mediaType: 'image/png', prompt: 'Describe.'}),
            err => err instanceof errors.ValidationError
        );
    });

    it('rejects an empty successful response', async function () {
        request.resolves({statusCode: 200, body: JSON.stringify({content: []})});

        await assert.rejects(
            provider.describeImage({image: Buffer.from('x'), mediaType: 'image/png', prompt: 'Describe.'}),
            err => err instanceof errors.InternalServerError && err.message === 'Anthropic returned no text content.'
        );
    });

    it('wraps unparseable responses in a clean error', async function () {
        request.resolves({statusCode: 200, body: 'not json'});

        await assert.rejects(
            provider.describeImage({image: Buffer.from('x'), mediaType: 'image/png', prompt: 'Describe.'}),
            err => err instanceof errors.InternalServerError && err.message === 'Anthropic returned an unreadable response.'
        );
    });
});
