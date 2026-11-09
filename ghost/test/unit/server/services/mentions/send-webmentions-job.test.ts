import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import SendWebmentionsJob from '../../../../../core/server/services/mentions/send-webmentions-job';

describe('SendWebmentionsJob', function () {
  it('is dispatched under its own type', function () {
    assert.equal(SendWebmentionsJob.type, 'send-webmentions');
  });

  it('survives the round trip through the queue', function () {
    const job = new SendWebmentionsJob({
      sourceUrl: 'https://site.com/post/',
      links: ['https://example.com/', 'https://old.example.com/'],
    });

    const payload = JSON.parse(JSON.stringify(job));

    assert.deepEqual(payload, {
      sourceUrl: 'https://site.com/post/',
      links: ['https://example.com/', 'https://old.example.com/'],
    });
    assert.deepEqual(new SendWebmentionsJob(payload), job);
  });
});
