const assert = require('node:assert/strict');
const luxon = require('luxon');

require('../../../core/server/overrides');

describe('Overrides', function () {
    it('sets global timezone to UTC', function () {
        assert.equal(luxon.DateTime.local().zoneName, 'UTC');
    });
});
