const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const sinon = require('sinon');
const config = require('../../../../core/shared/config');
const RedisCache = require('../../../../core/server/adapters/lib/redis/AdapterCacheRedis');

const REDIS_HOST = config.get('adapters:Redis:host');
const REDIS_PORT = config.get('adapters:Redis:port');

function buildCache(prefix, extra = {}) {
    return new RedisCache({
        host: REDIS_HOST,
        port: REDIS_PORT,
        keyPrefix: prefix,
        storeConfig: {
            retryStrategy: false
        },
        reuseConnection: false,
        ...extra
    });
}

describe('Integration: AdapterCacheRedis', function () {
    const caches = [];

    afterEach(async function () {
        while (caches.length) {
            await caches.pop().redisClient.quit();
        }
    });

    function createCache(extra) {
        const cache = buildCache(crypto.randomBytes(8).toString('hex') + ':', extra);
        caches.push(cache);
        return cache;
    }

    describe('set / get', function () {
        it('stores a value and retrieves it by the same key', async function () {
            const cache = createCache();
            await cache.set('hello', 'world');
            assert.equal(await cache.get('hello'), 'world');
        });

        it('returns null for an unknown key', async function () {
            const cache = createCache();
            assert.equal(await cache.get('does-not-exist'), null);
        });

        it('overwrites an existing value', async function () {
            const cache = createCache();
            await cache.set('k', 'first');
            await cache.set('k', 'second');
            assert.equal(await cache.get('k'), 'second');
        });
    });

    describe('reset (invalidation contract)', function () {
        it('makes previously-set keys invisible to get()', async function () {
            const cache = createCache();
            await cache.set('foo', 'bar');
            assert.equal(await cache.get('foo'), 'bar');

            await cache.reset();

            assert.equal(await cache.get('foo'), null);
        });

        it('triggers fetchData on the next get(key, fetchData) call', async function () {
            const cache = createCache();
            await cache.set('k', 'old');

            await cache.reset();

            const fetcher = sinon.stub().resolves('new');
            const value = await cache.get('k', fetcher);

            assert.equal(fetcher.callCount, 1);
            assert.equal(value, 'new');
        });

        it('caches the value returned by fetchData after a reset', async function () {
            const cache = createCache();
            await cache.set('k', 'old');

            await cache.reset();

            const fetcher = sinon.stub().resolves('new');
            await cache.get('k', fetcher);
            const second = await cache.get('k', fetcher);

            assert.equal(fetcher.callCount, 1);
            assert.equal(second, 'new');
        });

        it('does not affect keys belonging to a different keyPrefix', async function () {
            const cacheA = createCache();
            const cacheB = createCache();

            await cacheA.set('shared-name', 'A');
            await cacheB.set('shared-name', 'B');

            await cacheA.reset();

            assert.equal(await cacheA.get('shared-name'), null);
            assert.equal(await cacheB.get('shared-name'), 'B');
        });
    });

    describe('get with fetchData', function () {
        it('calls fetchData on a miss and caches the result', async function () {
            const cache = createCache();
            const fetcher = sinon.stub().resolves('fetched');

            const v1 = await cache.get('miss-key', fetcher);
            const v2 = await cache.get('miss-key', fetcher);

            assert.equal(fetcher.callCount, 1);
            assert.equal(v1, 'fetched');
            assert.equal(v2, 'fetched');
        });

        it('does not call fetchData on a hit', async function () {
            const cache = createCache();
            await cache.set('hit-key', 'cached');

            const fetcher = sinon.stub().resolves('fresh');
            const value = await cache.get('hit-key', fetcher);

            assert.equal(fetcher.callCount, 0);
            assert.equal(value, 'cached');
        });
    });

    describe('without a keyPrefix', function () {
        it('still stores and retrieves values', async function () {
            const cache = buildCache(undefined);
            caches.push(cache);

            const key = `noprefix-${crypto.randomBytes(8).toString('hex')}`;
            await cache.set(key, 'value');
            assert.equal(await cache.get(key), 'value');
        });
    });

    describe('getTimeoutMilliseconds', function () {
        it('returns the value when the underlying get resolves within the timeout', async function () {
            const cache = createCache({getTimeoutMilliseconds: 1000});
            await cache.set('fast', 'value');
            assert.equal(await cache.get('fast'), 'value');
        });

        it('returns null when the underlying get exceeds the timeout', async function () {
            const cache = createCache({getTimeoutMilliseconds: 1});
            await cache.set('slow', 'value');

            const original = cache.cache.get.bind(cache.cache);
            cache.cache.get = k => new Promise((resolve) => {
                setTimeout(() => original(k).then(resolve), 50);
            });

            assert.equal(await cache.get('slow'), null);
        });
    });
});
