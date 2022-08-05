const errors = require('@tryghost/errors');
const should = require('should');
const sinon = require('sinon');
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

    it('should read from cache, if dimensions for image are fetched already', async function () {
        const url = 'http://mysite.com/content/image/mypostcoverimage.jpg';
        let imageSizeSpy;

        sizeOfStub.resolves({
            width: 50,
            height: 50,
            type: 'jpg'
        });

        const cachedImageSizeFromUrl = new CachedImageSizeFromUrl({
            getImageSizeFromUrl: sizeOfStub,
            cache: new Map()
        });

        imageSizeSpy = sizeOfStub;

        await cachedImageSizeFromUrl.getCachedImageSizeFromUrl(url);

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
        await cachedImageSizeFromUrl.getCachedImageSizeFromUrl(url);

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
    });

    it('can handle generic image-size errors', async function () {
        const url = 'http://mysite.com/content/image/mypostcoverimage.jpg';

        sizeOfStub.rejects('error');

        const cachedImageSizeFromUrl = new CachedImageSizeFromUrl({
            getImageSizeFromUrl: sizeOfStub,
            cache: new Map()
        });

        await cachedImageSizeFromUrl.getCachedImageSizeFromUrl(url);

        cachedImagedSize = cachedImageSizeFromUrl.cache;
        should.exist(cachedImagedSize);
        cachedImagedSize.has(url).should.be.true;
        const image = cachedImagedSize.get(url);
        should.not.exist(image.width);
        should.not.exist(image.height);
    });

    it('can handle NotFoundError error', async function () {
        const url = 'http://mysite.com/content/image/mypostcoverimage.jpg';

        sizeOfStub.rejects(new errors.NotFoundError('it iz gone mate!'));

        const cachedImageSizeFromUrl = new CachedImageSizeFromUrl({
            getImageSizeFromUrl: sizeOfStub,
            cache: new Map()
        });

        await cachedImageSizeFromUrl.getCachedImageSizeFromUrl(url);

        cachedImagedSize = cachedImageSizeFromUrl.cache;
        should.exist(cachedImagedSize);
        cachedImagedSize.has(url).should.be.true;
        const image = cachedImagedSize.get(url);
        should.not.exist(image.width);
        should.not.exist(image.height);
    });

    it('should return null if url is undefined', async function () {
        const cachedImageSizeFromUrl = new CachedImageSizeFromUrl({
            imageSize: {},
            cache: new Map()
        });
        const url = null;
        let result;

        result = await cachedImageSizeFromUrl.getCachedImageSizeFromUrl(url);

        should.not.exist(result);
    });
});
