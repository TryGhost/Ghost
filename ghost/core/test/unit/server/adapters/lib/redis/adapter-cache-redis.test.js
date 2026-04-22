const assert = require('node:assert/strict');
const sinon = require('sinon');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const RedisCache = require('../../../../../../core/server/adapters/lib/redis/AdapterCacheRedis');

const PREFIX_HASH = 'mock-prefix-hash';

/**
 * Build a stub for the cache-manager instance, including a stubbed
 * underlying redis client. The redis client's get() returns PREFIX_HASH
 * for the prefix_hash key by default so the prefix-rotation plumbing
 * doesn't get in the way of the behaviour under test.
 */
function createCacheStub({keyPrefix = ''} = {}) {
    const redisGet = sinon.stub();
    redisGet.withArgs(`${keyPrefix}prefix_hash`).resolves(PREFIX_HASH);

    const cacheStub = {
        get: sinon.stub(),
        set: sinon.stub().resolvesArg(1),
        ttl: sinon.stub(),
        store: {
            getClient: sinon.stub().returns({
                on: sinon.stub(),
                get: redisGet,
                set: sinon.stub().resolves('OK')
            })
        }
    };
    return cacheStub;
}

describe('Adapter Cache Redis', function () {
    beforeEach(function () {
        sinon.stub(logging, 'error');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('can initialize Redis cache instance directly', async function () {
        const cache = new RedisCache({cache: createCacheStub()});
        assert.ok(cache);
    });

    it('can initialize with storeConfig', async function () {
        const cache = new RedisCache({
            username: 'myusername',
            storeConfig: {
                retryStrategy: false,
                lazyConnect: true
            },
            reuseConnection: false
        });
        assert.ok(cache);
        assert.equal(cache.redisClient.options.username, 'myusername');
        assert.equal(cache.redisClient.options.retryStrategy, false);
    });

    describe('get', function () {
        it('can get a value from the cache', async function () {
            const cacheStub = createCacheStub();
            cacheStub.get.resolves('value from cache');
            const cache = new RedisCache({cache: cacheStub});

            const value = await cache.get('key');

            assert.equal(value, 'value from cache');
        });

        it('returns null if getTimeoutMilliseconds is exceeded', async function () {
            const cacheStub = createCacheStub();
            cacheStub.get.callsFake(() => new Promise((resolve) => {
                setTimeout(() => resolve('value from cache'), 200);
            }));
            const cache = new RedisCache({
                cache: cacheStub,
                getTimeoutMilliseconds: 100
            });

            const value = await cache.get('key');
            assert.equal(value, null);
        });

        it('can update the cache in the case of a cache miss', async function () {
            const KEY = 'update-cache-on-miss';
            let cachedValue = null;
            const cacheStub = createCacheStub();
            cacheStub.get.callsFake(async (key) => {
                if (key === PREFIX_HASH + KEY) {
                    return cachedValue;
                }
            });
            cacheStub.set.callsFake(async (key, value) => {
                if (key === PREFIX_HASH + KEY) {
                    cachedValue = value;
                }
            });
            const cache = new RedisCache({cache: cacheStub});

            const fetchData = sinon.stub().resolves('Da Value');

            const firstRead = await cache.get(KEY, fetchData);
            assert.equal(fetchData.callCount, 1);
            assert.equal(firstRead, 'Da Value');

            const secondRead = await cache.get(KEY, fetchData);
            assert.equal(fetchData.callCount, 1);
            assert.equal(secondRead, 'Da Value');
        });

        it('returns undefined and logs error when fetchData rejects on a cache miss', async function () {
            const cacheStub = createCacheStub();
            cacheStub.get.resolves(null);
            const cache = new RedisCache({cache: cacheStub});

            const fetchData = sinon.stub().rejects(new Error('DB is down'));

            const value = await cache.get('key', fetchData);

            assert.equal(value, undefined);
            sinon.assert.calledOnce(fetchData);
            sinon.assert.calledOnce(logging.error);
        });

        it('retries fetchData on next call after a previous fetchData rejection', async function () {
            let cachedValue = null;
            const cacheStub = createCacheStub();
            cacheStub.get.callsFake(async () => cachedValue);
            cacheStub.set.callsFake(async (_key, value) => {
                cachedValue = value;
            });
            const cache = new RedisCache({cache: cacheStub});

            const fetchData = sinon.stub();
            fetchData.onFirstCall().rejects(new Error('transient failure'));
            fetchData.onSecondCall().resolves('recovered value');

            await cache.get('key', fetchData);

            const value = await cache.get('key', fetchData);

            assert.equal(fetchData.callCount, 2);
            assert.equal(value, 'recovered value');
        });

        it('does not call fetchData when the underlying Redis get throws', async function () {
            const redisCacheInstanceStub = {
                get: sinon.stub().rejects(new Error('Redis connection lost')),
                set: sinon.stub().resolves(),
                store: {
                    getClient: sinon.stub().returns({
                        on: sinon.stub()
                    })
                }
            };
            const cache = new RedisCache({
                cache: redisCacheInstanceStub
            });

            const fetchData = sinon.stub().resolves('fallback value');

            const value = await cache.get('key', fetchData);

            assert.equal(value, undefined);
            assert.equal(fetchData.callCount, 0);
            sinon.assert.calledOnce(logging.error);
        });

        it('returns the cached value when background refresh fails', async function () {
            const KEY = 'bg-refresh-error';
            let cachedValue = null;

            const cacheStub = createCacheStub();
            cacheStub.get.callsFake(async (key) => {
                if (key === PREFIX_HASH + KEY) {
                    return cachedValue;
                }
            });
            cacheStub.set.callsFake(async (key, value) => {
                if (key === PREFIX_HASH + KEY) {
                    cachedValue = value;
                }
            });
            cacheStub.ttl.callsFake(async (key) => {
                if (key === PREFIX_HASH + KEY) {
                    return 5;
                }
            });
            const cache = new RedisCache({
                cache: cacheStub,
                ttl: 100,
                refreshAheadFactor: 0.2
            });

            const fetchData = sinon.stub();
            fetchData.onFirstCall().resolves('Original Value');
            fetchData.onSecondCall().rejects(new Error('refresh failed'));

            const first = await cache.get(KEY, fetchData);
            assert.equal(first, 'Original Value');
            sinon.assert.calledOnce(fetchData);

            const second = await cache.get(KEY, fetchData);
            assert.equal(second, 'Original Value');
            sinon.assert.calledTwice(fetchData);

            await new Promise((resolve) => {
                setTimeout(resolve, 10);
            });
            sinon.assert.calledOnce(logging.error);
            assert.equal(logging.error.firstCall.args[0].message, 'There was an error refreshing cache data in the background');
            assert.equal(logging.error.firstCall.args[0].error.message, 'refresh failed');
        });

        it('Can do a background update of the cache', async function () {
            const KEY = 'update-cache-in-background';
            let cachedValue = null;
            let remainingTTL = 100;

            const cacheStub = createCacheStub();
            cacheStub.get.callsFake(async (key) => {
                if (key === PREFIX_HASH + KEY) {
                    return cachedValue;
                }
            });
            cacheStub.set.callsFake(async (key, value) => {
                if (key === PREFIX_HASH + KEY) {
                    cachedValue = value;
                }
            });
            cacheStub.ttl.callsFake(async (key) => {
                if (key === PREFIX_HASH + KEY) {
                    return remainingTTL;
                }
            });
            const cache = new RedisCache({
                cache: cacheStub,
                ttl: 100,
                refreshAheadFactor: 0.2
            });

            const fetchData = sinon.stub();
            fetchData.onFirstCall().resolves('First Value');
            fetchData.onSecondCall().resolves('Second Value');

            const first = await cache.get(KEY, fetchData);
            assert.equal(fetchData.callCount, 1);
            assert.equal(first, 'First Value');

            // We simulate having been in the cache for 15 seconds
            remainingTTL = 85;

            const second = await cache.get(KEY, fetchData);
            assert.equal(fetchData.callCount, 1);
            assert.equal(second, 'First Value');

            // We simulate having been in the cache for 30 seconds
            remainingTTL = 70;

            const third = await cache.get(KEY, fetchData);
            assert.equal(fetchData.callCount, 1);
            assert.equal(third, 'First Value');

            // We simulate having been in the cache for 85 seconds
            // This should trigger a background refresh
            remainingTTL = 15;

            const fourth = await cache.get(KEY, fetchData);
            assert.equal(fetchData.callCount, 2);
            assert.equal(fourth, 'First Value');

            // We reset the TTL to 100 for the most recent write
            remainingTTL = 100;

            const fifth = await cache.get(KEY, fetchData);
            assert.equal(fetchData.callCount, 2);
            assert.equal(fifth, 'Second Value');
        });
    });

    describe('set', function () {
        it('can set a value in the cache', async function () {
            const cacheStub = createCacheStub();
            const cache = new RedisCache({cache: cacheStub});

            const value = await cache.set('key-here', 'new value');

            assert.equal(value, 'new value');
            assert.equal(cacheStub.set.args[0][0], `${PREFIX_HASH}key-here`);
        });

        it('logs error and does not throw when the underlying Redis set throws', async function () {
            const redisCacheInstanceStub = {
                set: sinon.stub().rejects(new Error('Redis write failed')),
                store: {
                    getClient: sinon.stub().returns({
                        on: sinon.stub()
                    })
                }
            };
            const cache = new RedisCache({
                cache: redisCacheInstanceStub
            });

            const value = await cache.set('key-here', 'new value');

            assert.equal(value, undefined);
            sinon.assert.calledOnce(logging.error);
        });

        it('sets a key based on keyPrefix', async function () {
            const cacheStub = createCacheStub({keyPrefix: 'testing-prefix:'});
            const cache = new RedisCache({
                cache: cacheStub,
                keyPrefix: 'testing-prefix:'
            });

            const value = await cache.set('key-here', 'new value');

            assert.equal(value, 'new value');
            assert.equal(cacheStub.set.args[0][0], `testing-prefix:${PREFIX_HASH}key-here`);
        });
    });

    describe('reset', function () {
        it('writes a new prefix_hash directly via the redis client (no TTL)', async function () {
            const cacheStub = createCacheStub();
            const cache = new RedisCache({cache: cacheStub});
            const redisSet = cacheStub.store.getClient().set;

            await cache.reset();

            const [key, value, ...extra] = redisSet.lastCall.args;
            assert.equal(key, 'prefix_hash');
            assert.match(value, /^[0-9a-f]{24}$/);
            assert.deepEqual(extra, []);
        });
    });

    describe('keys', function () {
        it('throws an IncorrectUsageError - this adapter does not support enumerating keys', function () {
            const redisCacheInstanceStub = {
                store: {
                    getClient: sinon.stub().returns({
                        on: sinon.stub()
                    })
                }
            };
            const cache = new RedisCache({
                cache: redisCacheInstanceStub
            });

            assert.throws(
                () => cache.keys(),
                err => err instanceof errors.IncorrectUsageError
            );
        });
    });
});
