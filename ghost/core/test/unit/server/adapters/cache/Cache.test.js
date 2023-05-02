const assert = require('assert');

const {getCache} = require('../../../../../core/server/adapters/cache');
const MemoryCache = require('../../../../../core/server/adapters/cache/MemoryCache');

describe('Cache Adapter', function () {
    it('defaults to in-memory cache', function () {
        const cacheAdapter = getCache('foo');
        assert.equal(cacheAdapter instanceof MemoryCache, true);
    });

    it('returns the same instance for the same name', function () {
        const cacheAdapter1 = getCache('foo');
        const cacheAdapter2 = getCache('foo');
        assert.equal(cacheAdapter1, cacheAdapter2);
    });
});
