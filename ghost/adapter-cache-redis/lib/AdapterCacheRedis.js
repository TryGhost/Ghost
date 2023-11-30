const BaseCacheAdapter = require('@tryghost/adapter-base-cache');
const logging = require('@tryghost/logging');
const metrics = require('@tryghost/metrics');
const debug = require('@tryghost/debug')('redis-cache');
const cacheManager = require('cache-manager');
const redisStoreFactory = require('./redis-store-factory');
const calculateSlot = require('cluster-key-slot');

class AdapterCacheRedis extends BaseCacheAdapter {
    /**
     *
     * @param {Object} config
     * @param {Object} [config.cache] - caching instance compatible with cache-manager's redis store
     * @param {String} [config.host] - redis host used in case no cache instance provided
     * @param {Number} [config.port] - redis port used in case no cache instance provided
     * @param {String} [config.password] - redis password used in case no cache instance provided
     * @param {Object} [config.clusterConfig] - redis cluster config used in case no cache instance provided
     * @param {Object} [config.storeConfig] - extra redis client config used in case no cache instance provided
     * @param {Number} [config.ttl] - default cached value Time To Live (expiration) in *seconds*
     * @param {String} [config.keyPrefix] - prefix to use when building a unique cache key, e.g.: 'some_id:image-sizes:'
     * @param {Boolean} [config.reuseConnection] - specifies if the redis store/connection should be reused within the process
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

        this.keyPrefix = config.keyPrefix;
        this._keysPattern = config.keyPrefix ? `${config.keyPrefix}*` : '';
        this.redisClient = this.cache.store.getClient();
        this.redisClient.on('error', this.handleRedisError);
    }

    handleRedisError(error) {
        logging.error(error);
    }

    #getPrimaryRedisNode() {
        debug('getPrimaryRedisNode');
        if (this.redisClient.constructor.name !== 'Cluster') {
            return this.redisClient;
        }
        const slot = calculateSlot(this.keyPrefix);
        const [ip, port] = this.redisClient.slots[slot][0].split(':');
        for (const node of this.redisClient.nodes()) {
            if (node.options.host === ip && node.options.port === parseInt(port)) {
                return node;
            }
        }
        return null;
    }

    #scanNodeForKeys(node) {
        debug(`scanNodeForKeys matching ${this._keysPattern}`);
        return new Promise((resolve, reject) => {
            const stream = node.scanStream({match: this._keysPattern, count: 100});
            let keys = [];
            stream.on('data', (resultKeys) => {
                keys = keys.concat(resultKeys);
            });
            stream.on('error', (e) => {
                reject(e);
            });
            stream.on('end', () => {
                resolve(keys);
            });
        });
    }

    async #getKeys() {
        debug('#getKeys');
        const primaryNode = this.#getPrimaryRedisNode();
        if (primaryNode === null) {
            return [];
        }
        return await this.#scanNodeForKeys(primaryNode);
    }

    /**
     * This is a recommended way to build cache key prefixes from
     * the cache-manager package. Might be a good contribution to make
     * in the package itself (https://github.com/node-cache-manager/node-cache-manager/issues/158)
     * @param {string} key
     * @returns {string}
     */
    _buildKey(key) {
        if (this.keyPrefix) {
            return `${this.keyPrefix}${key}`;
        }

        return key;
    }

    /**
     * This is a method to remove the key prefix from any raw key returned from redis.
     * @param {string} key
     * @returns {string}
     */
    _removeKeyPrefix(key) {
        return key.slice(this.keyPrefix.length);
    }

    /**
     *
     * @param {String} key
     */
    async get(key) {
        try {
            return await this.cache.get(this._buildKey(key));
        } catch (err) {
            logging.error(err);
        }
    }

    /**
     *
     * @param {String} key
     * @param {*} value
     */
    async set(key, value) {
        debug('set', key);
        try {
            return await this.cache.set(this._buildKey(key), value);
        } catch (err) {
            logging.error(err);
        }
    }

    /**
     * Reset the cache by deleting everything from redis
     */
    async reset() {
        debug('reset');
        try {
            const t0 = performance.now();
            logging.debug(`[RedisAdapter] Clearing cache: scanning for keys matching ${this._keysPattern}`);
            const keys = await this.#getKeys();
            logging.debug(`[RedisAdapter] Clearing cache: found ${keys.length} keys matching ${this._keysPattern} in ${(performance.now() - t0).toFixed(1)}ms`);
            metrics.metric('cache-reset-scan', (performance.now() - t0).toFixed(1));
            const t1 = performance.now();
            for (const key of keys) {
                await this.cache.del(key);
            }
            logging.debug(`[RedisAdapter] Clearing cache: deleted ${keys.length} keys matching ${this._keysPattern} in ${(performance.now() - t1).toFixed(1)}ms`);
            metrics.metric('cache-reset-delete', (performance.now() - t1).toFixed(1));
            metrics.metric('cache-reset', (performance.now() - t0).toFixed(1));
            metrics.metric('cache-reset-key-count', keys.length);
        } catch (err) {
            logging.error(err);
        }
    }

    /**
     * Helper method to assist "getAll" type of operations
     * @returns {Promise<Array<String>>} all keys present in the cache
     */
    async keys() {
        try {
            return (await this.#getKeys()).map((key) => {
                return this._removeKeyPrefix(key);
            });
        } catch (err) {
            logging.error(err);
        }
    }
}

module.exports = AdapterCacheRedis;
