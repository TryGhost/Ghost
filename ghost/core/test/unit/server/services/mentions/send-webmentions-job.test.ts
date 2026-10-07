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
      html: '<a href="https://example.com/">link</a>',
      previousHtml: '<a href="https://old.example.com/">old link</a>',
    });

    const revived = new SendWebmentionsJob(JSON.parse(JSON.stringify(job)));

    assert.deepEqual(revived, job);
  });

  it('round-trips a first publish, where there is no previous html', function () {
    const job = new SendWebmentionsJob({
      sourceUrl: 'https://site.com/post/',
      html: '<a href="https://example.com/">link</a>',
      previousHtml: null,
    });

    const revived = new SendWebmentionsJob(JSON.parse(JSON.stringify(job)));

    assert.deepEqual(revived, job);
    assert.equal(revived.previousHtml, null);
  });

  it('round-trips an unpublish, where there is no current html', function () {
    const job = new SendWebmentionsJob({
      sourceUrl: 'https://site.com/post/',
      html: null,
      previousHtml: '<a href="https://example.com/">link</a>',
    });

    const revived = new SendWebmentionsJob(JSON.parse(JSON.stringify(job)));

    assert.deepEqual(revived, job);
    assert.equal(revived.html, null);
  });
});
