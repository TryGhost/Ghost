import * as defaultCacheManager from 'cache-manager-ioredis';

interface StoreFactory {
  create(options: object): unknown;
}

let redisStoreSingletonInstance: unknown;

/**
 * @param storeOptions options to pass to the Redis store instance
 * @param reuseConnection specifies if the Redis store/connection should be reused within the process
 * @param CacheManager CacheManager constructor to instantiate, defaults to cache-manager-ioredis
 */
const getRedisStore = (
  storeOptions?: object,
  reuseConnection = true,
  CacheManager: StoreFactory = defaultCacheManager,
) => {
  if (storeOptions && reuseConnection) {
    if (!redisStoreSingletonInstance) {
      redisStoreSingletonInstance = CacheManager.create(storeOptions);
    }

    return redisStoreSingletonInstance;
  } else {
    return CacheManager;
  }
};

// an object, not named exports, so tests can stub getRedisStore
export default { getRedisStore };
