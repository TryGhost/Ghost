const assert = require('node:assert/strict');
const _ = require('lodash');
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

    describe('retryStrategy', function () {
        it('does not throw and defaults to 10 seconds when storeConfig is not provided', function () {
            const cache = new RedisCache({
                reuseConnection: false
            });
            // retryStrategy is invoked by ioredis whenever Redis becomes unavailable.
            // It must not crash even when storeConfig is omitted from the adapter config.
            assert.doesNotThrow(() => cache.redisClient.options.retryStrategy(1));
            assert.equal(cache.redisClient.options.retryStrategy(1), 10000);
            cache.redisClient.disconnect();
        });

        it('defaults to 10 seconds when retryConnectSeconds is not set in storeConfig', function () {
            const cache = new RedisCache({
                storeConfig: {
                    lazyConnect: true
                },
                reuseConnection: false
            });
            assert.equal(cache.redisClient.options.retryStrategy(1), 10000);
        });

        it('uses retryConnectSeconds from storeConfig when provided', function () {
            const cache = new RedisCache({
                storeConfig: {
                    lazyConnect: true,
                    retryConnectSeconds: 5
                },
                reuseConnection: false
            });
            assert.equal(cache.redisClient.options.retryStrategy(1), 5000);
        });
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

        describe('concurrent cache miss coalescing', function () {
            it('calls fetchData only once when multiple callers miss simultaneously', async function () {
                const KEY = 'concurrent-miss';
                const cacheStub = createCacheStub();
                cacheStub.get.resolves(null);
                cacheStub.set.resolves();
                const cache = new RedisCache({cache: cacheStub});

                const fetchData = sinon.stub().resolves('shared value');

                const [v1, v2, v3] = await Promise.all([
                    cache.get(KEY, fetchData),
                    cache.get(KEY, fetchData),
                    cache.get(KEY, fetchData)
                ]);

                assert.equal(fetchData.callCount, 1);
                assert.equal(v1, 'shared value');
                assert.equal(v2, 'shared value');
                assert.equal(v3, 'shared value');
            });

            it('propagates fetchData rejection to all concurrent callers', async function () {
                const KEY = 'concurrent-miss-error';
                const cacheStub = createCacheStub();
                cacheStub.get.resolves(null);
                const cache = new RedisCache({cache: cacheStub});

                const fetchData = sinon.stub().rejects(new Error('upstream down'));

                const [v1, v2] = await Promise.all([
                    cache.get(KEY, fetchData),
                    cache.get(KEY, fetchData)
                ]);

                assert.equal(fetchData.callCount, 1);
                assert.equal(v1, undefined);
                assert.equal(v2, undefined);
                sinon.assert.calledOnce(logging.error);
            });

            it('allows retry after a coalesced fetch rejection', async function () {
                const KEY = 'concurrent-miss-retry';
                let cachedValue = null;
                const cacheStub = createCacheStub();
                cacheStub.get.callsFake(async () => cachedValue);
                cacheStub.set.callsFake(async (_key, value) => {
                    cachedValue = value;
                });
                const cache = new RedisCache({cache: cacheStub});

                const fetchData = sinon.stub();
                fetchData.onFirstCall().rejects(new Error('transient'));
                fetchData.onSecondCall().resolves('recovered');

                await Promise.all([
                    cache.get(KEY, fetchData),
                    cache.get(KEY, fetchData)
                ]);
                assert.equal(fetchData.callCount, 1);

                const value = await cache.get(KEY, fetchData);
                assert.equal(fetchData.callCount, 2);
                assert.equal(value, 'recovered');
            });

            it('does not coalesce fetches across a prefix_hash cycle (reset)', async function () {
                let prefixHash = 'gen1';
                const cacheStore = new Map();
                const redisClient = {
                    on: sinon.stub(),
                    get: sinon.stub().callsFake(async (k) => {
                        if (k === 'prefix_hash') {
                            return prefixHash;
                        }
                        return null;
                    }),
                    set: sinon.stub().resolves('OK')
                };
                const cacheInstance = {
                    get: sinon.stub().callsFake(async k => cacheStore.get(k) ?? null),
                    set: sinon.stub().callsFake(async (k, v) => {
                        cacheStore.set(k, v);
                    }),
                    ttl: sinon.stub(),
                    store: {getClient: () => redisClient}
                };
                const cache = new RedisCache({cache: cacheInstance});

                let resolveSlow;
                const slowFetch = sinon.stub().returns(new Promise((resolve) => {
                    resolveSlow = resolve;
                }));
                const fastFetch = sinon.stub().resolves('post-reset');

                const pA = cache.get('k', slowFetch);
                await new Promise((resolve) => {
                    setTimeout(resolve, 0);
                });
                assert.equal(slowFetch.callCount, 1);

                prefixHash = 'gen2';

                const pB = cache.get('k', fastFetch);
                await new Promise((resolve) => {
                    setTimeout(resolve, 0);
                });
                assert.equal(fastFetch.callCount, 1, 'post-reset caller must not join pre-reset in-flight fetch');

                resolveSlow('pre-reset');
                const [vA, vB] = await Promise.all([pA, pB]);

                assert.equal(vA, 'pre-reset');
                assert.equal(vB, 'post-reset');
                assert.equal(cacheStore.get('gen1k'), 'pre-reset');
                assert.equal(cacheStore.get('gen2k'), 'post-reset');
            });

            it('fetches independently for different keys', async function () {
                const cacheStub = createCacheStub();
                cacheStub.get.resolves(null);
                cacheStub.set.resolves();
                const cache = new RedisCache({cache: cacheStub});

                const fetchA = sinon.stub().resolves('value-a');
                const fetchB = sinon.stub().resolves('value-b');

                const [v1, v2] = await Promise.all([
                    cache.get('key-a', fetchA),
                    cache.get('key-b', fetchB)
                ]);

                assert.equal(fetchA.callCount, 1);
                assert.equal(fetchB.callCount, 1);
                assert.equal(v1, 'value-a');
                assert.equal(v2, 'value-b');
            });
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

    describe('survives deep cloning', function () {
        // Regression: api-framework's pipeline calls _.cloneDeep on the
        // controller, which deep-clones the cache adapter instance. The clone
        // keeps the prototype but loses the per-instance internal slot used
        // for #-private methods, so any this.#privateMethod() call throws
        // "Receiver must be an instance of class AdapterCacheRedis". Using
        // `_`-prefixed private members keeps this working.
        it('cache.get works on a cloned instance', async function () {
            const cacheStub = createCacheStub();
            cacheStub.get.resolves('value from cache');
            const cache = new RedisCache({cache: cacheStub});

            const cloned = _.cloneDeep(cache);

            const value = await cloned.get('key');
            assert.equal(value, 'value from cache');
        });

        it('cache.set works on a cloned instance', async function () {
            const cacheStub = createCacheStub();
            const cache = new RedisCache({cache: cacheStub});

            const cloned = _.cloneDeep(cache);

            const value = await cloned.set('key', 'value');
            assert.equal(value, 'value');
        });

        it('cache.reset works on a cloned instance', async function () {
            const cacheStub = createCacheStub();
            const cache = new RedisCache({cache: cacheStub});

            const cloned = _.cloneDeep(cache);

            await cloned.reset();
            const redisSet = cacheStub.store.getClient().set;
            assert.equal(redisSet.lastCall.args[0], 'prefix_hash');
        });
    });
});
