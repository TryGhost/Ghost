const assert = require('node:assert/strict');
const {PassThrough} = require('node:stream');
const sinon = require('sinon');
const rewire = require('rewire');

const MODULE_PATH = '../../../../../core/server/lib/image/image-utils';

describe('image-utils probe wrapper', function () {
    let stream;
    let externalRequestStub;
    let probeImageSizeStub;
    let probe;
    let imageUtilsModule;
    let revert;

    beforeEach(function () {
        stream = new PassThrough();
        sinon.spy(stream, 'destroy');
        externalRequestStub = {
            stream: sinon.stub().returns(stream)
        };
        probeImageSizeStub = sinon.stub().resolves({width: 10, height: 20});

        imageUtilsModule = rewire(MODULE_PATH);
        revert = imageUtilsModule.__set__({
            externalRequest: externalRequestStub,
            probeImageSize: probeImageSizeStub
        });
        probe = imageUtilsModule.__get__('probe');
    });

    afterEach(function () {
        revert();
        sinon.restore();
    });

    it('routes the request through externalRequest.stream (SSRF-protected got instance)', async function () {
        await probe('https://example.com/cat.jpg', {});
        sinon.assert.calledOnce(externalRequestStub.stream);
        const [calledUrl] = externalRequestStub.stream.firstCall.args;
        assert.equal(calledUrl, 'https://example.com/cat.jpg');
    });

    it('forwards headers and maps response_timeout → timeout.request', async function () {
        await probe('https://example.com/cat.jpg', {
            headers: {'User-Agent': 'Mozilla/5.0 Safari/537.36'},
            response_timeout: 1234
        });
        const [, opts] = externalRequestStub.stream.firstCall.args;
        assert.deepEqual(opts.headers, {'User-Agent': 'Mozilla/5.0 Safari/537.36'});
        assert.equal(opts.timeout.request, 1234);
        assert.equal(opts.retry.limit, 0);
    });

    it('defaults timeout.request to 10000ms when response_timeout is omitted', async function () {
        await probe('https://example.com/cat.jpg', {});
        const [, opts] = externalRequestStub.stream.firstCall.args;
        assert.equal(opts.timeout.request, 10000);
    });

    it('passes the got stream to probe-image-size', async function () {
        await probe('https://example.com/cat.jpg', {});
        sinon.assert.calledOnceWithExactly(probeImageSizeStub, stream);
    });

    it('exposes the underlying stream on the returned promise so callers can destroy it on abort', async function () {
        const result = probe('https://example.com/cat.jpg', {});
        assert.equal(result.stream, stream);
        assert.equal(typeof result.stream.destroy, 'function');

        result.stream.destroy();
        sinon.assert.calledOnce(stream.destroy);

        await result;
    });

    it('resolves with the dimensions returned by probe-image-size', async function () {
        const result = await probe('https://example.com/cat.jpg', {});
        assert.deepEqual(result, {width: 10, height: 20});
    });
});
