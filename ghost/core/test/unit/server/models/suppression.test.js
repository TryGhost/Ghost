const assert = require('node:assert/strict');
const Suppression = require('../../../../core/server/models/suppression');

describe('Suppression', function () {
    it('exists', function () {
        assert(Suppression);
    });
});
