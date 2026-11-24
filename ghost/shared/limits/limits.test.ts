import assert from 'node:assert/strict';
import sinon from 'sinon';
import { describe, it } from 'vitest';
import errors from '@tryghost/errors';
import { LimitService } from '@tryghost/limit-service';
import type { Foundation } from '#kernel/foundation';
import { loadLimits } from './index';

// Everything the module uses is in this object. Nothing here is Ghost's own
// config, logger or database.
function fakeFoundation(hostSettings: Record<string, unknown>, memberCount = 0) {
  const members = { count: () => ({ first: async () => ({ count: memberCount }) }) };
  return {
    config: { get: (key: string) => hostSettings[key] },
    logging: { debug: sinon.stub(), info: sinon.stub(), warn: sinon.stub(), error: sinon.stub() },
    database: { knex: () => members },
  };
}

describe('shared: limits', function () {
  it('loads the limits from the config it is handed and counts in the database it is handed', async function () {
    const limitService = new LimitService();
    const foundation = fakeFoundation({ 'hostSettings:limits': { members: { max: 5 } } }, 7);

    loadLimits(limitService, foundation as unknown as Foundation);

    assert.equal(limitService.isLimited('members'), true);
    assert.equal(limitService.isLimited('staff'), false);
    assert.equal(await limitService.checkIsOverLimit('members'), true);
    sinon.assert.notCalled(foundation.logging.warn);
  });

  it('warns through the logger it is handed when the limits are set up incorrectly', function () {
    const limitService = new LimitService();
    // A periodic limit without a subscription is an incorrect-usage error.
    const foundation = fakeFoundation({ 'hostSettings:limits': { emails: { maxPeriodic: 10 } } });

    loadLimits(limitService, foundation as unknown as Foundation);

    sinon.assert.calledOnceWithExactly(
      foundation.logging.warn,
      sinon.match.instanceOf(errors.IncorrectUsageError),
    );
  });
});
