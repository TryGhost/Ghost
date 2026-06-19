import assert from 'node:assert/strict';
import {parseFakeWaitHoursMultiplier} from '../../../../../core/server/services/automations/fake-wait-hours-multiplier';

describe('parseFakeWaitHoursMultiplier', function () {
    it('returns a positive safe integer from a number or string', function () {
        assert.equal(parseFakeWaitHoursMultiplier(2500), 2500);
        assert.equal(parseFakeWaitHoursMultiplier('2500'), 2500);
    });

    it('returns null for missing or invalid values', function () {
        assert.equal(parseFakeWaitHoursMultiplier(undefined), null);
        assert.equal(parseFakeWaitHoursMultiplier(null), null);
        assert.equal(parseFakeWaitHoursMultiplier(0), null);
        assert.equal(parseFakeWaitHoursMultiplier(-1), null);
        assert.equal(parseFakeWaitHoursMultiplier(1.5), null);
        assert.equal(parseFakeWaitHoursMultiplier(Number.MAX_SAFE_INTEGER + 1), null);
        assert.equal(parseFakeWaitHoursMultiplier('not-a-number'), null);
        assert.equal(parseFakeWaitHoursMultiplier(true), null);
    });
});
