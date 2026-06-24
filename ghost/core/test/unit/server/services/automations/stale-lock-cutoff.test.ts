import assert from 'node:assert/strict';
import {getStaleLockCutoff} from '../../../../../core/server/services/automations/stale-lock-cutoff';

describe('getStaleLockCutoff', function () {
    it('returns the lock timeout before now', function () {
        const now = new Date('2026-06-22T12:00:00.000Z');

        const cutoff = getStaleLockCutoff(now);

        assert.equal(cutoff.toISOString(), '2026-06-22T11:30:00.000Z');
    });
});
