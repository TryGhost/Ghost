import assert from 'node:assert/strict';
import papaparse from 'papaparse';
import buildErrorsFile from '../../../../../../core/server/services/content-import/import/errors-file';
import type { ImportRun } from '../../../../../../core/server/services/content-import/import/store';

function run(overrides: Partial<ImportRun> = {}): ImportRun {
  return {
    id: 'run_test',
    status: 'complete',
    startedAt: new Date('2026-01-01T10:00:00.000Z'),
    finishedAt: new Date('2026-01-01T10:01:00.000Z'),
    total: 0,
    sourceColumns: ['Headline', 'Body'],
    rows: [],
    ...overrides,
  };
}

describe('content import errors file', function () {
  it('omits the file without failed rows containing source cells', function () {
    assert.equal(
      buildErrorsFile(
        run({
          rows: [
            {
              line: 2,
              title: 'Created warning',
              status: 'created',
              warnings: ['Assigned Owner'],
              source: { Headline: 'Created warning', Body: '' },
            },
            {
              line: 3,
              title: 'Skipped validation',
              status: 'skipped',
              source: { Headline: 'Skipped validation', Body: '' },
            },
            { line: 4, title: 'No source', status: 'failed', reason: 'Internal harness row' },
          ],
        }),
      ),
      undefined,
    );
  });

  it('preserves source columns, annotates actionable rows, and defuses formulas', function () {
    const csv = buildErrorsFile(
      run({
        sourceColumns: ['Body', 'Headline', 'import_status'],
        rows: [
          {
            line: 2,
            title: '=Failed()',
            status: 'failed',
            reason: '+invalid source value',
            source: {
              Body: '<p>Body</p>',
              Headline: '=Failed()',
              import_status: 'publisher value',
            },
          },
          {
            line: 3,
            title: 'Failed media',
            status: 'failed',
            reason: 'Could not import 1 media file.',
            mediaFailures: [
              { sourceUrl: 'https://assets.test/missing.jpg', reason: 'Download failed.' },
            ],
            source: {
              Body: '<p>Media</p>',
              Headline: 'Failed media',
              import_status: 'keep this',
            },
          },
        ],
      }),
    );

    assert.ok(csv);
    const parsed = papaparse.parse<Record<string, string>>(csv, { header: true });
    assert.deepEqual(parsed.meta.fields, [
      'import_status_2',
      'Body',
      'Headline',
      'import_status',
      'import_reason',
      'import_media_failures',
    ]);
    assert.equal(parsed.data[0].Headline, "'=Failed()");
    assert.equal(parsed.data[0].import_status, 'publisher value');
    assert.equal(parsed.data[0].import_status_2, 'failed');
    assert.equal(parsed.data[0].import_reason, "'+invalid source value");
    assert.deepEqual(JSON.parse(parsed.data[1].import_media_failures), [
      { sourceUrl: 'https://assets.test/missing.jpg', reason: 'Download failed.' },
    ]);
  });

  it('increments annotation suffixes until every generated heading is unique', function () {
    const csv = buildErrorsFile(
      run({
        sourceColumns: [
          'Headline',
          'import_status',
          'import_status_2',
          'import_reason',
          'import_media_failures',
        ],
        rows: [
          {
            line: 2,
            title: 'Invalid',
            status: 'failed',
            source: { Headline: 'Invalid' },
          },
        ],
      }),
    );

    assert.ok(csv);
    const parsed = papaparse.parse(csv, { header: true });
    assert.equal(parsed.meta.fields?.[0], 'import_status_3');
    assert.ok(parsed.meta.fields?.includes('import_reason_2'));
    assert.ok(parsed.meta.fields?.includes('import_media_failures_2'));
  });
});
