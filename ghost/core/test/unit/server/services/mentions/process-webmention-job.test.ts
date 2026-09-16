import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import ProcessWebmentionJob from '../../../../../core/server/services/mentions/process-webmention-job';

describe('ProcessWebmentionJob', function () {
  it('is dispatched under its own type', function () {
    assert.equal(ProcessWebmentionJob.type, 'process-webmention');
  });

  it('survives the round trip through the queue', function () {
    const job = new ProcessWebmentionJob({
      source: 'https://source.com/post/',
      target: 'https://target.com/post/',
      payload: { withExtension: true, nested: { a: 'b' } },
    });

    const revived = new ProcessWebmentionJob(JSON.parse(JSON.stringify(job)));

    assert.deepEqual(revived, job);
  });
});
