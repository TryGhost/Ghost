const assert = require('node:assert/strict');

const adapterManager = require('../../../../../core/server/services/adapter-manager').default;
const MemoryCache = require('../../../../../core/server/adapters/cache/MemoryCache');

describe('Cache Adapter', function () {
    it('defaults to in-memory cache', function () {
        const cacheAdapter = adapterManager.getAdapter('cache:foo');
        assert.equal(cacheAdapter instanceof MemoryCache, true);
    });

    it('returns the same instance for the same name', function () {
        const cacheAdapter1 = adapterManager.getAdapter('cache:foo');
        const cacheAdapter2 = adapterManager.getAdapter('cache:foo');
        assert.equal(cacheAdapter1, cacheAdapter2);
    });
});
