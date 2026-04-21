const crypto = require('crypto');
const BaseCacheAdapter = require('@tryghost/adapter-base-cache');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const debug = require('@tryghost/debug')('redis-cache');
const cacheManager = require('cache-manager');
const redisStoreFactory = require('./redis-store-factory');

const PREFIX_HASH_KEY = 'prefix_hash';

class AdapterCacheRedis extends BaseCacheAdapter {
    #prefixHashInitInFlight = null;

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
        this._keyPrefix = config.keyPrefix || '';
        this.redisClient = this.cache.store.getClient();
        this.redisClient.on('error', this.handleRedisError);
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
        return this.#initPrefixHash();
    }

    /**
     * Lazily creates the prefix_hash. Concurrent callers in this process
     * share one in-flight init via #prefixHashInitInFlight; SET NX ensures
     * only one writer wins across processes.
     */
    #initPrefixHash() {
        if (this.#prefixHashInitInFlight) {
            return this.#prefixHashInitInFlight;
        }
        const value = crypto.randomBytes(12).toString('hex');
        this.#prefixHashInitInFlight = this.redisClient
            .set(this._keyPrefix + PREFIX_HASH_KEY, value, 'NX')
            .then(async (result) => {
                if (result === 'OK') {
                    return value;
                }
                // someone else wrote it first; return their value
                return await this.redisClient.get(this._keyPrefix + PREFIX_HASH_KEY);
            })
            .finally(() => {
                this.#prefixHashInitInFlight = null;
            });
        return this.#prefixHashInitInFlight;
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
    #lookupWithTimeout(key) {
        const lookup = (async () => {
            const internalKey = await this._buildKey(key);
            const result = await this.cache.get(internalKey);
            return {internalKey, result};
        })();

        if (typeof this.getTimeoutMilliseconds !== 'number') {
            return lookup;
        }

        return new Promise((resolve) => {
            const timer = setTimeout(() => {
                debug('get', key, 'timeout');
                resolve({internalKey: null, result: null});
            }, this.getTimeoutMilliseconds);
            lookup.then((value) => {
                clearTimeout(timer);
                resolve(value);
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
            const {internalKey, result} = await this.#lookupWithTimeout(key);
            debug(`get ${key}: Cache ${result ? 'HIT' : 'MISS'}`);
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
                    fetchData().then(async (data) => {
                        await this.set(key, data); // We don't use `internalKey` here because `set` handles it
                        this.currentlyExecutingBackgroundRefreshes.delete(internalKey);
                    }).catch((error) => {
                        this.currentlyExecutingBackgroundRefreshes.delete(internalKey);
                        logging.error({
                            message: 'There was an error refreshing cache data in the background',
                            error: error
                        });
                    });
                }
                return result;
            } else {
                const data = await fetchData();
                await this.set(key, data); // We don't use `internalKey` here because `set` handles it
                return data;
            }
        } catch (err) {
            logging.error(err);
        }
    }

    /**
     *
     * @param {string} key
     * @param {*} value
     */
    async set(key, value) {
        const internalKey = await this._buildKey(key);
        debug('set', internalKey);
        try {
            return await this.cache.set(internalKey, value);
        } catch (err) {
            logging.error(err);
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
        try {
            await this.cyclePrefixHash();
        } catch (err) {
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
