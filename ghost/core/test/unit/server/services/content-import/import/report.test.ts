import assert from 'node:assert/strict';
import papaparse from 'papaparse';
import buildImportReport from '../../../../../../core/server/services/content-import/import/report';
import type { ImportRun } from '../../../../../../core/server/services/content-import/import/store';

function run(rows: ImportRun['rows']): ImportRun {
  return {
    id: 'run_test',
    status: 'complete',
    startedAt: new Date('2026-01-01T10:00:00.000Z'),
    finishedAt: new Date('2026-01-01T10:01:00.000Z'),
    total: rows.length,
    rows,
  };
}

describe('content import report', function () {
  it('omits the report when every row completed without warnings', function () {
    assert.equal(
      buildImportReport(
        run([
          { line: 2, title: 'Created', status: 'created', url: 'https://example.com/created/' },
          { line: 3, title: 'Updated', status: 'updated' },
        ]),
      ),
      undefined,
    );
  });

  it('serializes duplicates, failures, skips, and warning-bearing successes', function () {
    const csv = buildImportReport(
      run([
        {
          line: 2,
          title: 'Same run duplicate',
          status: 'skipped',
          reason: 'Already exists',
          duplicate: { origin: 'this_import', matchedBy: 'slug' },
        },
        {
          line: 3,
          title: 'Pre-existing source',
          status: 'skipped',
          reason: 'Source exists',
          duplicate: { origin: 'pre_existing', matchedBy: 'source_id' },
        },
        { line: 4, title: null, status: 'skipped', reason: 'title is required' },
        {
          line: 5,
          title: '=FAILED()',
          status: 'failed',
          reason: '+write failed',
          mediaFailures: [
            { sourceUrl: 'https://assets.test/missing.jpg', reason: 'Download failed' },
            { sourceUrl: 'https://assets.test/broken.mp4', reason: 'Storage failed' },
          ],
        },
        {
          line: 6,
          title: 'Created with warning',
          status: 'created',
          warnings: ['First warning', 'Second warning'],
          url: 'https://example.com/warning/',
        },
        { line: 7, title: 'Clean', status: 'created' },
      ]),
    );

    assert.ok(csv);
    const parsed = papaparse.parse<Record<string, string>>(csv, { header: true });
    assert.deepEqual(parsed.meta.fields, [
      'line',
      'title',
      'outcome',
      'reason',
      'duplicate_origin',
      'matched_by',
      'warnings',
      'media_failures',
      'post_url',
    ]);
    assert.equal(parsed.data.length, 5);
    assert.deepEqual(parsed.data[0], {
      line: '2',
      title: 'Same run duplicate',
      outcome: 'duplicate',
      reason: 'Already exists',
      duplicate_origin: 'this_import',
      matched_by: 'slug',
      warnings: '',
      media_failures: '',
      post_url: '',
    });
    assert.equal(parsed.data[1].duplicate_origin, 'pre_existing');
    assert.equal(parsed.data[1].matched_by, 'source_id');
    assert.equal(parsed.data[2].title, '');
    assert.equal(parsed.data[2].outcome, 'skipped');
    assert.equal(parsed.data[3].title, "'=FAILED()");
    assert.equal(parsed.data[3].reason, "'+write failed");
    assert.equal(
      parsed.data[3].media_failures,
      'https://assets.test/missing.jpg: Download failed\nhttps://assets.test/broken.mp4: Storage failed',
    );
    assert.equal(parsed.data[4].warnings, 'First warning\nSecond warning');
    assert.equal(parsed.data[4].post_url, 'https://example.com/warning/');
  });
});
