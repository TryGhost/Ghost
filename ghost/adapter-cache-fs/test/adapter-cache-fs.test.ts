import assert from 'node:assert/strict';
import fs from 'fs-extra';
import path from 'path';
import sinon from 'sinon';

import AdapterCacheFS from '../';

const SAMPLE_KEY = 'banana';
const SAMPLE_VALUE = {
    posts: {
        id: 123,
        title: 'abc'
    }
};

const CACHE_PATH = '/tmp/cache';

describe('Cache Adapter', function () {
    let cache: AdapterCacheFS;

    beforeEach(() => {
        sinon.restore();
        cache = new AdapterCacheFS({
            cachePath: CACHE_PATH
        });
    });

    afterEach(async () => {
        await fs.remove(CACHE_PATH);
    });

    it('can initialize a cache instance', () => {
        assert.ok(cache);
    });

    it('can initialize with a default root path', () => {
        const cache2 = new AdapterCacheFS();
        const prefixedCachePath = cache2._getPrefixedCacheFolder();
        assert.ok(prefixedCachePath.startsWith('/tmp'));
    });

    it('can initialize with a different root path', () => {
        const newCachePath = '/tmp/banana';

        const cache2 = new AdapterCacheFS({
            cachePath: newCachePath
        });

        const prefixedCachePath = cache2._getPrefixedCacheFolder();
        assert.ok(prefixedCachePath.startsWith(newCachePath));
    });

    it('can reset the cache path by calling reset()', async () => {
        const existingCachePath = cache._getPrefixedCacheFolder();

        await cache.reset();

        const newCachePath = cache._getPrefixedCacheFolder();

        assert.notEqual(newCachePath, existingCachePath);
    });

    it('can set and get a value', async () => {
        await cache.set(SAMPLE_KEY, SAMPLE_VALUE);
        const fetchedValue = await cache.get(SAMPLE_KEY);

        assert.deepEqual(fetchedValue, SAMPLE_VALUE);
    });

    it('can set, reset and not get a value', async () => {
        await cache.set(SAMPLE_KEY, SAMPLE_VALUE);
        await cache.reset();
        const fetchedValue = await cache.get(SAMPLE_KEY);

        assert.deepEqual(fetchedValue, null);
    });

    it('can set, corrupt the file and not get a value', async () => {
        const filename = path.join(cache._getPrefixedCacheFolder(), cache._generateKey(SAMPLE_KEY));
        await fs.writeFile(filename, '{a'); // write some broken JSON to indicate a partial write that happened at some point

        const fetchedValue = await cache.get(SAMPLE_KEY);

        assert.deepEqual(fetchedValue, null);
    });

    it('doesn\'t set a key upon some failure', async () => {
        sinon.stub(fs, 'rename').throws(new Error('foo'));

        await cache.set(SAMPLE_KEY, SAMPLE_VALUE);

        const fetchedValue = await cache.get(SAMPLE_KEY);
        assert.deepEqual(fetchedValue, null);
    });

    it('can list keys', async () => {
        await cache.set(SAMPLE_KEY, SAMPLE_VALUE);
        const fetchedKeys = await cache.keys();

        assert.equal(fetchedKeys.length, 1);
    });
});
