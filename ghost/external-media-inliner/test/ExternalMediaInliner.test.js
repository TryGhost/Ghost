const assert = require('assert');
const ExternalMediaInliner = require('../index');

describe('ExternalMediaInliner', function () {
    it('Creates an instance', function () {
        assert.ok(new ExternalMediaInliner());
    });
});
