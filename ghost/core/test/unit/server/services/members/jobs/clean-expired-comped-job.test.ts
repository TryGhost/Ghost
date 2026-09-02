import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { Job } from '../../../../../../core/server/services/jobs-service/job';
import CleanExpiredCompedJob from '../../../../../../core/server/services/members/jobs/clean-expired-comped-job';

describe('CleanExpiredCompedJob', function () {
  it('has a stable type', function () {
    assert.equal(CleanExpiredCompedJob.type, 'clean-expired-comped');
  });

  it('is a job', function () {
    assert.ok(new CleanExpiredCompedJob() instanceof Job);
  });

  it('has an empty, serialisable payload', function () {
    const job = new CleanExpiredCompedJob();

    assert.equal(JSON.stringify(job), '{}');
    assert.deepEqual(JSON.parse(JSON.stringify(job)), {});
  });
});
