const assert = require('assert');
const EventAwareCacheWrapper = require('../index');

describe('EventAwareCacheWrapper', function () {
    it('Can initialize', function () {
        assert.ok(new EventAwareCacheWrapper());
    });
});
