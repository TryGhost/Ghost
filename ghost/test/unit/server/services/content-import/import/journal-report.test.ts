import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import LocalStorageBase from '../../../../../../core/server/adapters/storage/LocalStorageBase';
import { ImportJournal } from '../../../../../../core/server/services/content-import/import/journal';
import {
  readReportContents,
  writeImportReports,
} from '../../../../../../core/server/services/content-import/import/journal-report';
import { createSummary } from '../../../../../../core/server/services/content-import/import/summary';

describe('CSV journal report composition', function () {
  it('streams committed report and error parts in order and counts UTF-8 bytes', async function () {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'csv-reports-'));
    try {
      const storage = new LocalStorageBase({ storagePath: directory });
      const columns = ['title', 'import_status'];
      const run = createSummary('run', 'complete');
      assert.deepEqual(await writeImportReports(storage, run), []);

      const journal = new ImportJournal(storage, columns, { record: 0, part: 0 });
      await journal.append({
        line: 2,
        title: 'Déjà vu',
        status: 'created',
        postType: 'page',
        url: 'https://example.com/page/',
      });
      await journal.flush();
      assert.deepEqual(
        (await writeImportReports(storage, run)).map(({ name }) => name),
        ['report.csv'],
      );
      await journal.append({
        line: 3,
        title: null,
        status: 'failed',
        source: { title: '=formula', import_status: 'naïve' },
      });
      await journal.flush();

      const summary = createSummary('run', 'complete');
      const files = await writeImportReports(storage, summary);
      const { report, errorsFile } = await readReportContents(storage, files);
      assert.ok(report && errorsFile);
      assert.deepEqual(files, [
        { name: 'report.csv', bytes: Buffer.byteLength(report) },
        { name: 'errors.csv', bytes: Buffer.byteLength(errorsFile) },
      ]);
      assert.match(report, /Déjà vu,created[\s\S]*3,,failed/);
      assert.match(
        errorsFile,
        /^import_status_2,import_reason,import_media_failures,title,import_status\r\nfailed,,,"'=formula",naïve$/,
      );
      assert.equal(summary.total, 2);
      assert.equal(summary.counts.failed, 1);
      assert.equal(summary.hasPages, true);
      assert.equal(summary.previewRows.length, 1);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
