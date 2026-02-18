const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const sinon = require('sinon');
const fs = require('fs-extra');

const LocalFileCache = require('../../../../../core/server/services/url/local-file-cache');

describe('Unit: services/url/LocalFileCache', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('read', function () {
        it('reads from file system by type', async function () {
            const storagePath = '/tmp/url-cache/';
            sinon.stub(fs, 'stat')
                .withArgs(`${storagePath}urls.json`)
                .resolves(true);
            sinon.stub(fs, 'readFile')
                .withArgs(`${storagePath}urls.json`)
                .resolves(JSON.stringify({urls: 'urls!'}));

            const localFileCache = new LocalFileCache({storagePath});

            const cachedUrls = await localFileCache.read('urls');

            assertExists(cachedUrls);
            assert.equal(cachedUrls.urls, 'urls!');
        });

        it('returns null when the cache file does not exit', async function () {
            const storagePath = '/tmp/empty-url-cache/';
            const localFileCache = new LocalFileCache({storagePath});

            const cachedUrls = await localFileCache.read('urls');

            assert.equal(cachedUrls, null);
        });

        it('returns null when the cache file is malformatted', async function () {
            const storagePath = '/tmp/empty-url-cache/';
            sinon.stub(fs, 'stat')
                .withArgs(`${storagePath}urls.json`)
                .resolves(true);
            sinon.stub(fs, 'readFile')
                .withArgs(`${storagePath}urls.json`)
                .resolves('I am not a valid JSON');

            const localFileCache = new LocalFileCache({storagePath});

            const cachedUrls = await localFileCache.read('urls');

            assert.equal(cachedUrls, null);
        });
    });

    describe('write', function () {
        it('writes to the file system by type', async function () {
            const storagePath = '/tmp/url-cache/';
            const writeFileStub = sinon.stub(fs, 'writeFile')
                .withArgs(`${storagePath}urls.json`)
                .resolves(true);

            const localFileCache = new LocalFileCache({storagePath});

            const result = await localFileCache.write('urls', {data: 'test'});

            assert.equal(result, true);
            assert.equal(writeFileStub.called, true);
        });

        it('does not write to the file system is writes are disabled', async function () {
            const storagePath = '/tmp/url-cache/';
            const writeFileStub = sinon.stub(fs, 'writeFile')
                .withArgs(`${storagePath}urls.json`)
                .resolves(true);

            const localFileCache = new LocalFileCache({
                storagePath,
                writeDisabled: true
            });

            const result = await localFileCache.write('urls', {data: 'test'});

            assert.equal(result, null);
            assert.equal(writeFileStub.called, false);
        });
    });
});
