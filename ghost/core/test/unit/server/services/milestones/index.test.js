const assert = require('assert');

describe('Milestones Service', function () {
    let milestonesService;

    it('Provides expected public API', async function () {
        milestonesService = require('../../../../../core/server/services/milestones');

        assert.ok(milestonesService.initAndRun);
    });
});
