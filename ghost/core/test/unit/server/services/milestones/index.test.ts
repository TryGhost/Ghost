import assert from 'node:assert/strict';
// @ts-expect-error This module lacks type definitions.
import milestonesService from '../../../../../core/server/services/milestones';

describe('Milestones Service', function () {
  it('Provides expected public API', function () {
    assert.ok(milestonesService.initAndRun);
  });
});
