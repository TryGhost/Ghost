const assert = require('node:assert/strict');
const MemoryTTLCache = require('../../../../../core/server/adapters/cache/AdapterCacheMemoryTTL');

const sleep = ms => (
    new Promise((resolve) => {
        setTimeout(resolve, ms);
    })
);

describe('Cache Adapter In Memory with Time To Live', function () {
    it('Can initialize a cache instance', function () {
        const cache = new MemoryTTLCache();
        assert.ok(cache);
    });

    describe('get', function () {
        it('Can get a value from the cache', async function () {
            const cache = new MemoryTTLCache({});
            cache.set('a', 'b');
            assert.equal(cache.get('a'), 'b', 'should get the value from the cache');

            await sleep(100);

            assert.equal(cache.get('a'), 'b', 'should get the value from the cache after some time');
        });
    });

    describe('reset', function () {
        it('Can reset the cache', async function () {
            const cache = new MemoryTTLCache({ttl: 150});

            cache.set('a', 'b');
            cache.set('c', 'd');

            assert.equal(cache.get('a'), 'b', 'should get the value from the cache');
            assert.equal(cache.get('c'), 'd', 'should get the value from the cache');

            cache.reset();

            assert.equal(cache.get('a'), undefined, 'should NOT get the value from the cache after reset');
            assert.equal(cache.get('c'), undefined, 'should NOT get the value from the cache after reset');
        });
    });

    describe('keys', function () {
        it('Can get all keys from the cache', async function () {
            const cache = new MemoryTTLCache({ttl: 200});

            cache.set('a', 'b');
            cache.set('c', 'd');

            assert.deepEqual(cache.keys(), ['a', 'c'], 'should get all keys from the cache');
        });
    });
});
