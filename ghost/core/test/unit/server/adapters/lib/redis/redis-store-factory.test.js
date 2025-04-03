const assert = require('assert/strict');
const redisStoreFactory = require('../../../../../../core/server/adapters/lib/redis/redis-store-factory');

class CacheManagerMock {
    static create() {
        return 'StoreInstance' + new Date().getTime();
    }
}

describe('Redis Store Factory', function () {
    it('returns a cache manager constructor when no extra parameters are provided', function () {
        const store = redisStoreFactory.getRedisStore();

        assert.ok(store);
        assert.ok(store.create);
    });

    it('reuses redis store instance', function () {
        const store = redisStoreFactory.getRedisStore({}, true, CacheManagerMock);
        const storeReused = redisStoreFactory.getRedisStore({}, true, CacheManagerMock);

        assert.equal(store.create, undefined);

        assert.equal(store.startsWith('StoreInstance'), true, 'Should be a value of the create method without a random postfix');
        assert.equal(store, storeReused, 'Should be the same store instance');

        const uniqueStore = redisStoreFactory.getRedisStore({}, false, CacheManagerMock);
        assert.notEqual(uniqueStore, store, 'Should be a different store instances');
    });
});
