import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import ExternalMediaInlinerJob from '../../../../../core/server/services/media-inliner/external-media-inliner-job';

describe('ExternalMediaInlinerJob', function () {
  it('keeps the legacy job name as its type', function () {
    assert.equal(ExternalMediaInlinerJob.type, 'external-media-inliner');
  });

  it('survives the payload JSON round-trip', function () {
    const job = new ExternalMediaInlinerJob({ domains: ['https://example.com'] });

    const rehydrated = new ExternalMediaInlinerJob(JSON.parse(JSON.stringify(job)));

    assert.deepEqual(rehydrated.domains, ['https://example.com']);
  });
});
