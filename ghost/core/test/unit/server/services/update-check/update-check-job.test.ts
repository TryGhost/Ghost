import assert from 'node:assert/strict';
import {describe, it} from 'vitest';
import UpdateCheckJob from '../../../../../core/server/services/update-check/update-check-job';

describe('UpdateCheckJob', function () {
    it('has a stable type and an empty, serialisable payload', function () {
        assert.equal(UpdateCheckJob.type, 'update-check');

        const job = new UpdateCheckJob();
        assert.equal(JSON.stringify(job), '{}');
    });
});
