const assert = require('assert/strict');
describe('exports', function () {
    it('exports the lib/email-suppression-list file', function () {
        assert(require('../') === require('../lib/email-suppression-list'));
    });
});
