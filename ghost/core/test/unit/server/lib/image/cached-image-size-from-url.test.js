const errors = require('@tryghost/errors');
const should = require('should');
const sinon = require('sinon');
const CachedImageSizeFromUrl = require('../../../../../core/server/lib/image/CachedImageSizeFromUrl');
const InMemoryCache = require('../../../../../core/server/adapters/cache/MemoryCache');
const logging = require('@tryghost/logging');

describe('lib/image: image size cache', function () {
    let sizeOfStub;

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

        const cacheStore = new InMemoryCache();
        const cachedImageSizeFromUrl = new CachedImageSizeFromUrl({
            getImageSizeFromUrl: sizeOfStub,
            cache: cacheStore
        });

        imageSizeSpy = sizeOfStub;

        await cachedImageSizeFromUrl.getCachedImageSizeFromUrl(url);

        // first call to get result from `getImageSizeFromUrl`

        should.exist(cacheStore);
        cacheStore.get(url).should.not.be.undefined;
        const image = cacheStore.get(url);
        should.exist(image.width);
        image.width.should.be.equal(50);
        should.exist(image.height);
        image.height.should.be.equal(50);

        // second call to check if values get returned from cache
        await cachedImageSizeFromUrl.getCachedImageSizeFromUrl(url);

        imageSizeSpy.calledOnce.should.be.true();
        imageSizeSpy.calledTwice.should.be.false();

        cacheStore.get(url).should.not.be.undefined;
        const image2 = cacheStore.get(url);
        should.exist(image2.width);
        image2.width.should.be.equal(50);
        should.exist(image2.height);
        image2.height.should.be.equal(50);
    });

    it('can handle generic image-size errors', async function () {
        const url = 'http://mysite.com/content/image/mypostcoverimage.jpg';

        sizeOfStub.rejects('error');

        const cacheStore = new InMemoryCache();
        const cachedImageSizeFromUrl = new CachedImageSizeFromUrl({
            getImageSizeFromUrl: sizeOfStub,
            cache: cacheStore
        });

        const loggingStub = sinon.stub(logging, 'error');
        await cachedImageSizeFromUrl.getCachedImageSizeFromUrl(url);

        cacheStore.get(url).should.not.be.undefined;
        const image = cacheStore.get(url);
        should.equal(image.url, 'http://mysite.com/content/image/mypostcoverimage.jpg');
        should.not.exist(image.width);
        should.not.exist(image.height);
        sinon.assert.calledOnce(loggingStub);
    });

    it('can handle NotFoundError error', async function () {
        const url = 'http://mysite.com/content/image/mypostcoverimage.jpg';

        sizeOfStub.rejects(new errors.NotFoundError('it iz gone mate!'));

        const cacheStore = new InMemoryCache();
        const cachedImageSizeFromUrl = new CachedImageSizeFromUrl({
            getImageSizeFromUrl: sizeOfStub,
            cache: cacheStore
        });

        await cachedImageSizeFromUrl.getCachedImageSizeFromUrl(url);

        cacheStore.get(url).should.not.be.undefined;
        const image = cacheStore.get(url);
        should.equal(image.url, 'http://mysite.com/content/image/mypostcoverimage.jpg');
        should.not.exist(image.width);
        should.not.exist(image.height);
    });

    it('should return null if url is null', async function () {
        const cachedImageSizeFromUrl = new CachedImageSizeFromUrl({
            imageSize: {},
            cache: new InMemoryCache()
        });
        const url = null;
        let result;

        result = await cachedImageSizeFromUrl.getCachedImageSizeFromUrl(url);

        should.not.exist(result);
    });
});
