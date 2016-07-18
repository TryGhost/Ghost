var should = require('should'),
    Promise = require('bluebird'),
    rewire = require('rewire'),
    nock = require('nock'),
    sinon = require('sinon'),

    // Stuff we are testing
    imageSize = rewire('../../../server/utils/image-size-from-url');

describe('Image Size', function () {
    var sizeOfStub,
        result,
        requestMock,
        getImageSizeFromUrlStub;

    beforeEach(function () {
        sizeOfStub = sinon.stub();
    });

    afterEach(function () {
        sinon.restore();
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
        getImageSizeFromUrlStub = imageSize.__set__('sizeOf', sizeOfStub);

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
            .reply(200);

        sizeOfStub.returns({width: 256, height: 256, type: 'png'});
        getImageSizeFromUrlStub = imageSize.__set__('sizeOf', sizeOfStub);

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

    it('can handle an error', function (done) {
        var url = 'http://noimagehere.com/files/f/feedough/x/11/1540353_20925115.jpg';

        nock('http://noimagehere.com')
            .get('/files/f/feedough/x/11/1540353_20925115.jpg')
            .reply(404);

        result = Promise.resolve(imageSize.getImageSizeFromUrl(url)).then(function (res) {
            should.exist(res);
            should.not.exist(res.width);
            should.not.exist(res.height);
            should.not.exist(res.url);
            res.should.be.equal(url);
            done();
        }).catch(done);
    });

    it('will timeout', function (done) {
        var url = 'https://static.wixstatic.com/media/355241_d31358572a2542c5a44738ddcb59e7ea.jpg_256';
        nock('https://static.wixstatic.com')
            .get('/media/355241_d31358572a2542c5a44738ddcb59e7ea.jpg_256')
            .delay(11)
            .reply(200);

        result = Promise.resolve(imageSize.getImageSizeFromUrl(url, 10)).then(function (res) {
            should.exist(res);
            should.not.exist(res.width);
            should.not.exist(res.height);
            should.not.exist(res.url);
            res.should.be.equal(url);
            done();
        }).catch(done);
    });

    it('returns image url if \`image-size`\ module throws error', function (done) {
        var url = 'https://static.wixstatic.com/media/355241_d31358572a2542c5a44738ddcb59e7ea.jpg_256',

        requestMock = nock('https://static.wixstatic.com')
            .get('/media/355241_d31358572a2542c5a44738ddcb59e7ea.jpg_256')
            .reply(200);

        sizeOfStub.throws('error');
        getImageSizeFromUrlStub = imageSize.__set__('sizeOf', sizeOfStub);

        result = Promise.resolve(imageSize.getImageSizeFromUrl(url)).then(function (res) {
            requestMock.isDone().should.be.true();
            should.exist(res);
            should.not.exist(res.width);
            should.not.exist(res.height);
            should.not.exist(res.url);
            res.should.be.equal(url);
            done();
        }).catch(done);
    });

    it('returns image url if request errors', function (done) {
        var url = 'https://notarealwebsite.com/images/notapicture.jpg',

        requestMock = nock('https://notarealwebsite.com')
            .get('/images/notapicture.jpg')
            .replyWithError({message: 'something awful happened', code: 'AWFUL_ERROR'});

        result = Promise.resolve(imageSize.getImageSizeFromUrl(url)).then(function (res) {
            requestMock.isDone().should.be.true();
            should.exist(res);
            should.not.exist(res.width);
            should.not.exist(res.height);
            should.not.exist(res.url);
            res.should.be.equal(url);
            done();
        }).catch(done);
    });
});
