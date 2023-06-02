const assert = require('assert');

describe('Segment Analytics Service', function () {
    let segmentService;

    it('Provides expected public API', async function () {
        segmentService = require('../../../../../core/server/services/segment');

        assert.ok(segmentService.init);
    });
});
