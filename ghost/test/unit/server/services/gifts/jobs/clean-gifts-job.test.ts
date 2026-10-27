import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { Job } from '../../../../../../core/server/services/jobs-service/job';
import CleanGiftsJob from '../../../../../../core/server/services/gifts/jobs/clean-gifts-job';

describe('CleanGiftsJob', function () {
  it('has a stable type', function () {
    assert.equal(CleanGiftsJob.type, 'clean-gifts');
  });

  it('is a job', function () {
    assert.ok(new CleanGiftsJob() instanceof Job);
  });

  it('has an empty, serialisable payload', function () {
    const job = new CleanGiftsJob();

    assert.equal(JSON.stringify(job), '{}');
    assert.deepEqual(JSON.parse(JSON.stringify(job)), {});
  });
});
