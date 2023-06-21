const assert = require('assert/strict');
const events = require('../');

describe('index.js', function () {
    it('exports SpamComplaintEvent', function () {
        assert(events.SpamComplaintEvent);
        assert(events.SpamComplaintEvent === require('../lib/SpamComplaintEvent'));
    });
    it('exports EmailBouncedEvent', function () {
        assert(events.EmailBouncedEvent);
        assert(events.EmailBouncedEvent === require('../lib/EmailBouncedEvent'));
    });
});
