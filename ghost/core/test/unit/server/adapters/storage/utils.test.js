const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const sinon = require('sinon');
const urlUtils = require('../../../../../core/shared/url-utils');
const configUtils = require('../../../../utils/config-utils');

// Stuff we are testing
const storageUtils = require('../../../../../core/server/adapters/storage/utils');

describe('storage utils', function () {
    let urlForStub;
    let urlGetSubdirStub;

    beforeEach(function () {
        urlForStub = sinon.stub();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('fn: getLocalImagesStoragePath', function () {
        it('should return local file storage path for absolute URL', function () {
            const url = 'http://myblog.com/content/images/2017/07/ghost-logo.png';
            let result;

            urlForStub = sinon.stub(urlUtils, 'urlFor');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sinon.stub(urlUtils, 'getSubdir');
            urlGetSubdirStub.returns('');

            result = storageUtils.getLocalImagesStoragePath(url);
            assertExists(result);
            assert.equal(result, '/2017/07/ghost-logo.png');
        });

        it('should return local file storage path for absolute URL with subdirectory', function () {
            const url = 'http://myblog.com/blog/content/images/2017/07/ghost-logo.png';
            let result;

            urlForStub = sinon.stub(urlUtils, 'urlFor');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sinon.stub(urlUtils, 'getSubdir');
            urlGetSubdirStub.returns('/blog');

            result = storageUtils.getLocalImagesStoragePath(url);
            assertExists(result);
            assert.equal(result, '/2017/07/ghost-logo.png');
        });

        it('should return local file storage path for relative URL', function () {
            const filePath = '/content/images/2017/07/ghost-logo.png';
            let result;

            urlForStub = sinon.stub(urlUtils, 'urlFor');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sinon.stub(urlUtils, 'getSubdir');
            urlGetSubdirStub.returns('');

            result = storageUtils.getLocalImagesStoragePath(filePath);
            assertExists(result);
            assert.equal(result, '/2017/07/ghost-logo.png');
        });

        it('should return local file storage path for relative URL with subdirectory', function () {
            const filePath = '/blog/content/images/2017/07/ghost-logo.png';
            let result;

            urlForStub = sinon.stub(urlUtils, 'urlFor');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sinon.stub(urlUtils, 'getSubdir');
            urlGetSubdirStub.returns('/blog');

            result = storageUtils.getLocalImagesStoragePath(filePath);
            assertExists(result);
            assert.equal(result, '/2017/07/ghost-logo.png');
        });

        it('should not sanitize URL if not local file storage', function () {
            const url = 'http://example-blog.com/ghost-logo.png';
            let result;

            urlForStub = sinon.stub(urlUtils, 'urlFor');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sinon.stub(urlUtils, 'getSubdir');
            urlGetSubdirStub.returns('');

            result = storageUtils.getLocalImagesStoragePath(url);
            assertExists(result);
            assert.equal(result, 'http://example-blog.com/ghost-logo.png');
        });
    });

    describe('fn: isLocalImage', function () {
        it('should return true when absolute URL and local file', function () {
            const url = 'http://myblog.com/content/images/2017/07/ghost-logo.png';
            let result;

            urlForStub = sinon.stub(urlUtils, 'urlFor');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sinon.stub(urlUtils, 'getSubdir');
            urlGetSubdirStub.returns('');

            result = storageUtils.isLocalImage(url);
            assertExists(result);
            assert.equal(result, true);
        });

        it('should return true when absolute URL with subdirectory and local file', function () {
            const url = 'http://myblog.com/blog/content/images/2017/07/ghost-logo.png';
            let result;

            urlForStub = sinon.stub(urlUtils, 'urlFor');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sinon.stub(urlUtils, 'getSubdir');
            urlGetSubdirStub.returns('/blog');

            result = storageUtils.isLocalImage(url);
            assertExists(result);
            assert.equal(result, true);
        });

        it('should return true when relative URL and local file', function () {
            const url = '/content/images/2017/07/ghost-logo.png';
            let result;

            urlForStub = sinon.stub(urlUtils, 'urlFor');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sinon.stub(urlUtils, 'getSubdir');
            urlGetSubdirStub.returns('');

            result = storageUtils.isLocalImage(url);
            assertExists(result);
            assert.equal(result, true);
        });

        it('should return true when relative URL and local file (blog subdir)', function () {
            const url = '/blog/content/images/2017/07/ghost-logo.png';
            let result;

            urlForStub = sinon.stub(urlUtils, 'urlFor');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sinon.stub(urlUtils, 'getSubdir');
            urlGetSubdirStub.returns('/blog');

            result = storageUtils.isLocalImage(url);
            assertExists(result);
            assert.equal(result, true);
        });

        it('should return false when no local file', function () {
            const url = 'http://somewebsite.com/ghost-logo.png';
            let result;

            urlForStub = sinon.stub(urlUtils, 'urlFor');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sinon.stub(urlUtils, 'getSubdir');
            urlGetSubdirStub.returns('');

            result = storageUtils.isLocalImage(url);
            assertExists(result);
            assert.equal(result, false);
        });
    });

    describe('fn: isInternalImage', function () {
        beforeEach(function () {
            configUtils.set({url: 'http://myblog.com/'});
        });

        afterEach(async function () {
            await configUtils.restore();
        });

        it('should return true for local images', function () {
            urlForStub = sinon.stub(urlUtils, 'urlFor');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sinon.stub(urlUtils, 'getSubdir');
            urlGetSubdirStub.returns('');

            assert.equal(storageUtils.isInternalImage('http://myblog.com/content/images/2026/02/photo.png'), true);
        });

        it('should return true for CDN images when urls:image is configured', function () {
            configUtils.set('urls:image', 'https://storage.ghost.is/c/6f/a3/test/content/images');

            urlForStub = sinon.stub(urlUtils, 'urlFor');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sinon.stub(urlUtils, 'getSubdir');
            urlGetSubdirStub.returns('');

            assert.equal(storageUtils.isInternalImage('https://storage.ghost.is/c/6f/a3/test/content/images/2026/02/photo.png'), true);
        });

        it('should return false for CDN prefix-only matches', function () {
            configUtils.set('urls:image', 'https://storage.ghost.is/c/6f/a3/test/content/images');

            urlForStub = sinon.stub(urlUtils, 'urlFor');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sinon.stub(urlUtils, 'getSubdir');
            urlGetSubdirStub.returns('');

            assert.equal(storageUtils.isInternalImage('https://storage.ghost.is/c/6f/a3/test/content/images-other/photo.png'), false);
        });

        it('should return false for external images', function () {
            urlForStub = sinon.stub(urlUtils, 'urlFor');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sinon.stub(urlUtils, 'getSubdir');
            urlGetSubdirStub.returns('');

            assert.equal(storageUtils.isInternalImage('https://example.com/content/images/photo.png'), false);
        });

        it('should fall back to isLocalImage when no CDN config', function () {
            urlForStub = sinon.stub(urlUtils, 'urlFor');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sinon.stub(urlUtils, 'getSubdir');
            urlGetSubdirStub.returns('');

            assert.equal(storageUtils.isInternalImage('/content/images/2026/02/photo.png'), true);
            assert.equal(storageUtils.isInternalImage('https://external.com/photo.png'), false);
        });
    });
});
