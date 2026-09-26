import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { Job } from '../../../../../core/server/services/jobs-service/job';
import ContentImportJob from '../../../../../core/server/data/importer/jobs/content-import-job';

describe('ContentImportJob', function () {
  it('is a data-only job with the stable site-content-import type', function () {
    const job = new ContentImportJob({
      uploadKey: 'de370ef5-45f5-453c-8d6e-7c1a73e30ee9',
      emailRecipient: 'owner@example.com',
    });
    assert.ok(job instanceof Job);
    assert.equal(ContentImportJob.type, 'site-content-import');
    assert.deepEqual(Object.getOwnPropertyNames(ContentImportJob.prototype), ['constructor']);
    assert.deepEqual(Object.keys(job).sort(), [
      'emailRecipient',
      'importPersistUser',
      'importTag',
      'returnImportedData',
      'uploadKey',
    ]);
  });
  for (const optional of [
    {},
    { importTag: '#import', returnImportedData: true, importPersistUser: false },
  ]) {
    it(`round trips scalar payload with ${Object.keys(optional).length} optional fields`, function () {
      const data = {
        uploadKey: 'de370ef5-45f5-453c-8d6e-7c1a73e30ee9',
        emailRecipient: 'owner@example.com',
        ...optional,
      };
      const job = new ContentImportJob(data);
      const revived = new ContentImportJob(JSON.parse(JSON.stringify(job)));
      assert.deepEqual(revived, job);
      assert.deepEqual(JSON.parse(JSON.stringify(job)), data);
    });
  }
});
