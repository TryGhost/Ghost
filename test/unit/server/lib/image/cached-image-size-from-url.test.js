const should = require('should');
const sinon = require('sinon');
const Promise = require('bluebird');
const CachedImageSizeFromUrl = require('../../../../../core/server/lib/image/cached-image-size-from-url');

describe('lib/image: image size cache', function () {
    let sizeOfStub;
    let cachedImagedSize;

    beforeEach(function () {
        sizeOfStub = sinon.stub();
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should read from cache, if dimensions for image are fetched already', function (done) {
        const url = 'http://mysite.com/content/image/mypostcoverimage.jpg';
        let cachedImagedSizeResult;
        let imageSizeSpy;

        sizeOfStub.returns(new Promise.resolve({
            width: 50,
            height: 50,
            type: 'jpg'
        }));

        const cachedImageSizeFromUrl = new CachedImageSizeFromUrl({logging: {
            error: () => {}
        }, imageSize: {
            getImageSizeFromUrl: sizeOfStub
        }});

        imageSizeSpy = sizeOfStub;

        cachedImagedSizeResult = Promise.resolve(cachedImageSizeFromUrl.getCachedImageSizeFromUrl(url));
        cachedImagedSizeResult.then(function () {
            // first call to get result from `getImageSizeFromUrl`
            cachedImagedSize = cachedImageSizeFromUrl.cache;
            should.exist(cachedImagedSize);
            cachedImagedSize.has(url).should.be.true;
            const image = cachedImagedSize.get(url);
            should.exist(image.width);
            image.width.should.be.equal(50);
            should.exist(image.height);
            image.height.should.be.equal(50);

            // second call to check if values get returned from cache
            cachedImagedSizeResult = Promise.resolve(cachedImageSizeFromUrl.getCachedImageSizeFromUrl(url));
            cachedImagedSizeResult.then(function () {
                imageSizeSpy.calledOnce.should.be.true();
                imageSizeSpy.calledTwice.should.be.false();
                cachedImagedSize = cachedImageSizeFromUrl.cache;
                should.exist(cachedImagedSize);
                cachedImagedSize.has(url).should.be.true;
                const image2 = cachedImagedSize.get(url);
                should.exist(image2.width);
                image2.width.should.be.equal(50);
                should.exist(image2.height);
                image2.height.should.be.equal(50);
                done();
            });
        }).catch(done);
    });

    it('can handle image-size errors', function (done) {
        const url = 'http://mysite.com/content/image/mypostcoverimage.jpg';
        let cachedImageSizeResult;

        sizeOfStub.returns(new Promise.reject('error'));

        const cachedImageSizeFromUrl = new CachedImageSizeFromUrl({logging: {
            error: () => {}
        }, imageSize: {
            getImageSizeFromUrl: sizeOfStub
        }});

        cachedImageSizeResult = Promise.resolve(cachedImageSizeFromUrl.getCachedImageSizeFromUrl(url));
        cachedImageSizeResult.then(function () {
            cachedImagedSize = cachedImageSizeFromUrl.cache;
            should.exist(cachedImagedSize);
            cachedImagedSize.has(url).should.be.true;
            const image = cachedImagedSize.get(url);
            should.not.exist(image.width);
            should.not.exist(image.height);
            done();
        }).catch(done);
    });

    it('should return null if url is undefined', function (done) {
        const cachedImageSizeFromUrl = new CachedImageSizeFromUrl({logging: {}, imageSize: {}});
        const url = null;
        let result;

        result = cachedImageSizeFromUrl.getCachedImageSizeFromUrl(url);

        should.not.exist(result);
        done();
    });
});
