const assert = require('node:assert/strict');
const should = require('should');
const luxon = require('luxon');

require('../../../core/server/overrides');

describe('Overrides', function () {
    it('sets global timezone to UTC', function () {
        assert.equal(luxon.DateTime.local().zoneName, 'UTC');
    });
});
