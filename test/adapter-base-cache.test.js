const assert = require('assert');
const BaseCacheAdapter = require('../index');

describe('adapter base cache', function () {
    it('instantiates base cache adapter', function () {
        const baseCacheAdapter = new BaseCacheAdapter();

        assert.deepEqual(baseCacheAdapter.requiredFns, ['get', 'set', 'reset', 'keys']);
    });
});
