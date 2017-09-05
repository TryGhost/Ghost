var should = require('should'),
    sinon = require('sinon'),
    utils = require('../../../../server/utils'),

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

            urlForStub = sandbox.stub(utils.url, 'urlFor');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sandbox.stub(utils.url, 'getSubdir');
            urlGetSubdirStub.returns('');

            result = storageUtils.getLocalFileStoragePath(url);
            should.exist(result);
            result.should.be.equal('/2017/07/ghost-logo.png');
        });

        it('should return local file storage path for absolute URL with subdirectory', function () {
            var url = 'http://myblog.com/blog/content/images/2017/07/ghost-logo.png',
                result;

            urlForStub = sandbox.stub(utils.url, 'urlFor');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sandbox.stub(utils.url, 'getSubdir');
            urlGetSubdirStub.returns('/blog');

            result = storageUtils.getLocalFileStoragePath(url);
            should.exist(result);
            result.should.be.equal('/2017/07/ghost-logo.png');
        });

        it('should return local file storage path for relative URL', function () {
            var filePath = '/content/images/2017/07/ghost-logo.png',
                result;

            urlForStub = sandbox.stub(utils.url, 'urlFor');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sandbox.stub(utils.url, 'getSubdir');
            urlGetSubdirStub.returns('');

            result = storageUtils.getLocalFileStoragePath(filePath);
            should.exist(result);
            result.should.be.equal('/2017/07/ghost-logo.png');
        });

        it('should return local file storage path for relative URL with subdirectory', function () {
            var filePath = '/blog/content/images/2017/07/ghost-logo.png',
                result;

            urlForStub = sandbox.stub(utils.url, 'urlFor');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sandbox.stub(utils.url, 'getSubdir');
            urlGetSubdirStub.returns('/blog');

            result = storageUtils.getLocalFileStoragePath(filePath);
            should.exist(result);
            result.should.be.equal('/2017/07/ghost-logo.png');
        });

        it('should not sanitize URL if not local file storage', function () {
            var url = 'http://example-blog.com/ghost-logo.png',
                result;

            urlForStub = sandbox.stub(utils.url, 'urlFor');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sandbox.stub(utils.url, 'getSubdir');
            urlGetSubdirStub.returns('');

            result = storageUtils.getLocalFileStoragePath(url);
            should.exist(result);
            result.should.be.equal('http://example-blog.com/ghost-logo.png');
        });
    });
});
