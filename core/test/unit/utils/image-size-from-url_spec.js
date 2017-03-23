var should = require('should'),
    Promise = require('bluebird'),
    rewire = require('rewire'),
    nock = require('nock'),
    sinon = require('sinon'),
    config = require('../../../server/config'),
    configUtils = require('../../utils/configUtils'),

    // Stuff we are testing
    imageSize = rewire('../../../server/utils/image-size-from-url');

describe('Image Size', function () {
    var sizeOfStub,
        result,
        requestMock;

    beforeEach(function () {
        sizeOfStub = sinon.stub();
    });

    afterEach(function () {
        sinon.restore();
        configUtils.restore();
    });

    it('should have an image size function', function () {
        should.exist(imageSize);
    });

    it('should return image dimensions with http request', function (done) {
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

        sizeOfStub.returns({width: 50, height: 50, type: 'jpg'});
        imageSize.__set__('sizeOf', sizeOfStub);

        result = Promise.resolve(imageSize.getImageSizeFromUrl(url)).then(function (res) {
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

    it('should return image dimensions with https request', function (done) {
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
                data: '<Buffer 2c be a4 40 f7 87 73 1e 57 2c c1 e4 0d 79 03 95 42 f0 42 2e 41 95 27 c9 5c 35 a7 71 2c 09 5a 57 d3 04 1e 83 03 28 07 96 b0 c8 88 65 07 7a d1 d6 63 50>'
            });

        sizeOfStub.returns({width: 256, height: 256, type: 'png'});
        imageSize.__set__('sizeOf', sizeOfStub);

        result = Promise.resolve(imageSize.getImageSizeFromUrl(url)).then(function (res) {
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

    it('should return image dimensions for gravatar images request', function (done) {
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
                data: '<Buffer 2c be a4 40 f7 87 73 1e 57 2c c1 e4 0d 79 03 95 42 f0 42 2e 41 95 27 c9 5c 35 a7 71 2c 09 5a 57 d3 04 1e 83 03 28 07 96 b0 c8 88 65 07 7a d1 d6 63 50>'
            });

        sizeOfStub.returns({width: 250, height: 250, type: 'jpg'});
        imageSize.__set__('sizeOf', sizeOfStub);

        result = Promise.resolve(imageSize.getImageSizeFromUrl(url)).then(function (res) {
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

    it('should return image dimensions relative url request', function (done) {
        var url = '/content/images/cat.jpg',
            urlForStub,
            expectedImageObject =
                {
                    height: 100,
                    url: '/content/images/cat.jpg',
                    width: 100
                };

        urlForStub = sinon.stub(config, 'urlFor');
        urlForStub.withArgs('image').returns('http://myblog.com/content/images/cat.jpg');

        requestMock = nock('http://myblog.com')
            .get('/content/images/cat.jpg')
            .reply(200, {
                data: '<Buffer 2c be a4 40 f7 87 73 1e 57 2c c1 e4 0d 79 03 95 42 f0 42 2e 41 95 27 c9 5c 35 a7 71 2c 09 5a 57 d3 04 1e 83 03 28 07 96 b0 c8 88 65 07 7a d1 d6 63 50>'
            });

        sizeOfStub.returns({width: 100, height: 100, type: 'jpg'});
        imageSize.__set__('sizeOf', sizeOfStub);

        result = Promise.resolve(imageSize.getImageSizeFromUrl(url)).then(function (res) {
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

    it('can handle an error a statuscode not 200', function (done) {
        var url = 'http://noimagehere.com/files/f/feedough/x/11/1540353_20925115.jpg';

        requestMock = nock('http://noimagehere.com')
            .get('/files/f/feedough/x/11/1540353_20925115.jpg')
            .reply(404);

        result = Promise.resolve(imageSize.getImageSizeFromUrl(url))
        .catch(function (err) {
            requestMock.isDone().should.be.true();
            should.exist(err);
            done();
        });
    });

    it('will timeout', function (done) {
        var url = 'https://static.wixstatic.com/media/355241_d31358572a2542c5a44738ddcb59e7ea.jpg_256';
        requestMock = nock('https://static.wixstatic.com')
            .get('/media/355241_d31358572a2542c5a44738ddcb59e7ea.jpg_256')
            .socketDelay(11)
            .reply(408);

        configUtils.set({
            times: {
                getImageSizeTimeoutInMS: 10
            }
        });

        result = Promise.resolve(imageSize.getImageSizeFromUrl(url))
        .catch(function (err) {
            requestMock.isDone().should.be.true();
            should.exist(err);
            done();
        });
    });

    it('returns error if \`image-size`\ module throws error', function (done) {
        var url = 'https://static.wixstatic.com/media/355241_d31358572a2542c5a44738ddcb59e7ea.jpg_256',

        requestMock = nock('https://static.wixstatic.com')
            .get('/media/355241_d31358572a2542c5a44738ddcb59e7ea.jpg_256')
            .reply(200, {
                data: '<Buffer 2c be a4 40 f7 87 73 1e 57 2c c1 e4 0d 79 03 95 42 f0 42 2e 41 95 27 c9 5c 35 a7 71 2c 09 5a 57 d3 04 1e 83 03 28 07 96 b0 c8 88 65 07 7a d1 d6 63 50>'
            });

        sizeOfStub.throws({error: 'image-size could not find dimensions'});
        imageSize.__set__('sizeOf', sizeOfStub);

        result = Promise.resolve(imageSize.getImageSizeFromUrl(url))
        .catch(function (err) {
            requestMock.isDone().should.be.true();
            should.exist(err);
            done();
        });
    });

    it('returns error if request errors', function (done) {
        var url = 'https://notarealwebsite.com/images/notapicture.jpg',

        requestMock = nock('https://notarealwebsite.com')
            .get('/images/notapicture.jpg')
            .replyWithError({message: 'something awful happened', code: 'AWFUL_ERROR'});

        result = Promise.resolve(imageSize.getImageSizeFromUrl(url))
        .catch(function (err) {
            requestMock.isDone().should.be.true();
            should.exist(err);
            done();
        });
    });
});
