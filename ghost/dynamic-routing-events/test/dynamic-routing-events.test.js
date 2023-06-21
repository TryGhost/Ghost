const assert = require('assert/strict');
const events = require('../index');

describe('Dynamic Routing Events', function () {
    it('exports events', function () {
        assert(events.URLResourceUpdatedEvent);
    });
});
