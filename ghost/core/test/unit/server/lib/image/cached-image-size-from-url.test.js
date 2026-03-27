const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const errors = require('@tryghost/errors');
const sinon = require('sinon');
const CachedImageSizeFromUrl = require('../../../../../core/server/lib/image/cached-image-size-from-url');
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

        assertExists(cacheStore);
        assertExists(cacheStore.get(url));
        const image = cacheStore.get(url);
        assertExists(image.width);
        assert.equal(image.width, 50);
        assertExists(image.height);
        assert.equal(image.height, 50);

        // second call to check if values get returned from cache
        await cachedImageSizeFromUrl.getCachedImageSizeFromUrl(url);

        sinon.assert.calledOnce(imageSizeSpy);
        assert.equal(imageSizeSpy.calledTwice, false);

        assertExists(cacheStore.get(url));
        const image2 = cacheStore.get(url);
        assertExists(image2.width);
        assert.equal(image2.width, 50);
        assertExists(image2.height);
        assert.equal(image2.height, 50);
    });

    it('should not cache transient errors, allowing retry on next call', async function () {
        const url = 'http://mysite.com/content/image/mypostcoverimage.jpg';

        sizeOfStub.rejects('error');

        const cacheStore = new InMemoryCache();
        const cachedImageSizeFromUrl = new CachedImageSizeFromUrl({
            getImageSizeFromUrl: sizeOfStub,
            cache: cacheStore
        });

        const loggingStub = sinon.stub(logging, 'error');
        const result = await cachedImageSizeFromUrl.getCachedImageSizeFromUrl(url);

        assert.equal(result, null);

        // Transient errors should NOT be cached
        assert.equal(cacheStore.get(url), undefined);
        sinon.assert.calledOnce(loggingStub);
        sinon.assert.calledOnce(sizeOfStub);

        // Second call should retry the fetch since nothing was cached
        const result2 = await cachedImageSizeFromUrl.getCachedImageSizeFromUrl(url);

        assert.equal(result2, null);

        // Cache should still be empty after the second transient error
        assert.equal(cacheStore.get(url), undefined);
        sinon.assert.calledTwice(sizeOfStub);
    });

    it('should cache NotFoundError permanently and not refetch on subsequent calls', async function () {
        const url = 'http://mysite.com/content/image/mypostcoverimage.jpg';

        sizeOfStub.rejects(new errors.NotFoundError('it iz gone mate!'));

        const cacheStore = new InMemoryCache();
        const cachedImageSizeFromUrl = new CachedImageSizeFromUrl({
            getImageSizeFromUrl: sizeOfStub,
            cache: cacheStore
        });

        const result = await cachedImageSizeFromUrl.getCachedImageSizeFromUrl(url);
        assert.equal(result, null);

        // Verify 404 was cached with notFound marker
        assertExists(cacheStore.get(url));
        const image = cacheStore.get(url);
        assert.equal(image.url, url);
        assert.equal(image.notFound, true);

        // Second call should NOT refetch — 404 is permanent
        const secondResult = await cachedImageSizeFromUrl.getCachedImageSizeFromUrl(url);
        assert.equal(secondResult, null);
        sinon.assert.calledOnce(sizeOfStub);
    });

    it('should retry fetch when cache has a stale error entry (no dimensions)', async function () {
        const url = 'http://mysite.com/content/image/photo.jpg';

        sizeOfStub.resolves({width: 500, height: 400, type: 'jpg'});

        const cacheStore = new InMemoryCache();
        // Pre-populate cache with an error entry (no width/height)
        cacheStore.set(url, {url});

        const cachedImageSizeFromUrl = new CachedImageSizeFromUrl({
            getImageSizeFromUrl: sizeOfStub,
            cache: cacheStore
        });

        const result = await cachedImageSizeFromUrl.getCachedImageSizeFromUrl(url);

        assert.equal(result.width, 500);
        assert.equal(result.height, 400);
        sinon.assert.calledOnce(sizeOfStub);

        // Verify cache was overwritten with valid dimensions
        const cached = cacheStore.get(url);
        assert.equal(cached.width, 500);
        assert.equal(cached.height, 400);
    });

    it('should not corrupt cache when caller mutates the returned object', async function () {
        const url = 'http://mysite.com/content/image/mypostcoverimage.jpg';

        sizeOfStub.resolves({width: 2000, height: 1000, type: 'jpg'});

        const cacheStore = new InMemoryCache();
        const cachedImageSizeFromUrl = new CachedImageSizeFromUrl({
            getImageSizeFromUrl: sizeOfStub,
            cache: cacheStore
        });

        const result = await cachedImageSizeFromUrl.getCachedImageSizeFromUrl(url);
        result.width = 1200;
        result.height = 600;

        // Cache should still hold the original dimensions
        const cached = cacheStore.get(url);
        assert.equal(cached.width, 2000);
        assert.equal(cached.height, 1000);

        // A subsequent call should also return original dimensions
        const secondResult = await cachedImageSizeFromUrl.getCachedImageSizeFromUrl(url);
        assert.equal(secondResult.width, 2000);
        assert.equal(secondResult.height, 1000);
    });

    it('should return null if url is null', async function () {
        const cachedImageSizeFromUrl = new CachedImageSizeFromUrl({
            imageSize: {},
            cache: new InMemoryCache()
        });
        const url = null;
        let result;

        result = await cachedImageSizeFromUrl.getCachedImageSizeFromUrl(url);

        assert.equal(result, null);
    });
});
