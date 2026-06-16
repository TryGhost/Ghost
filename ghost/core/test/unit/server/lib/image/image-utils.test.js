const assert = require('node:assert/strict');
const {PassThrough} = require('node:stream');
const sinon = require('sinon');
const externalRequest = require('../../../../../core/server/lib/request-external');
const ImageUtils = require('../../../../../core/server/lib/image/image-utils');

const SVG_IMAGE = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="20"></svg>');

describe('image-utils probe wrapper', function () {
    let stream;
    let externalRequestStub;
    let probe;

    beforeEach(function () {
        stream = new PassThrough();
        sinon.spy(stream, 'destroy');
        externalRequestStub = sinon.stub(externalRequest, 'stream').returns(stream);

        const imageUtils = new ImageUtils({
            config: {get: sinon.stub()},
            urlUtils: {},
            settingsCache: {},
            storageUtils: {},
            storage: {},
            validator: {},
            request: sinon.stub(),
            cacheStore: {}
        });
        probe = imageUtils.imageSize.probe;
    });

    afterEach(function () {
        sinon.restore();
    });

    function endStreamWithImage() {
        stream.end(SVG_IMAGE);
    }

    it('routes the request through externalRequest.stream (SSRF-protected got instance)', async function () {
        const result = probe('https://example.com/cat.jpg', {});
        endStreamWithImage();

        await result;

        sinon.assert.calledOnce(externalRequestStub);
        const [calledUrl] = externalRequestStub.firstCall.args;
        assert.equal(calledUrl, 'https://example.com/cat.jpg');
    });

    it('forwards headers and maps response_timeout → timeout.request', async function () {
        const result = probe('https://example.com/cat.jpg', {
            headers: {'User-Agent': 'Mozilla/5.0 Safari/537.36'},
            response_timeout: 1234
        });
        endStreamWithImage();

        await result;

        const [, opts] = externalRequestStub.firstCall.args;
        assert.deepEqual(opts.headers, {'User-Agent': 'Mozilla/5.0 Safari/537.36'});
        assert.equal(opts.timeout.request, 1234);
        assert.equal(opts.retry.limit, 0);
    });

    it('defaults timeout.request to 10000ms when response_timeout is omitted', async function () {
        const result = probe('https://example.com/cat.jpg', {});
        endStreamWithImage();

        await result;

        const [, opts] = externalRequestStub.firstCall.args;
        assert.equal(opts.timeout.request, 10000);
    });

    it('exposes the underlying stream on the returned promise so callers can destroy it on abort', async function () {
        const result = probe('https://example.com/cat.jpg', {});
        assert.equal(result.stream, stream);
        assert.equal(typeof result.stream.destroy, 'function');

        result.stream.destroy();
        sinon.assert.calledOnce(stream.destroy);

        await assert.rejects(result, /Premature close/);
    });

    it('resolves with the dimensions returned by probe-image-size', async function () {
        const result = probe('https://example.com/cat.jpg', {});
        endStreamWithImage();

        assert.deepEqual(await result, {
            width: 10,
            height: 20,
            type: 'svg',
            mime: 'image/svg+xml',
            wUnits: 'px',
            hUnits: 'px'
        });
    });
});
