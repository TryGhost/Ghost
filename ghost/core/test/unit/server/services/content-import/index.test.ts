import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import ContentCSVImportJob from '../../../../../core/server/services/content-import/jobs/content-csv-import-job';

const contentImport = require('../../../../../core/server/services/content-import');

describe('content import service', function () {
  it('fails loudly when a job is delivered before the service is initialised', async function () {
    const job = new ContentCSVImportJob({
      importId: 'run_test',
      file: { path: '/tmp/staged-import', name: 'posts.csv' },
      importTagNames: ['#Import 2026-01-01 10:30', '#Import Run run_test'],
      emailRecipient: 'owner@example.com',
    });

    assert.throws(() => contentImport.handleJob(job), /Content import service used before init/);
    await contentImport.allSettled();
  });
});
