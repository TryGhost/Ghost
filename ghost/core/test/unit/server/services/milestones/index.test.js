const assert = require('assert/strict');

describe('Milestones Service', function () {
    let milestonesService;

    it('Provides expected public API', async function () {
        milestonesService = require('../../../../../core/server/services/milestones');

        assert.ok(milestonesService.initAndRun);
    });
});
