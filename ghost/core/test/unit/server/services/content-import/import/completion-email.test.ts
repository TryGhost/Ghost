import assert from 'node:assert/strict';
import buildCompletionEmail from '../../../../../../core/server/services/content-import/import/completion-email';
import type { ImportRun } from '../../../../../../core/server/services/content-import/import/store';

function run(overrides: Partial<ImportRun> = {}): ImportRun {
  return {
    id: 'run_test',
    status: 'complete',
    startedAt: new Date('2026-01-01T10:00:00.000Z'),
    finishedAt: new Date('2026-01-01T10:01:00.000Z'),
    total: 5,
    rows: [
      { line: 2, title: 'Created', status: 'created' },
      { line: 3, title: 'Updated', status: 'updated' },
      { line: 4, title: 'Skipped', status: 'skipped', reason: 'Invalid' },
      { line: 5, title: 'Failed', status: 'failed', reason: 'Write failed' },
      {
        line: 6,
        title: 'Warning',
        status: 'created',
        warnings: ['Assigned Owner'],
      },
    ],
    ...overrides,
  };
}

describe('content import completion email', function () {
  it('summarises every row outcome and warning-bearing post', function () {
    const email = buildCompletionEmail(run(), 'requester@example.com');

    assert.equal(email.to, 'requester@example.com');
    assert.equal(email.subject, 'Your content import is complete');
    assert.equal(email.forceTextContent, true);
    assert.deepEqual(email.attachments, []);
    assert.match(email.html, /Created:<\/strong> 2/);
    assert.match(email.html, /Updated:<\/strong> 1/);
    assert.match(email.html, /Skipped:<\/strong> 1/);
    assert.match(email.html, /Failed:<\/strong> 1/);
    assert.match(email.html, /1<\/strong> post has warnings/);
  });

  it('uses an unsuccessful subject when every attempted write failed', function () {
    const email = buildCompletionEmail(
      run({
        total: 1,
        rows: [{ line: 2, title: 'Failed', status: 'failed', reason: 'Write failed' }],
      }),
      'owner@example.com',
    );

    assert.equal(email.subject, 'Your content import was unsuccessful');
    assert.match(email.html, /processed 1 row:/);
  });

  it('uses plural warning copy for multiple warning-bearing posts', function () {
    const email = buildCompletionEmail(
      run({
        total: 2,
        rows: [
          { line: 2, title: 'First', status: 'created', warnings: ['First warning'] },
          { line: 3, title: 'Second', status: 'updated', warnings: ['Second warning'] },
        ],
      }),
      'owner@example.com',
    );

    assert.match(email.html, /2<\/strong> posts have warnings/);
  });

  it('uses a generic failure message for a fatal run', function () {
    const email = buildCompletionEmail(
      run({ status: 'failed', failureReason: 'database password leaked here' }),
      'owner@example.com',
    );

    assert.equal(email.subject, 'Your content import could not be completed');
    assert.match(email.html, /Something went wrong on our end/);
    assert.doesNotMatch(email.html, /database password/);
  });

  it('escapes the recipient in the HTML footer', function () {
    const email = buildCompletionEmail(run(), 'unsafe<email@example.com');

    assert.match(email.html, /unsafe&lt;email@example\.com/);
    assert.doesNotMatch(email.html, /unsafe<email@example\.com/);
  });

  it('links every created and updated post with a resolved URL', function () {
    const email = buildCompletionEmail(
      run({
        rows: [
          {
            line: 2,
            title: 'Published & linked',
            status: 'created',
            url: 'https://example.com/published/?one=1&two=2',
          },
          {
            line: 3,
            title: '<Draft>',
            status: 'updated',
            url: 'https://example.com/ghost/#/editor/post/draft-id',
          },
          { line: 4, title: 'No URL', status: 'created' },
          {
            line: 5,
            title: 'Skipped URL',
            status: 'skipped',
            url: 'https://example.com/must-not-render/',
          },
        ],
      }),
      'owner@example.com',
    );

    assert.match(email.html, /Imported posts/);
    assert.match(email.html, /Published &amp; linked/);
    assert.match(email.html, /published\/\?one=1&amp;two=2/);
    assert.match(email.html, /&lt;Draft&gt;/);
    assert.match(email.html, /#\/editor\/post\/draft-id/);
    assert.doesNotMatch(email.html, /No URL/);
    assert.doesNotMatch(email.html, /must-not-render/);
  });

  it('uses the row number when a linked outcome has no title', function () {
    const email = buildCompletionEmail(
      run({
        rows: [
          {
            line: 7,
            title: null,
            status: 'created',
            url: 'https://example.com/untitled/',
          },
        ],
      }),
      'owner@example.com',
    );

    assert.match(email.html, />Row 7<\/a>/);
  });
});
