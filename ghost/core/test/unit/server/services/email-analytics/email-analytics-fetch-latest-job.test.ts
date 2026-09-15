import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { Job } from '../../../../../core/server/services/jobs-service/job';
import EmailAnalyticsFetchLatestJob from '../../../../../core/server/services/email-analytics/jobs/email-analytics-fetch-latest-job';

describe('EmailAnalyticsFetchLatestJob', function () {
  it('has a stable type', function () {
    assert.equal(EmailAnalyticsFetchLatestJob.type, 'email-analytics-fetch-latest');
  });

  it('is a job', function () {
    assert.ok(new EmailAnalyticsFetchLatestJob() instanceof Job);
  });

  it('has an empty, serialisable payload', function () {
    const job = new EmailAnalyticsFetchLatestJob();

    assert.equal(JSON.stringify(job), '{}');
    assert.deepEqual(JSON.parse(JSON.stringify(job)), {});
  });
});
