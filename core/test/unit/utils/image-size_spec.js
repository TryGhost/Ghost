var should = require('should'),
    sinon = require('sinon'),
    rewire = require('rewire'),
    nock = require('nock'),
    configUtils = require('../../utils/configUtils'),
    utils = require('../../../server/utils'),
    storage = require('../../../server/adapters/storage'),
    path = require('path'),

    // Stuff we are testing
    imageSize = rewire('../../../server/utils/image-size'),

    sandbox = sinon.sandbox.create();

describe('Image Size', function () {
    var sizeOfStub,
        result,
        requestMock,
        secondRequestMock,
        originalStoragePath;

    beforeEach(function () {
        originalStoragePath = storage.getStorage().storagePath;
    });

    afterEach(function () {
        sandbox.restore();
        configUtils.restore();
        imageSize = rewire('../../../server/utils/image-size');
        storage.getStorage().storagePath = originalStoragePath;
    });

    it('[success] should have an image size function', function () {
        should.exist(imageSize.getImageSizeFromUrl);
        should.exist(imageSize.getImageSizeFromFilePath);
    });

    describe('getImageSizeFromUrl', function () {
        it('[success] should return image dimensions with http request', function (done) {
            var url = 'http://img.stockfresh.com/files/f/feedough/x/11/1540353_20925115.jpg',
                expectedImageObject =
                {
                    height: 50,
                    url: 'http://img.stockfresh.com/files/f/feedough/x/11/1540353_20925115.jpg',
                    width: 50
                };

            requestMock = nock('http://img.stockfresh.com')
                .get('/files/f/feedough/x/11/1540353_20925115.jpg')
                .reply(200);

            sizeOfStub = sandbox.stub();
            sizeOfStub.returns({width: 50, height: 50, type: 'jpg'});
            imageSize.__set__('sizeOf', sizeOfStub);

            result = imageSize.getImageSizeFromUrl(url).then(function (res) {
                requestMock.isDone().should.be.true();
                should.exist(res);
                should.exist(res.width);
                res.width.should.be.equal(expectedImageObject.width);
                should.exist(res.height);
                res.height.should.be.equal(expectedImageObject.height);
                should.exist(res.url);
                res.url.should.be.equal(expectedImageObject.url);
                done();
            }).catch(done);
        });

        it('[success] should return image dimensions with https request', function (done) {
            var url = 'https://static.wixstatic.com/media/355241_d31358572a2542c5a44738ddcb59e7ea.jpg_256',
                expectedImageObject =
                {
                    height: 256,
                    url: 'https://static.wixstatic.com/media/355241_d31358572a2542c5a44738ddcb59e7ea.jpg_256',
                    width: 256
                };

            requestMock = nock('https://static.wixstatic.com')
                .get('/media/355241_d31358572a2542c5a44738ddcb59e7ea.jpg_256')
                .reply(200, {
                    body: '<Buffer 2c be a4 40 f7 87 73 1e 57 2c c1 e4 0d 79 03 95 42 f0 42 2e 41 95 27 c9 5c 35 a7 71 2c 09 5a 57 d3 04 1e 83 03 28 07 96 b0 c8 88 65 07 7a d1 d6 63 50>'
                });

            sizeOfStub = sandbox.stub();
            sizeOfStub.returns({width: 256, height: 256, type: 'png'});
            imageSize.__set__('sizeOf', sizeOfStub);

            result = imageSize.getImageSizeFromUrl(url).then(function (res) {
                requestMock.isDone().should.be.true();
                should.exist(res);
                should.exist(res.width);
                res.width.should.be.equal(expectedImageObject.width);
                should.exist(res.height);
                res.height.should.be.equal(expectedImageObject.height);
                should.exist(res.url);
                res.url.should.be.equal(expectedImageObject.url);
                done();
            }).catch(done);
        });

        it('[success] should returns largest image value for .ico files', function (done) {
            var url = 'https://super-website.com/media/icon.ico',
                expectedImageObject =
                {
                    height: 48,
                    url: 'https://super-website.com/media/icon.ico',
                    width: 48
                };

            requestMock = nock('https://super-website.com')
                .get('/media/icon.ico')
                .reply(200, {
                    body: '<Buffer 2c be a4 40 f7 87 73 1e 57 2c c1 e4 0d 79 03 95 42 f0 42 2e 41 95 27 c9 5c 35 a7 71 2c 09 5a 57 d3 04 1e 83 03 28 07 96 b0 c8 88 65 07 7a d1 d6 63 50>'
                });

            sizeOfStub = sandbox.stub();
            sizeOfStub.returns({
                width: 32,
                height: 32,
                type: 'ico',
                images: [
                    {width: 48, height: 48},
                    {width: 32, height: 32},
                    {width: 16, height: 16}
                ]
            });
            imageSize.__set__('sizeOf', sizeOfStub);

            result = imageSize.getImageSizeFromUrl(url).then(function (res) {
                requestMock.isDone().should.be.true();
                should.exist(res);
                should.exist(res.width);
                res.width.should.be.equal(expectedImageObject.width);
                should.exist(res.height);
                res.height.should.be.equal(expectedImageObject.height);
                should.exist(res.url);
                res.url.should.be.equal(expectedImageObject.url);
                done();
            }).catch(done);
        });

        it('[success] should return image dimensions asset path images', function (done) {
            var url = '/assets/img/logo.png?v=d30c3d1e41',
                urlForStub,
                urlGetSubdirStub,
                expectedImageObject =
                {
                    height: 100,
                    url: 'http://myblog.com/assets/img/logo.png?v=d30c3d1e41',
                    width: 100
                };

            urlForStub = sandbox.stub(utils.url, 'urlFor');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sandbox.stub(utils.url, 'getSubdir');
            urlGetSubdirStub.returns('');

            requestMock = nock('http://myblog.com')
                .get('/assets/img/logo.png?v=d30c3d1e41')
                .reply(200, {
                    body: '<Buffer 2c be a4 40 f7 87 73 1e 57 2c c1 e4 0d 79 03 95 42 f0 42 2e 41 95 27 c9 5c 35 a7 71 2c 09 5a 57 d3 04 1e 83 03 28 07 96 b0 c8 88 65 07 7a d1 d6 63 50>'
                });

            sizeOfStub = sandbox.stub();
            sizeOfStub.returns({width: 100, height: 100, type: 'svg'});
            imageSize.__set__('sizeOf', sizeOfStub);

            result = imageSize.getImageSizeFromUrl(url).then(function (res) {
                requestMock.isDone().should.be.true();
                should.exist(res);
                should.exist(res.width);
                res.width.should.be.equal(expectedImageObject.width);
                should.exist(res.height);
                res.height.should.be.equal(expectedImageObject.height);
                should.exist(res.url);
                res.url.should.be.equal(expectedImageObject.url);
                done();
            }).catch(done);
        });

        it('[success] should return image dimensions for gravatar images request', function (done) {
            var url = '//www.gravatar.com/avatar/ef6dcde5c99bb8f685dd451ccc3e050a?s=250&d=mm&r=x',
                expectedImageObject =
                {
                    height: 250,
                    url: '//www.gravatar.com/avatar/ef6dcde5c99bb8f685dd451ccc3e050a?s=250&d=mm&r=x',
                    width: 250
                };

            requestMock = nock('http://www.gravatar.com')
                .get('/avatar/ef6dcde5c99bb8f685dd451ccc3e050a?s=250&d=mm&r=x')
                .reply(200, {
                    body: '<Buffer 2c be a4 40 f7 87 73 1e 57 2c c1 e4 0d 79 03 95 42 f0 42 2e 41 95 27 c9 5c 35 a7 71 2c 09 5a 57 d3 04 1e 83 03 28 07 96 b0 c8 88 65 07 7a d1 d6 63 50>'
                });

            sizeOfStub = sandbox.stub();
            sizeOfStub.returns({width: 250, height: 250, type: 'jpg'});
            imageSize.__set__('sizeOf', sizeOfStub);

            result = imageSize.getImageSizeFromUrl(url).then(function (res) {
                requestMock.isDone().should.be.true();
                should.exist(res);
                should.exist(res.width);
                res.width.should.be.equal(expectedImageObject.width);
                should.exist(res.height);
                res.height.should.be.equal(expectedImageObject.height);
                should.exist(res.url);
                res.url.should.be.equal(expectedImageObject.url);
                done();
            }).catch(done);
        });

        it('[success] can handle redirect', function (done) {
            var url = 'http://noimagehere.com/files/f/feedough/x/11/1540353_20925115.jpg',
                expectedImageObject =
                {
                    height: 100,
                    url: 'http://noimagehere.com/files/f/feedough/x/11/1540353_20925115.jpg',
                    width: 100
                };

            requestMock = nock('http://noimagehere.com')
                .get('/files/f/feedough/x/11/1540353_20925115.jpg')
                .reply(301, {
                    body: '<Buffer 2c be a4 40 f7 87 73 1e 57 2c c1 e4 0d 79 03 95 42 f0 42 2e 41 95 27 c9 5c 35 a7 71 2c 09 5a 57 d3 04 1e 83 03 28 07 96 b0 c8 88 65 07 7a d1 d6 63 50>'
                },
                {
                    location: 'http://someredirectedurl.com/files/f/feedough/x/11/1540353_20925115.jpg'
                });

            secondRequestMock = nock('http://someredirectedurl.com')
                .get('/files/f/feedough/x/11/1540353_20925115.jpg')
                .reply(200, {
                    body: '<Buffer 2c be a4 40 f7 87 73 1e 57 2c c1 e4 0d 79 03 95 42 f0 42 2e 41 95 27 c9 5c 35 a7 71 2c 09 5a 57 d3 04 1e 83 03 28 07 96 b0 c8 88 65 07 7a d1 d6 63 50>'
                });

            sizeOfStub.returns({width: 100, height: 100, type: 'jpg'});
            imageSize.__set__('sizeOf', sizeOfStub);

            result = imageSize.getImageSizeFromUrl(url).then(function (res) {
                requestMock.isDone().should.be.true();
                secondRequestMock.isDone().should.be.true();
                should.exist(res);
                should.exist(res.width);
                res.width.should.be.equal(expectedImageObject.width);
                should.exist(res.height);
                res.height.should.be.equal(expectedImageObject.height);
                should.exist(res.url);
                res.url.should.be.equal(expectedImageObject.url);
                done();
            }).catch(done);
        });

        it('[success] should switch to local file storage if available', function (done) {
            var url = '/content/images/favicon.png',
                urlForStub,
                urlGetSubdirStub,
                expectedImageObject =
                {
                    height: 100,
                    url: 'http://myblog.com/content/images/favicon.png',
                    width: 100
                };

            storage.getStorage().storagePath = path.join(__dirname, '../../../test/utils/fixtures/images/');
            urlForStub = sandbox.stub(utils.url, 'urlFor');
            urlForStub.withArgs('image').returns('http://myblog.com/content/images/favicon.png');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sandbox.stub(utils.url, 'getSubdir');
            urlGetSubdirStub.returns('');

            requestMock = nock('http://myblog.com')
                .get('/content/images/favicon.png')
                .reply(200, {
                    body: '<Buffer 2c be a4 40 f7 87 73 1e 57 2c c1 e4 0d 79 03 95 42 f0 42 2e 41 95 27 c9 5c 35 a7 71 2c 09 5a 57 d3 04 1e 83 03 28 07 96 b0 c8 88 65 07 7a d1 d6 63 50>'
                });

            result = imageSize.getImageSizeFromUrl(url).then(function (res) {
                requestMock.isDone().should.be.false();
                should.exist(res);
                should.exist(res.width);
                res.width.should.be.equal(expectedImageObject.width);
                should.exist(res.height);
                res.height.should.be.equal(expectedImageObject.height);
                should.exist(res.url);
                res.url.should.be.equal(expectedImageObject.url);
                done();
            }).catch(done);
        });

        it('[failure] can handle an error with statuscode not 200', function (done) {
            var url = 'http://noimagehere.com/files/f/feedough/x/11/1540353_20925115.jpg';

            requestMock = nock('http://noimagehere.com')
                .get('/files/f/feedough/x/11/1540353_20925115.jpg')
                .reply(404);

            result = imageSize.getImageSizeFromUrl(url)
                .catch(function (err) {
                    requestMock.isDone().should.be.true();
                    should.exist(err);
                    done();
                });
        });

        it('[failure] will timeout', function (done) {
            var url = 'https://static.wixstatic.com/media/355241_d31358572a2542c5a44738ddcb59e7ea.jpg_256';

            requestMock = nock('https://static.wixstatic.com')
                .get('/media/355241_d31358572a2542c5a44738ddcb59e7ea.jpg_256')
                .socketDelay(11)
                .reply(408);

            configUtils.set('times:getImageSizeTimeoutInMS', 10);
            result = imageSize.getImageSizeFromUrl(url)
                .catch(function (err) {
                    requestMock.isDone().should.be.true();
                    should.exist(err);
                    done();
                });
        });

        it('[failure] returns error if \`image-size`\ module throws error', function (done) {
            var url = 'https://static.wixstatic.com/media/355241_d31358572a2542c5a44738ddcb59e7ea.jpg_256';

            requestMock = nock('https://static.wixstatic.com')
                .get('/media/355241_d31358572a2542c5a44738ddcb59e7ea.jpg_256')
                .reply(200, {
                    body: '<Buffer 2c be a4 40 f7 87 73 1e 57 2c c1 e4 0d 79 03 95 42 f0 42 2e 41 95 27 c9 5c 35 a7 71 2c 09 5a 57 d3 04 1e 83 03 28 07 96 b0 c8 88 65 07 7a d1 d6 63 50>'
                });

            sizeOfStub = sandbox.stub();
            sizeOfStub.throws({error: 'image-size could not find dimensions'});
            imageSize.__set__('sizeOf', sizeOfStub);

            result = imageSize.getImageSizeFromUrl(url)
                .catch(function (err) {
                    requestMock.isDone().should.be.true();
                    should.exist(err);
                    done();
                });
        });

        it('[failure] returns error if request errors', function (done) {
            var url = 'https://notarealwebsite.com/images/notapicture.jpg';

            requestMock = nock('https://notarealwebsite.com')
                .get('/images/notapicture.jpg')
                .reply(404, {message: 'something awful happened', code: 'AWFUL_ERROR'});

            result = imageSize.getImageSizeFromUrl(url)
                .catch(function (err) {
                    requestMock.isDone().should.be.true();
                    should.exist(err);
                    done();
                });
        });
    });

    describe('getImageSizeFromFilePath', function () {
        it('[success] should return image dimensions for locally stored images', function (done) {
            var url = '/content/images/ghost-logo.png',
                urlForStub,
                urlGetSubdirStub,
                expectedImageObject =
                {
                    height: 257,
                    url: 'http://myblog.com/content/images/ghost-logo.png',
                    width: 800
                };

            storage.getStorage().storagePath = path.join(__dirname, '../../../test/utils/fixtures/images/');
            urlForStub = sandbox.stub(utils.url, 'urlFor');
            urlForStub.withArgs('image').returns('http://myblog.com/content/images/ghost-logo.png');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sandbox.stub(utils.url, 'getSubdir');
            urlGetSubdirStub.returns('');

            result = imageSize.getImageSizeFromFilePath(url).then(function (res) {
                should.exist(res);
                should.exist(res.width);
                res.width.should.be.equal(expectedImageObject.width);
                should.exist(res.height);
                res.height.should.be.equal(expectedImageObject.height);
                should.exist(res.url);
                res.url.should.be.equal(expectedImageObject.url);
                done();
            }).catch(done);
        });

        it('[success] should return image dimensions for locally stored images with subdirectory', function (done) {
            var url = '/content/images/favicon_too_large.png',
                urlForStub,
                urlGetSubdirStub,
                expectedImageObject =
                {
                    height: 1010,
                    url: 'http://myblog.com/blog/content/images/favicon_too_large.png',
                    width: 1010
                };

            storage.getStorage().storagePath = path.join(__dirname, '../../../test/utils/fixtures/images/');
            urlForStub = sandbox.stub(utils.url, 'urlFor');
            urlForStub.withArgs('image').returns('http://myblog.com/blog/content/images/favicon_too_large.png');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sandbox.stub(utils.url, 'getSubdir');
            urlGetSubdirStub.returns('/blog');

            result = imageSize.getImageSizeFromFilePath(url).then(function (res) {
                should.exist(res);
                should.exist(res.width);
                res.width.should.be.equal(expectedImageObject.width);
                should.exist(res.height);
                res.height.should.be.equal(expectedImageObject.height);
                should.exist(res.url);
                res.url.should.be.equal(expectedImageObject.url);
                done();
            }).catch(done);
        });

        it('[success] should return largest image dimensions for locally stored .ico image', function (done) {
            var url = 'http://myblog.com/content/images/favicon_multi_sizes.ico',
                urlForStub,
                urlGetSubdirStub,
                expectedImageObject =
                {
                    height: 64,
                    url: 'http://myblog.com/content/images/favicon_multi_sizes.ico',
                    width: 64
                };

            storage.getStorage().storagePath = path.join(__dirname, '../../../test/utils/fixtures/images/');
            urlForStub = sandbox.stub(utils.url, 'urlFor');
            urlForStub.withArgs('image').returns('http://myblog.com/content/images/favicon_multi_sizes.ico');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sandbox.stub(utils.url, 'getSubdir');
            urlGetSubdirStub.returns('');

            result = imageSize.getImageSizeFromFilePath(url).then(function (res) {
                should.exist(res);
                should.exist(res.width);
                res.width.should.be.equal(expectedImageObject.width);
                should.exist(res.height);
                res.height.should.be.equal(expectedImageObject.height);
                should.exist(res.url);
                res.url.should.be.equal(expectedImageObject.url);
                done();
            }).catch(done);
        });

        it('[failure] returns error if storage adapter errors', function (done) {
            var url = '/content/images/not-existing-image.png',
                urlForStub,
                urlGetSubdirStub;

            storage.getStorage().storagePath = path.join(__dirname, '../../../test/utils/fixtures/images/');
            urlForStub = sandbox.stub(utils.url, 'urlFor');
            urlForStub.withArgs('image').returns('http://myblog.com/content/images/not-existing-image.png');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sandbox.stub(utils.url, 'getSubdir');
            urlGetSubdirStub.returns('');

            result = imageSize.getImageSizeFromFilePath(url)
                .catch(function (err) {
                    should.exist(err);
                    err.message.should.match(/Could not read image:/);
                    done();
                });
        });

        it('[failure] returns error if \`image-size`\ module throws error', function (done) {
            var url = '/content/images/ghost-logo.pngx',
                urlForStub,
                urlGetSubdirStub;

            sizeOfStub = sandbox.stub();
            sizeOfStub.throws({error: 'image-size could not find dimensions'});
            imageSize.__set__('sizeOf', sizeOfStub);

            storage.getStorage().storagePath = path.join(__dirname, '../../../test/utils/fixtures/images/');
            urlForStub = sandbox.stub(utils.url, 'urlFor');
            urlForStub.withArgs('image').returns('http://myblog.com/content/images/ghost-logo.pngx');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            urlGetSubdirStub = sandbox.stub(utils.url, 'getSubdir');
            urlGetSubdirStub.returns('');

            result = imageSize.getImageSizeFromFilePath(url)
                .catch(function (err) {
                    should.exist(err);
                    err.error.should.be.equal('image-size could not find dimensions');
                    done();
                });
        });
    });
});
