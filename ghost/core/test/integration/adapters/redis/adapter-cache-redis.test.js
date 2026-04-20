const assert = require('node:assert/strict');
const sinon = require('sinon');
const config = require('../../../../core/shared/config');
const RedisCache = require('../../../../core/server/adapters/lib/redis/AdapterCacheRedis');

const REDIS_HOST = config.get('adapters:Redis:host');
const REDIS_PORT = config.get('adapters:Redis:port');

function uniquePrefix(label = 'test') {
    return `pr19518-${label}-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}:`;
}

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

async function deleteByPrefix(client, prefix) {
    const keys = await client.keys(`${prefix}*`);
    if (keys.length) {
        await client.del(...keys);
    }
}

describe('Integration: AdapterCacheRedis', function () {
    const tracked = [];

    afterEach(async function () {
        while (tracked.length) {
            const {cache, prefix} = tracked.pop();
            await deleteByPrefix(cache.redisClient, prefix);
            await cache.redisClient.quit();
        }
    });

    function createCache(label, extra) {
        const prefix = uniquePrefix(label);
        const cache = buildCache(prefix, extra);
        tracked.push({cache, prefix});
        return cache;
    }

    describe('set / get', function () {
        it('stores a value and retrieves it by the same key', async function () {
            const cache = createCache('set-get');
            await cache.set('hello', 'world');
            assert.equal(await cache.get('hello'), 'world');
        });

        it('returns null for an unknown key', async function () {
            const cache = createCache('miss');
            assert.equal(await cache.get('does-not-exist'), null);
        });

        it('overwrites an existing value', async function () {
            const cache = createCache('overwrite');
            await cache.set('k', 'first');
            await cache.set('k', 'second');
            assert.equal(await cache.get('k'), 'second');
        });
    });

    describe('keys', function () {
        it('lists all set keys with the prefix stripped', async function () {
            const cache = createCache('keys');
            await cache.set('alpha', 1);
            await cache.set('beta', 2);
            const keys = (await cache.keys()).sort();
            assert.deepEqual(keys, ['alpha', 'beta']);
        });

        it('returns an empty list when nothing is set', async function () {
            const cache = createCache('keys-empty');
            assert.deepEqual(await cache.keys(), []);
        });
    });

    describe('reset (invalidation contract)', function () {
        it('makes previously-set keys invisible to get()', async function () {
            const cache = createCache('reset-get');
            await cache.set('foo', 'bar');
            assert.equal(await cache.get('foo'), 'bar');

            await cache.reset();

            assert.equal(await cache.get('foo'), null);
        });

        it('makes previously-set keys invisible to keys()', async function () {
            const cache = createCache('reset-keys');
            await cache.set('foo', 'bar');
            await cache.set('baz', 'qux');

            await cache.reset();

            assert.deepEqual(await cache.keys(), []);
        });

        it('triggers fetchData on the next get(key, fetchData) call', async function () {
            const cache = createCache('reset-fetch');
            await cache.set('k', 'old');

            await cache.reset();

            const fetcher = sinon.stub().resolves('new');
            const value = await cache.get('k', fetcher);

            assert.equal(fetcher.callCount, 1);
            assert.equal(value, 'new');
        });

        it('caches the value returned by fetchData after a reset', async function () {
            const cache = createCache('reset-fetch-cache');
            await cache.set('k', 'old');

            await cache.reset();

            const fetcher = sinon.stub().resolves('new');
            await cache.get('k', fetcher);
            const second = await cache.get('k', fetcher);

            assert.equal(fetcher.callCount, 1);
            assert.equal(second, 'new');
        });

        it('does not affect keys belonging to a different keyPrefix', async function () {
            const cacheA = createCache('reset-iso-a');
            const cacheB = createCache('reset-iso-b');

            await cacheA.set('shared-name', 'A');
            await cacheB.set('shared-name', 'B');

            await cacheA.reset();

            assert.equal(await cacheA.get('shared-name'), null);
            assert.equal(await cacheB.get('shared-name'), 'B');
        });
    });

    describe('get with fetchData', function () {
        it('calls fetchData on a miss and caches the result', async function () {
            const cache = createCache('fetch-miss');
            const fetcher = sinon.stub().resolves('fetched');

            const v1 = await cache.get('miss-key', fetcher);
            const v2 = await cache.get('miss-key', fetcher);

            assert.equal(fetcher.callCount, 1);
            assert.equal(v1, 'fetched');
            assert.equal(v2, 'fetched');
        });

        it('does not call fetchData on a hit', async function () {
            const cache = createCache('fetch-hit');
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
            const isolationKey = `pr19518-noprefix-${process.pid}-${Date.now()}`;
            tracked.push({cache, prefix: isolationKey});

            await cache.set(isolationKey, 'value');
            assert.equal(await cache.get(isolationKey), 'value');
        });
    });

    describe('getTimeoutMilliseconds', function () {
        it('returns the value when the underlying get resolves within the timeout', async function () {
            const cache = createCache('timeout-fast', {getTimeoutMilliseconds: 1000});
            await cache.set('fast', 'value');
            assert.equal(await cache.get('fast'), 'value');
        });

        it('returns null when the underlying get exceeds the timeout', async function () {
            const cache = createCache('timeout-slow', {getTimeoutMilliseconds: 1});
            await cache.set('slow', 'value');

            const original = cache.cache.get.bind(cache.cache);
            cache.cache.get = k => new Promise((resolve) => {
                setTimeout(() => original(k).then(resolve), 50);
            });

            assert.equal(await cache.get('slow'), null);
        });
    });
});
