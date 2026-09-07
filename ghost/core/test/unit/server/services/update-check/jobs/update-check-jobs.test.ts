import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { Job } from '../../../../../../core/server/services/jobs-service/job';
import UpdateCheckJob from '../../../../../../core/server/services/update-check/jobs/update-check-job';

describe('UpdateCheckJob', function () {
  it('has a stable type', function () {
    assert.equal(UpdateCheckJob.type, 'update-check');
  });

  it('is a job', function () {
    assert.ok(new UpdateCheckJob() instanceof Job);
  });

  it('has an empty, serialisable payload', function () {
    const job = new UpdateCheckJob();

    assert.equal(JSON.stringify(job), '{}');
    assert.deepEqual(JSON.parse(JSON.stringify(job)), {});
  });
});
