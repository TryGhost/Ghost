const assert = require('assert/strict');
const {
    Tier,
    TiersAPI,
    InMemoryTierRepository
} = require('../index');

describe('index.js', function () {
    it('Exports Tier', function () {
        assert(Tier === require('../lib/Tier'));
    });
    it('Exports TiersAPI', function () {
        assert(TiersAPI === require('../lib/TiersAPI'));
    });
    it('Exports InMemoryTierRepository', function () {
        assert(InMemoryTierRepository === require('../lib/InMemoryTierRepository'));
    });
});
