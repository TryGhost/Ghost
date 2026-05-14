const crypto = require('crypto');
const BaseCacheAdapter = require('@tryghost/adapter-base-cache');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const metrics = require('@tryghost/metrics');
const debug = require('@tryghost/debug')('redis-cache');
const cacheManager = require('cache-manager');
const redisStoreFactory = require('./redis-store-factory');

const PREFIX_HASH_KEY = 'prefix_hash';

class AdapterCacheRedis extends BaseCacheAdapter {
    /**
     *
     * @param {Object} config
     * @param {Object} [config.cache] - caching instance compatible with cache-manager's redis store
     * @param {string} [config.host] - redis host used in case no cache instance provided
     * @param {number} [config.port] - redis port used in case no cache instance provided
     * @param {string} [config.password] - redis password used in case no cache instance provided
     * @param {Object} [config.clusterConfig] - redis cluster config used in case no cache instance provided
     * @param {Object} [config.storeConfig] - extra redis client config used in case no cache instance provided
     * @param {number} [config.ttl] - default cached value Time To Live (expiration) in *seconds*
     * @param {number} [config.getTimeoutMilliseconds] - default timeout for cache get operations in *milliseconds*
     * @param {number} [config.refreshAheadFactor] - 0-1 number to use to determine how old (as a percentage of ttl) an entry should be before refreshing it
     * @param {string} [config.keyPrefix] - prefix to use when building a unique cache key, e.g.: 'some_id:image-sizes:'
     * @param {string} [config.featureName] - name of the cache feature (e.g. 'postsPublic') used for dashboard filtering
     * @param {boolean} [config.reuseConnection] - specifies if the redis store/connection should be reused within the process
     */
    constructor(config) {
        super();

        this.cache = config.cache;

        if (!this.cache) {
            // @NOTE: this condition can be avoided if we add merging of nested options
            //        to adapter configuration. Than adding adapter-specific {clusterConfig: {options: {ttl: XXX}}}
            //        will be enough to set ttl for redis cluster.
            if (config.ttl && config.clusterConfig) {
                if (!config.clusterConfig.options) {
                    config.clusterConfig.options = {};
                }

                config.clusterConfig.options.ttl = config.ttl;
            }

            const storeOptions = {
                ttl: config.ttl,
                host: config.host,
                port: config.port,
                username: config.username,
                password: config.password,
                retryStrategy: () => {
                    return (config.storeConfig.retryConnectSeconds || 10) * 1000;
                },
                ...config.storeConfig,
                clusterConfig: config.clusterConfig
            };
            const store = redisStoreFactory.getRedisStore(storeOptions, config.reuseConnection);

            this.cache = cacheManager.caching({
                store: store,
                ...storeOptions
            });
        }

        this.ttl = config.ttl;
        this.refreshAheadFactor = config.refreshAheadFactor || 0;
        this.getTimeoutMilliseconds = config.getTimeoutMilliseconds || null;
        this.currentlyExecutingBackgroundRefreshes = new Set();
        this.currentlyExecutingReads = new Map();
        this._keyPrefix = config.keyPrefix || '';
        this._featureName = config.featureName;
        this._prefixHashInitInFlight = null;
        this.redisClient.on('error', this.handleRedisError);
    }

    /**
     * Underscore-private to survive api-framework's `_.cloneDeep` on the
     * controller (and this adapter). See the "survives deep cloning"
     * suite — `#`-private methods break on clones.
     */
    _metric(name, extra = {}) {
        const value = {...extra};
        if (this._featureName !== undefined) {
            value.feature = this._featureName;
        }
        metrics.metric(name, value);
    }

    /**
     * api-framework's pipeline _.cloneDeep's controllers (and the cache
     * adapter alongside them). Caching the redis client as `this.redisClient`
     * was breaking on clones because the cloned ioredis instance has the
     * prototype but no live socket. Going through cache-manager's
     * `store.getClient()` works because that function captures the original
     * client via closure, so even on a clone it returns the live one.
     */
    get redisClient() {
        return this.cache.store.getClient();
    }

    /**
     * NOTE: this adds an extra round-trip to every cache operation. The
     * trade-off is intentional for now (reset becomes O(1) instead of an
     * O(n) SCAN).
     *
     * NOTE: the prefix_hash key is written without a TTL, but redis can
     * still evict it under allkeys-lru / allkeys-random eviction policies.
     * Eviction will silently invalidate the entire cache as a side effect.
     * Operators who need stricter invalidation guarantees should configure
     * a noeviction policy or pin this key out-of-band.
     */
    async prefixHash() {
        const currentPrefixHash = await this.redisClient.get(this._keyPrefix + PREFIX_HASH_KEY);
        if (currentPrefixHash) {
            return currentPrefixHash;
        }
        return this._initPrefixHash();
    }

    /**
     * Lazily creates the prefix_hash. Concurrent callers in this process
     * share one in-flight init via _prefixHashInitInFlight; SET NX ensures
     * only one writer wins across processes.
     */
    _initPrefixHash() {
        if (this._prefixHashInitInFlight) {
            return this._prefixHashInitInFlight;
        }
        const value = crypto.randomBytes(12).toString('hex');
        this._prefixHashInitInFlight = this.redisClient
            .set(this._keyPrefix + PREFIX_HASH_KEY, value, 'NX')
            .then(async (result) => {
                if (result === 'OK') {
                    return value;
                }
                // someone else wrote it first; return their value
                return await this.redisClient.get(this._keyPrefix + PREFIX_HASH_KEY);
            })
            .finally(() => {
                this._prefixHashInitInFlight = null;
            });
        return this._prefixHashInitInFlight;
    }

    async keyPrefix() {
        const prefixHash = await this.prefixHash();
        return this._keyPrefix + prefixHash;
    }

    handleRedisError(error) {
        logging.error(error);
    }

    /**
     * This is a recommended way to build cache key prefixes from
     * the cache-manager package. Might be a good contribution to make
     * in the package itself (https://github.com/node-cache-manager/node-cache-manager/issues/158)
     * @param {string} key
     * @returns {Promise<string>}
     */
    async _buildKey(key) {
        const keyPrefix = await this.keyPrefix();
        return `${keyPrefix}${key}`;
    }

    /**
     *
     * @param {string} internalKey
     */
    async shouldRefresh(internalKey) {
        if (this.refreshAheadFactor === 0) {
            debug(`shouldRefresh ${internalKey}: false - refreshAheadFactor = 0`);
            return false;
        }
        if (this.refreshAheadFactor === 1) {
            debug(`shouldRefresh ${internalKey}: true - refreshAheadFactor = 1`);
            return true;
        }
        try {
            const ttlRemainingForEntry = await this.cache.ttl(internalKey);
            const shouldRefresh = ttlRemainingForEntry < this.refreshAheadFactor * this.ttl;
            debug(`shouldRefresh ${internalKey}: ${shouldRefresh} - TTL remaining = ${ttlRemainingForEntry}`);
            return shouldRefresh;
        } catch (err) {
            logging.error(err);
            return false;
        }
    }

    /**
     * Performs the buildKey + cache.get sequence, bounded by
     * getTimeoutMilliseconds if configured. On timeout resolves with
     * {internalKey: null, result: null} so the caller treats it as a MISS.
     *
     * @param {string} key
     * @returns {Promise<{internalKey: string|null, result: any}>}
     */
    _lookupWithTimeout(key) {
        const lookup = (async () => {
            const internalKey = await this._buildKey(key);
            const result = await this.cache.get(internalKey);
            return {internalKey, result};
        })();

        if (typeof this.getTimeoutMilliseconds !== 'number') {
            return lookup;
        }

        return new Promise((resolve) => {
            // `lookup` keeps running after the timer fires, so without a
            // single-settlement guard a slow failing redis read would emit
            // both `cache-timeout` and `cache-error` for the same request.
            let settled = false;
            const timer = setTimeout(() => {
                if (settled) {
                    return;
                }
                settled = true;
                debug('get', key, 'timeout');
                this._metric('cache-timeout');
                resolve({internalKey: null, result: null});
            }, this.getTimeoutMilliseconds);
            lookup.then((value) => {
                if (settled) {
                    return;
                }
                settled = true;
                clearTimeout(timer);
                resolve(value);
            }, (err) => {
                if (settled) {
                    return;
                }
                settled = true;
                clearTimeout(timer);
                // redis failure during lookup - treat as MISS, same as the timeout path
                this._metric('cache-error', {operation: 'get'});
                logging.error(err);
                resolve({internalKey: null, result: null});
            });
        });
    }

    /**
     *
     * @param {string} key
     * @param {() => Promise<any>} [fetchData] An optional function to fetch the data, which will be used in the case of a cache MISS or a background refresh
     */
    async get(key, fetchData) {
        try {
            const {internalKey, result} = await this._lookupWithTimeout(key);
            debug(`get ${key}: Cache ${result ? 'HIT' : 'MISS'}`);
            if (result) {
                this._metric('cache-hit');
            } else if (internalKey !== null) {
                // A real miss; timeouts and lookup errors (internalKey === null)
                // already emitted their own metric in `_lookupWithTimeout`.
                this._metric('cache-miss');
            }
            if (!fetchData) {
                return result;
            }
            if (result) {
                const shouldRefresh = await this.shouldRefresh(internalKey);
                const isRefreshing = this.currentlyExecutingBackgroundRefreshes.has(internalKey);
                if (isRefreshing) {
                    debug(`Background refresh already happening for ${key}`);
                }
                if (!isRefreshing && shouldRefresh) {
                    debug(`Doing background refresh for ${key}`);
                    this.currentlyExecutingBackgroundRefreshes.add(internalKey);
                    this._metric('cache-background-refresh-triggered');
                    const refreshStart = performance.now();
                    fetchData().then(async (data) => {
                        await this.set(key, data, {throwOnError: true}); // We don't use `internalKey` here because `set` handles it
                        this.currentlyExecutingBackgroundRefreshes.delete(internalKey);
                        this._metric('cache-background-refresh-succeeded', {value: performance.now() - refreshStart});
                    }).catch((error) => {
                        this.currentlyExecutingBackgroundRefreshes.delete(internalKey);
                        this._metric('cache-background-refresh-failed');
                        logging.error({
                            message: 'There was an error refreshing cache data in the background',
                            error: error
                        });
                    });
                }
                return result;
            } else {
                if (!internalKey) {
                    return fetchData();
                }
                if (this.currentlyExecutingReads.has(internalKey)) {
                    return this.currentlyExecutingReads.get(internalKey);
                }
                const fetchPromise = fetchData();
                const resultPromise = fetchPromise.catch((err) => {
                    logging.error(err);
                });
                fetchPromise.then(async (data) => {
                    try {
                        debug('set', internalKey);
                        await this.cache.set(internalKey, data);
                    } catch (err) {
                        this._metric('cache-error', {operation: 'set'});
                        logging.error(err);
                    }
                }).catch(() => {
                    // fetchData rejection — already logged by resultPromise
                }).finally(() => {
                    this.currentlyExecutingReads.delete(internalKey);
                });
                this.currentlyExecutingReads.set(internalKey, resultPromise);
                return resultPromise;
            }
        } catch (err) {
            this._metric('cache-error', {operation: 'get'});
            logging.error(err);
        }
    }

    /**
     *
     * @param {string} key
     * @param {*} value
     * @param {Object} [options]
     * @param {boolean} [options.throwOnError] - if true, rethrow write errors after logging. Used by the background refresh path so success is only emitted after a write that actually succeeded.
     */
    async set(key, value, {throwOnError = false} = {}) {
        try {
            const internalKey = await this._buildKey(key);
            debug('set', internalKey);
            return await this.cache.set(internalKey, value);
        } catch (err) {
            this._metric('cache-error', {operation: 'set'});
            logging.error(err);
            if (throwOnError) {
                throw err;
            }
        }
    }

    async cyclePrefixHash() {
        const value = crypto.randomBytes(12).toString('hex');
        // Raw client: cache-manager would JSON-wrap, and reset needs an unconditional overwrite (no NX).
        await this.redisClient.set(this._keyPrefix + PREFIX_HASH_KEY, value);
        return value;
    }

    async reset() {
        debug('reset');
        const t0 = performance.now();
        try {
            await this.cyclePrefixHash();
            this._metric('cache-reset', {value: performance.now() - t0});
        } catch (err) {
            this._metric('cache-error', {operation: 'reset'});
            logging.error(err);
        }
    }

    /**
     * @deprecated The cache adapter interface still requires a `keys` method
     *             (see @tryghost/adapter-base-cache#requiredFns), but the
     *             redis adapter does not support enumerating its keys.
     */
    keys() {
        throw new errors.IncorrectUsageError({
            message: 'AdapterCacheRedis does not support keys()'
        });
    }
}

module.exports = AdapterCacheRedis;
