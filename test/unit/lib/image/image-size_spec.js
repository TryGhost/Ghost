const should = require('should'),
    sinon = require('sinon'),
    rewire = require('rewire'),
    nock = require('nock'),
    path = require('path'),
    configUtils = require('../../../utils/configUtils'),
    urlUtils = require('../../../../core/server/lib/url-utils'),
    errors = require('@tryghost/errors'),
    storage = require('../../../../core/server/adapters/storage');

describe('lib/image: image size', function () {
    let imageSize;
    let sizeOf;
    let sizeOfSpy;
    let probeSizeOf;
    let probeSizeOfSpy;
    let originalStoragePath;

    // use a 1x1 gif in nock responses because it's really small and easy to work with
    const GIF1x1 = Buffer.from('R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', 'base64');

    beforeEach(function () {
        imageSize = rewire('../../../../core/server/lib/image/image-size');

        sizeOf = imageSize.__get__('sizeOf');
        sizeOfSpy = sinon.spy(sizeOf);

        probeSizeOf = imageSize.__get__('probeSizeOf');
        probeSizeOfSpy = sinon.spy(probeSizeOf);

        originalStoragePath = storage.getStorage().storagePath;
    });

    afterEach(function () {
        sinon.restore();
        configUtils.restore();
        storage.getStorage().storagePath = originalStoragePath;
    });

    it('[success] should have an image size function', function () {
        should.exist(imageSize.getImageSizeFromUrl);
        should.exist(imageSize.getImageSizeFromStoragePath);
    });

    describe('getImageSizeFromUrl', function () {
        it('[success] should return image dimensions from probe request for probe-supported extension', function (done) {
            const url = 'http://img.stockfresh.com/files/f/feedough/x/11/1540353_20925115.jpg';
            const expectedImageObject = {
                height: 1,
                url: 'http://img.stockfresh.com/files/f/feedough/x/11/1540353_20925115.jpg',
                width: 1
            };

            const requestMock = nock('http://img.stockfresh.com')
                .get('/files/f/feedough/x/11/1540353_20925115.jpg')
                .reply(200, GIF1x1);

            imageSize.getImageSizeFromUrl(url).then(function (res) {
                probeSizeOfSpy.should.have.been.called;
                sizeOfSpy.should.not.have.been.called;

                requestMock.isDone().should.be.true();
                should.exist(res);
                res.width.should.be.equal(expectedImageObject.width);
                res.height.should.be.equal(expectedImageObject.height);
                res.url.should.be.equal(expectedImageObject.url);
                done();
            }).catch(done);
        });

        it('[success] should return image dimensions from fetch request for non-probe-supported extension', function (done) {
            const url = 'https://static.wixstatic.com/media/355241_d31358572a2542c5a44738ddcb59e7ea.ico';
            const expectedImageObject = {
                height: 1,
                url: 'https://static.wixstatic.com/media/355241_d31358572a2542c5a44738ddcb59e7ea.ico',
                width: 1
            };

            const requestMock = nock('https://static.wixstatic.com')
                .get('/media/355241_d31358572a2542c5a44738ddcb59e7ea.ico')
                .reply(200, GIF1x1);

            imageSize.getImageSizeFromUrl(url).then(function (res) {
                sizeOfSpy.should.have.been.called;
                probeSizeOfSpy.should.not.have.been.called;

                requestMock.isDone().should.be.true();
                should.exist(res);
                res.width.should.be.equal(expectedImageObject.width);
                res.height.should.be.equal(expectedImageObject.height);
                res.url.should.be.equal(expectedImageObject.url);
                done();
            }).catch(done);
        });

        it('[success] should return image dimensions when no image extension given', function (done) {
            const url = 'https://www.zomato.com/logo/18163505/minilogo';
            const expectedImageObject = {
                height: 1,
                url: 'https://www.zomato.com/logo/18163505/minilogo',
                width: 1
            };

            const requestMock = nock('https://www.zomato.com')
                .get('/logo/18163505/minilogo')
                .reply(200, GIF1x1);

            imageSize.getImageSizeFromUrl(url).then(function (res) {
                probeSizeOfSpy.should.have.been.called;
                requestMock.isDone().should.be.true();
                should.exist(res);
                res.width.should.be.equal(expectedImageObject.width);
                res.height.should.be.equal(expectedImageObject.height);
                res.url.should.be.equal(expectedImageObject.url);
                done();
            }).catch(done);
        });

        it('[success] should returns largest image value for .ico files', function (done) {
            const url = 'https://super-website.com/media/icon.ico';
            const expectedImageObject = {
                height: 64,
                url: 'https://super-website.com/media/icon.ico',
                width: 64
            };

            const requestMock = nock('https://super-website.com')
                .get('/media/icon.ico')
                .replyWithFile(200, path.join(__dirname, '/../../../utils/fixtures/images/favicon_multi_sizes.ico'));

            imageSize.getImageSizeFromUrl(url).then(function (res) {
                requestMock.isDone().should.be.true();
                should.exist(res);
                res.width.should.be.equal(expectedImageObject.width);
                res.height.should.be.equal(expectedImageObject.height);
                res.url.should.be.equal(expectedImageObject.url);
                done();
            }).catch(done);
        });

        it('[success] should return image dimensions asset path images', function (done) {
            const url = '/assets/img/logo.png?v=d30c3d1e41';
            const expectedImageObject = {
                height: 1,
                url: 'http://myblog.com/assets/img/logo.png?v=d30c3d1e41',
                width: 1
            };

            const urlForStub = sinon.stub(urlUtils, 'urlFor');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            const urlGetSubdirStub = sinon.stub(urlUtils, 'getSubdir');
            urlGetSubdirStub.returns('');

            const requestMock = nock('http://myblog.com')
                .get('/assets/img/logo.png?v=d30c3d1e41')
                .reply(200, GIF1x1);

            imageSize.getImageSizeFromUrl(url).then(function (res) {
                probeSizeOfSpy.should.have.been.called;
                requestMock.isDone().should.be.true();
                should.exist(res);
                res.width.should.be.equal(expectedImageObject.width);
                res.height.should.be.equal(expectedImageObject.height);
                res.url.should.be.equal(expectedImageObject.url);
                done();
            }).catch(done);
        });

        it('[success] should return image dimensions for gravatar images request', function (done) {
            const url = '//www.gravatar.com/avatar/ef6dcde5c99bb8f685dd451ccc3e050a?s=250&d=mm&r=x';
            const expectedImageObject = {
                height: 1,
                url: '//www.gravatar.com/avatar/ef6dcde5c99bb8f685dd451ccc3e050a?s=250&d=mm&r=x',
                width: 1
            };

            const requestMock = nock('http://www.gravatar.com')
                .get('/avatar/ef6dcde5c99bb8f685dd451ccc3e050a?s=250&d=mm&r=x')
                .reply(200, GIF1x1);

            imageSize.getImageSizeFromUrl(url).then(function (res) {
                probeSizeOfSpy.should.have.been.called;
                requestMock.isDone().should.be.true();
                should.exist(res);
                res.width.should.be.equal(expectedImageObject.width);
                res.height.should.be.equal(expectedImageObject.height);
                res.url.should.be.equal(expectedImageObject.url);
                done();
            }).catch(done);
        });

        it('[success] can handle redirect (probe-image-size)', function (done) {
            const url = 'http://noimagehere.com/files/f/feedough/x/11/1540353_20925115.jpg';
            const expectedImageObject = {
                height: 1,
                url: 'http://noimagehere.com/files/f/feedough/x/11/1540353_20925115.jpg',
                width: 1
            };

            const requestMock = nock('http://noimagehere.com')
                .get('/files/f/feedough/x/11/1540353_20925115.jpg')
                .reply(301, null, {
                    location: 'http://someredirectedurl.com/files/f/feedough/x/11/1540353_20925115.jpg'
                });

            const secondRequestMock = nock('http://someredirectedurl.com')
                .get('/files/f/feedough/x/11/1540353_20925115.jpg')
                .reply(200, GIF1x1);

            imageSize.getImageSizeFromUrl(url).then(function (res) {
                probeSizeOfSpy.should.have.been.called;
                requestMock.isDone().should.be.true();
                secondRequestMock.isDone().should.be.true();
                should.exist(res);
                res.width.should.be.equal(expectedImageObject.width);
                res.height.should.be.equal(expectedImageObject.height);
                res.url.should.be.equal(expectedImageObject.url);
                done();
            }).catch(done);
        });

        it('[success] can handle redirect (image-size)', function (done) {
            const url = 'http://noimagehere.com/files/f/feedough/x/11/1540353_20925115.gif';
            const expectedImageObject = {
                height: 1,
                url: 'http://noimagehere.com/files/f/feedough/x/11/1540353_20925115.gif',
                width: 1
            };

            const requestMock = nock('http://noimagehere.com')
                .get('/files/f/feedough/x/11/1540353_20925115.gif')
                .reply(301, null, {
                    location: 'http://someredirectedurl.com/files/f/feedough/x/11/1540353_20925115.gif'
                });

            const secondRequestMock = nock('http://someredirectedurl.com')
                .get('/files/f/feedough/x/11/1540353_20925115.gif')
                .reply(200, GIF1x1);

            imageSize.getImageSizeFromUrl(url).then(function (res) {
                sizeOfSpy.should.have.been.called;
                requestMock.isDone().should.be.true();
                secondRequestMock.isDone().should.be.true();
                should.exist(res);
                res.width.should.be.equal(expectedImageObject.width);
                res.height.should.be.equal(expectedImageObject.height);
                res.url.should.be.equal(expectedImageObject.url);
                done();
            }).catch(done);
        });

        it('[success] should switch to local file storage if available', function (done) {
            const url = '/content/images/favicon.png';
            const expectedImageObject = {
                height: 100,
                url: 'http://myblog.com/content/images/favicon.png',
                width: 100
            };

            storage.getStorage().storagePath = path.join(__dirname, '../../../../test/utils/fixtures/images/');
            const urlForStub = sinon.stub(urlUtils, 'urlFor');
            urlForStub.withArgs('image').returns('http://myblog.com/content/images/favicon.png');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            const urlGetSubdirStub = sinon.stub(urlUtils, 'getSubdir');
            urlGetSubdirStub.returns('');

            const requestMock = nock('http://myblog.com')
                .get('/content/images/favicon.png')
                .reply(200, {
                    body: '<Buffer 2c be a4 40 f7 87 73 1e 57 2c c1 e4 0d 79 03 95 42 f0 42 2e 41 95 27 c9 5c 35 a7 71 2c 09 5a 57 d3 04 1e 83 03 28 07 96 b0 c8 88 65 07 7a d1 d6 63 50>'
                });

            imageSize.getImageSizeFromUrl(url).then(function (res) {
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

        it('[failure] can handle an error with statuscode not 200 (probe-image-size)', function (done) {
            const url = 'http://noimagehere.com/files/f/feedough/x/11/1540353_20925115.jpg';

            const requestMock = nock('http://noimagehere.com')
                .get('/files/f/feedough/x/11/1540353_20925115.jpg')
                .reply(404);

            imageSize.getImageSizeFromUrl(url)
                .catch(function (err) {
                    probeSizeOfSpy.should.have.been.called;
                    requestMock.isDone().should.be.true();
                    should.exist(err);
                    err.errorType.should.be.equal('NotFoundError');
                    err.message.should.be.equal('Image not found.');
                    done();
                });
        });

        it('[failure] can handle an error with statuscode not 200 (image-size)', function (done) {
            const url = 'http://noimagehere.com/files/f/feedough/x/11/1540353_20925115.gif';

            const requestMock = nock('http://noimagehere.com')
                .get('/files/f/feedough/x/11/1540353_20925115.gif')
                .reply(404);

            imageSize.getImageSizeFromUrl(url)
                .catch(function (err) {
                    sizeOfSpy.should.have.been.called;
                    requestMock.isDone().should.be.true();
                    should.exist(err);
                    err.errorType.should.be.equal('NotFoundError');
                    err.message.should.be.equal('Image not found.');
                    done();
                });
        });

        it('[failure] handles invalid URL', function (done) {
            const url = 'Not-a-valid-url';

            imageSize.getImageSizeFromUrl(url)
                .catch(function (err) {
                    should.exist(err);
                    err.errorType.should.be.equal('InternalServerError');
                    err.message.should.be.equal('URL empty or invalid.');
                    done();
                });
        });

        it('[failure] will timeout', function (done) {
            const url = 'https://static.wixstatic.com/media/355241_d31358572a2542c5a44738ddcb59e7ea.jpg_256';

            const requestMock = nock('https://static.wixstatic.com')
                .get('/media/355241_d31358572a2542c5a44738ddcb59e7ea.jpg_256')
                .socketDelay(11)
                .reply(408);

            configUtils.set('times:getImageSizeTimeoutInMS', 10);
            imageSize.getImageSizeFromUrl(url)
                .catch(function (err) {
                    requestMock.isDone().should.be.true();
                    should.exist(err);
                    err.errorType.should.be.equal('InternalServerError');
                    err.message.should.be.equal('Request timed out.');
                    done();
                });
        });

        it('[failure] returns error if \`probe-image-size`\ module throws error', function (done) {
            const url = 'https://static.wixstatic.com/media/355241_d31358572a2542c5a44738ddcb59e7ea.jpg';

            const probeSizeOfStub = sinon.stub();
            probeSizeOfStub.throws({error: 'probe-image-size could not find dimensions'});
            imageSize.__set__('probeSizeOf', probeSizeOfStub);

            imageSize.getImageSizeFromUrl(url)
                .then(() => {
                    true.should.be.false('succeeded when expecting failure');
                })
                .catch(function (err) {
                    should.exist(err);
                    err.errorType.should.be.equal('InternalServerError');
                    err.error.should.be.equal('probe-image-size could not find dimensions');
                    done();
                });
        });

        it('[failure] returns error if \`image-size`\ module throws error', function (done) {
            const url = 'https://static.wixstatic.com/media/355241_d31358572a2542c5a44738ddcb59e7ea.ico';

            const requestMock = nock('https://static.wixstatic.com')
                .get('/media/355241_d31358572a2542c5a44738ddcb59e7ea.ico')
                .reply(200, {
                    body: '<Buffer 2c be a4 40 f7 87 73 1e 57 2c c1 e4 0d 79 03 95 42 f0 42 2e 41 95 27 c9 5c 35 a7 71 2c 09 5a 57 d3 04 1e 83 03 28 07 96 b0 c8 88 65 07 7a d1 d6 63 50>'
                });

            const sizeOfStub = sinon.stub();
            sizeOfStub.throws({error: 'image-size could not find dimensions'});
            imageSize.__set__('sizeOf', sizeOfStub);

            imageSize.getImageSizeFromUrl(url)
                .then(() => {
                    true.should.be.false('succeeded when expecting failure');
                })
                .catch(function (err) {
                    requestMock.isDone().should.be.true();
                    should.exist(err);
                    err.errorType.should.be.equal('InternalServerError');
                    err.error.should.be.equal('image-size could not find dimensions');
                    done();
                });
        });

        it('[failure] returns error if request errors', function (done) {
            const url = 'https://notarealwebsite.com/images/notapicture.jpg';

            const requestMock = nock('https://notarealwebsite.com')
                .get('/images/notapicture.jpg')
                .reply(500, {message: 'something awful happened', code: 'AWFUL_ERROR'});

            imageSize.getImageSizeFromUrl(url)
                .catch(function (err) {
                    requestMock.isDone().should.be.true();
                    should.exist(err);
                    err.errorType.should.be.equal('InternalServerError');
                    err.message.should.be.equal('Unknown Request error.');
                    done();
                });
        });
    });

    describe('getImageSizeFromStoragePath', function () {
        it('[success] should return image dimensions for locally stored images', function (done) {
            const url = '/content/images/ghost-logo.png';
            const expectedImageObject = {
                height: 257,
                url: 'http://myblog.com/content/images/ghost-logo.png',
                width: 800
            };

            storage.getStorage().storagePath = path.join(__dirname, '../../../../test/utils/fixtures/images/');
            const urlForStub = sinon.stub(urlUtils, 'urlFor');
            urlForStub.withArgs('image').returns('http://myblog.com/content/images/ghost-logo.png');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            const urlGetSubdirStub = sinon.stub(urlUtils, 'getSubdir');
            urlGetSubdirStub.returns('');

            imageSize.getImageSizeFromStoragePath(url).then(function (res) {
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
            const url = '/content/images/favicon_too_large.png';
            const expectedImageObject = {
                height: 1010,
                url: 'http://myblog.com/blog/content/images/favicon_too_large.png',
                width: 1010
            };

            storage.getStorage().storagePath = path.join(__dirname, '../../../../test/utils/fixtures/images/');
            const urlForStub = sinon.stub(urlUtils, 'urlFor');
            urlForStub.withArgs('image').returns('http://myblog.com/blog/content/images/favicon_too_large.png');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            const urlGetSubdirStub = sinon.stub(urlUtils, 'getSubdir');
            urlGetSubdirStub.returns('/blog');

            imageSize.getImageSizeFromStoragePath(url).then(function (res) {
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
            const url = 'http://myblog.com/content/images/favicon_multi_sizes.ico';
            const expectedImageObject = {
                height: 64,
                url: 'http://myblog.com/content/images/favicon_multi_sizes.ico',
                width: 64
            };

            storage.getStorage().storagePath = path.join(__dirname, '../../../../test/utils/fixtures/images/');
            const urlForStub = sinon.stub(urlUtils, 'urlFor');
            urlForStub.withArgs('image').returns('http://myblog.com/content/images/favicon_multi_sizes.ico');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            const urlGetSubdirStub = sinon.stub(urlUtils, 'getSubdir');
            urlGetSubdirStub.returns('');

            imageSize.getImageSizeFromStoragePath(url).then(function (res) {
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
            const url = '/content/images/not-existing-image.png';

            storage.getStorage().storagePath = path.join(__dirname, '../../../../test/utils/fixtures/images/');
            const urlForStub = sinon.stub(urlUtils, 'urlFor');
            urlForStub.withArgs('image').returns('http://myblog.com/content/images/not-existing-image.png');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            const urlGetSubdirStub = sinon.stub(urlUtils, 'getSubdir');
            urlGetSubdirStub.returns('');

            imageSize.getImageSizeFromStoragePath(url)
                .catch(function (err) {
                    should.exist(err);
                    (err instanceof errors.NotFoundError).should.eql(true);
                    done();
                });
        });

        it('[failure] returns error if \`image-size`\ module throws error', function (done) {
            const url = '/content/images/ghost-logo.pngx';

            const sizeOfStub = sinon.stub();
            sizeOfStub.throws({error: 'image-size could not find dimensions'});
            imageSize.__set__('sizeOf', sizeOfStub);

            storage.getStorage().storagePath = path.join(__dirname, '../../../../test/utils/fixtures/images/');
            const urlForStub = sinon.stub(urlUtils, 'urlFor');
            urlForStub.withArgs('image').returns('http://myblog.com/content/images/ghost-logo.pngx');
            urlForStub.withArgs('home').returns('http://myblog.com/');
            const urlGetSubdirStub = sinon.stub(urlUtils, 'getSubdir');
            urlGetSubdirStub.returns('');

            imageSize.getImageSizeFromStoragePath(url)
                .catch(function (err) {
                    should.exist(err);
                    err.error.should.be.equal('image-size could not find dimensions');
                    done();
                });
        });
    });
});
