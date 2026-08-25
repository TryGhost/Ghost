import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { Job } from '../../../../../../core/server/services/jobs-service/job';
import ExternalMediaInlinerJob from '../../../../../../core/server/services/media-inliner/jobs/external-media-inliner-job';

describe('ExternalMediaInlinerJob', function () {
  it('has a stable type', function () {
    assert.equal(ExternalMediaInlinerJob.type, 'external-media-inliner');
  });

  it('is a job', function () {
    assert.ok(new ExternalMediaInlinerJob({ domains: [] }) instanceof Job);
  });

  it('carries its domains through a serialisation round trip', function () {
    const job = new ExternalMediaInlinerJob({ domains: ['https://example.com'] });

    const restored = new ExternalMediaInlinerJob(JSON.parse(JSON.stringify(job)));

    assert.deepEqual(restored.domains, ['https://example.com']);
  });
});
