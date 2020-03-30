var should = require('should'),
    sinon = require('sinon'),
    Promise = require('bluebird'),
    rewire = require('rewire'),

    // Stuff we are testing
    getCachedImageSizeFromUrl = rewire('../../../../core/server/lib/image/cached-image-size-from-url');

describe('lib/image: image size cache', function () {
    var sizeOfStub,
        cachedImagedSize;

    beforeEach(function () {
        sizeOfStub = sinon.stub();
    });

    afterEach(function () {
        sinon.restore();
        getCachedImageSizeFromUrl.__set__('cache', {});
    });

    it('should read from cache, if dimensions for image are fetched already', function (done) {
        var url = 'http://mysite.com/content/image/mypostcoverimage.jpg',
            cachedImagedSizeResult,
            imageSizeSpy;

        sizeOfStub.returns(new Promise.resolve({
            width: 50,
            height: 50,
            type: 'jpg'
        }));

        getCachedImageSizeFromUrl.__set__('imageSize.getImageSizeFromUrl', sizeOfStub);

        imageSizeSpy = getCachedImageSizeFromUrl.__get__('imageSize.getImageSizeFromUrl');

        cachedImagedSizeResult = Promise.resolve(getCachedImageSizeFromUrl(url));
        cachedImagedSizeResult.then(function () {
            // first call to get result from `getImageSizeFromUrl`
            cachedImagedSize = getCachedImageSizeFromUrl.__get__('cache');
            should.exist(cachedImagedSize);
            cachedImagedSize.should.have.property(url);
            should.exist(cachedImagedSize[url].width);
            cachedImagedSize[url].width.should.be.equal(50);
            should.exist(cachedImagedSize[url].height);
            cachedImagedSize[url].height.should.be.equal(50);

            // second call to check if values get returned from cache
            cachedImagedSizeResult = Promise.resolve(getCachedImageSizeFromUrl(url));
            cachedImagedSizeResult.then(function () {
                cachedImagedSize = getCachedImageSizeFromUrl.__get__('cache');
                imageSizeSpy.calledOnce.should.be.true();
                imageSizeSpy.calledTwice.should.be.false();
                should.exist(cachedImagedSize);
                cachedImagedSize.should.have.property(url);
                should.exist(cachedImagedSize[url].width);
                cachedImagedSize[url].width.should.be.equal(50);
                should.exist(cachedImagedSize[url].height);
                cachedImagedSize[url].height.should.be.equal(50);

                done();
            });
        }).catch(done);
    });

    it('can handle image-size errors', function (done) {
        var url = 'http://mysite.com/content/image/mypostcoverimage.jpg',
            cachedImagedSizeResult;

        sizeOfStub.returns(new Promise.reject('error'));

        getCachedImageSizeFromUrl.__set__('imageSize.getImageSizeFromUrl', sizeOfStub);

        cachedImagedSizeResult = Promise.resolve(getCachedImageSizeFromUrl(url));
        cachedImagedSizeResult.then(function () {
            cachedImagedSize = getCachedImageSizeFromUrl.__get__('cache');
            should.exist(cachedImagedSize);
            cachedImagedSize.should.have.property(url);
            should.not.exist(cachedImagedSize[url].width);
            should.not.exist(cachedImagedSize[url].height);
            done();
        }).catch(done);
    });

    it('should return null if url is undefined', function (done) {
        var url = null,
            result;

        result = getCachedImageSizeFromUrl(url);

        should.not.exist(result);
        done();
    });
});
