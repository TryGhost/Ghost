var should = require('should'),
    sinon = require('sinon'),
    urlService = require('../../../../server/services/url'),

    // Stuff we are testing
    storageUtils = require('../../../../server/adapters/storage/utils'),

    sandbox = sinon.sandbox.create();

describe('storage utils', function () {
    var urlForStub,
        urlGetSubdirStub;

    beforeEach(function () {
        urlForStub = sandbox.stub();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('fn: getLocalFileStoragePath', function () {
        it('should return local file storage path for absolute URL', function () {
            var url = 'http://myblog.com/content/images/2017/07/ghost-logo.png',
                result;

            urlForStub = sandbox.stub(urlService.utils, 'urlFor');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sandbox.stub(urlService.utils, 'getSubdir');
            urlGetSubdirStub.returns('');

            result = storageUtils.getLocalFileStoragePath(url);
            should.exist(result);
            result.should.be.equal('/2017/07/ghost-logo.png');
        });

        // Very unlikely that this is necessary, because Ghost will redirect the request beforehand.
        // See https://github.com/TryGhost/Ghost/blob/master/core/server/web/middleware/url-redirects.js#L76
        // TODO: Change the code to make this test work
        it.skip('should return local file storage path for https request, when blog setup as http', function () {
            var url = 'https://myblog.com/content/images/2017/07/ghost-logo.png',
                result;

            urlForStub = sandbox.stub(urlService.utils, 'urlFor');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sandbox.stub(urlService.utils, 'getSubdir');
            urlGetSubdirStub.returns('');

            result = storageUtils.getLocalFileStoragePath(url);
            should.exist(result);
            result.should.be.equal('/2017/07/ghost-logo.png');
        });

        it('should return local file storage path for absolute URL with subdirectory', function () {
            var url = 'http://myblog.com/blog/content/images/2017/07/ghost-logo.png',
                result;

            urlForStub = sandbox.stub(urlService.utils, 'urlFor');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sandbox.stub(urlService.utils, 'getSubdir');
            urlGetSubdirStub.returns('/blog');

            result = storageUtils.getLocalFileStoragePath(url);
            should.exist(result);
            result.should.be.equal('/2017/07/ghost-logo.png');
        });

        it('should return local file storage path for relative URL', function () {
            var filePath = '/content/images/2017/07/ghost-logo.png',
                result;

            urlForStub = sandbox.stub(urlService.utils, 'urlFor');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sandbox.stub(urlService.utils, 'getSubdir');
            urlGetSubdirStub.returns('');

            result = storageUtils.getLocalFileStoragePath(filePath);
            should.exist(result);
            result.should.be.equal('/2017/07/ghost-logo.png');
        });

        it('should return local file storage path for relative URL with subdirectory', function () {
            var filePath = '/blog/content/images/2017/07/ghost-logo.png',
                result;

            urlForStub = sandbox.stub(urlService.utils, 'urlFor');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sandbox.stub(urlService.utils, 'getSubdir');
            urlGetSubdirStub.returns('/blog');

            result = storageUtils.getLocalFileStoragePath(filePath);
            should.exist(result);
            result.should.be.equal('/2017/07/ghost-logo.png');
        });

        it('should not sanitize URL if not local file storage', function () {
            var url = 'http://example-blog.com/ghost-logo.png',
                result;

            urlForStub = sandbox.stub(urlService.utils, 'urlFor');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sandbox.stub(urlService.utils, 'getSubdir');
            urlGetSubdirStub.returns('');

            result = storageUtils.getLocalFileStoragePath(url);
            should.exist(result);
            result.should.be.equal('http://example-blog.com/ghost-logo.png');
        });
    });

    describe('fn: isLocalImage', function () {
        it('should return true when absolute URL and local file', function () {
            var url = 'http://myblog.com/content/images/2017/07/ghost-logo.png',
                result;

            urlForStub = sandbox.stub(urlService.utils, 'urlFor');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sandbox.stub(urlService.utils, 'getSubdir');
            urlGetSubdirStub.returns('');

            result = storageUtils.isLocalImage(url);
            should.exist(result);
            result.should.be.equal(true);
        });

        // Very unlikely that this is necessary, because Ghost will redirect the request beforehand.
        // See https://github.com/TryGhost/Ghost/blob/master/core/server/web/middleware/url-redirects.js#L76
        // TODO: Change the code to make this test work
        it.skip('should return local file storage path for https request, when blog setup as http', function () {
            var url = 'https://myblog.com/content/images/2017/07/ghost-logo.png',
                result;

            urlForStub = sandbox.stub(urlService.utils, 'urlFor');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sandbox.stub(urlService.utils, 'getSubdir');
            urlGetSubdirStub.returns('');

            result = storageUtils.isLocalImage(url);
            should.exist(result);
            result.should.be.equal(true);
        });

        it('should return true when absolute URL with subdirectory and local file', function () {
            var url = 'http://myblog.com/blog/content/images/2017/07/ghost-logo.png',
                result;

            urlForStub = sandbox.stub(urlService.utils, 'urlFor');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sandbox.stub(urlService.utils, 'getSubdir');
            urlGetSubdirStub.returns('/blog');

            result = storageUtils.isLocalImage(url);
            should.exist(result);
            result.should.be.equal(true);
        });

        it('should return true when relative URL and local file', function () {
            var url = '/content/images/2017/07/ghost-logo.png',
                result;

            urlForStub = sandbox.stub(urlService.utils, 'urlFor');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sandbox.stub(urlService.utils, 'getSubdir');
            urlGetSubdirStub.returns('');

            result = storageUtils.isLocalImage(url);
            should.exist(result);
            result.should.be.equal(true);
        });

        it('should return true when relative URL and local file', function () {
            var url = '/blog/content/images/2017/07/ghost-logo.png',
                result;

            urlForStub = sandbox.stub(urlService.utils, 'urlFor');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sandbox.stub(urlService.utils, 'getSubdir');
            urlGetSubdirStub.returns('/blog');

            result = storageUtils.isLocalImage(url);
            should.exist(result);
            result.should.be.equal(true);
        });

        it('should return false when no local file', function () {
            var url = 'http://somewebsite.com/ghost-logo.png',
                result;

            urlForStub = sandbox.stub(urlService.utils, 'urlFor');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sandbox.stub(urlService.utils, 'getSubdir');
            urlGetSubdirStub.returns('');

            result = storageUtils.isLocalImage(url);
            should.exist(result);
            result.should.be.equal(false);
        });
    });
});
