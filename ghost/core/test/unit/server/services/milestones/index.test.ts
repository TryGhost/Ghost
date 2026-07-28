import assert from 'node:assert/strict';
import milestonesService from '../../../../../core/server/services/milestones';

describe('Milestones Service', function () {
    it('Provides expected public API', async function () {
        assert.ok(milestonesService.initAndRun);
    });
});
