const defaultCacheManager = require('cache-manager-ioredis');
let redisStoreSingletonInstance;

/**
 *
 * @param {object} [storeOptions] options to pass to the Redis store instance
 * @param {boolean} [reuseConnection] specifies if the Redis store/connection should be reused within the process
* @param {object} [CacheManager] CacheManager constructor to instantiate, defaults to cache-manager-ioredis
 */
const getRedisStore = (storeOptions, reuseConnection = true, CacheManager = defaultCacheManager) => {
    if (storeOptions && reuseConnection) {
        if (!redisStoreSingletonInstance) {
            redisStoreSingletonInstance = CacheManager.create(storeOptions);
        }

        return redisStoreSingletonInstance;
    } else {
        return CacheManager;
    }
};

module.exports.getRedisStore = getRedisStore;
