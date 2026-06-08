const assert = require('node:assert/strict');
const sinon = require('sinon');

const oembedService = require('../../../../../core/server/services/oembed');
const WebmentionMetadata = require('../../../../../core/server/services/mentions/webmention-metadata');

describe('WebmentionMetadata', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('passes a transient fetch error classifier to the oEmbed service', async function () {
        const error = new Error('Too Many Requests');
        error.response = {
            statusCode: 429
        };

        const fetchStub = sinon.stub(oembedService, 'fetchOembedDataFromUrl').rejects(error);
        const webmentionMetadata = new WebmentionMetadata();

        await assert.rejects(
            () => webmentionMetadata.fetch(new URL('https://example.com')),
            (err) => {
                assert.equal(err, error);
                assert.equal(err.transient, true);
                return true;
            }
        );

        const options = fetchStub.firstCall.args[2];
        assert.equal(options.shouldRethrowFetchError(error), true);
    });

    it('tags 503 fetch errors with got response shape as transient', async function () {
        const error = new Error('Service Unavailable');
        error.response = {
            statusCode: 503
        };

        sinon.stub(oembedService, 'fetchOembedDataFromUrl').rejects(error);
        const webmentionMetadata = new WebmentionMetadata();

        await assert.rejects(
            () => webmentionMetadata.fetch(new URL('https://example.com')),
            (err) => {
                assert.equal(err.transient, true);
                return true;
            }
        );
    });

    it('tags timeout fetch errors as transient', async function () {
        const error = new Error('Timeout awaiting request');
        error.name = 'TimeoutError';

        sinon.stub(oembedService, 'fetchOembedDataFromUrl').rejects(error);
        const webmentionMetadata = new WebmentionMetadata();

        await assert.rejects(
            () => webmentionMetadata.fetch(new URL('https://example.com')),
            (err) => {
                assert.equal(err.transient, true);
                return true;
            }
        );
    });

    it('does not tag hard fetch errors as transient', async function () {
        const error = new Error('Not Found');
        error.response = {
            statusCode: 404
        };

        sinon.stub(oembedService, 'fetchOembedDataFromUrl').rejects(error);
        const webmentionMetadata = new WebmentionMetadata();

        await assert.rejects(
            () => webmentionMetadata.fetch(new URL('https://example.com')),
            (err) => {
                assert.equal(err.transient, false);
                return true;
            }
        );
    });
});
