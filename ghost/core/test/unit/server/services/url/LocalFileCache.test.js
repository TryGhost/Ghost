const should = require('should');
const sinon = require('sinon');
const fs = require('fs-extra');

const LocalFileCache = require('../../../../../core/server/services/url/LocalFileCache');

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

            cachedUrls.should.not.be.undefined();
            cachedUrls.urls.should.equal('urls!');
        });

        it('returns null when the cache file does not exit', async function () {
            const storagePath = '/tmp/empty-url-cache/';
            const localFileCache = new LocalFileCache({storagePath});

            const cachedUrls = await localFileCache.read('urls');

            should.equal(cachedUrls, null);
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

            should.equal(cachedUrls, null);
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

            result.should.equal(true);
            writeFileStub.called.should.equal(true);
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

            should.equal(result, null);
            writeFileStub.called.should.equal(false);
        });
    });
});
