import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { Job } from '../../../../../../core/server/services/jobs-service/job';
import MembersImportJob from '../../../../../../core/server/services/members/jobs/members-import-job';

const data = {
  spoolKey: 'members-import-00000000-0000-0000-0000-000000000000.json',
  labelName: 'Import 2026-09-16 10:30',
  extraLabels: [{ name: 'VIP' }, { name: 'Newsletter' }],
  emailRecipient: 'owner@example.com',
};

describe('MembersImportJob', function () {
  it('keeps the legacy job name as its stable type', function () {
    assert.equal(MembersImportJob.type, 'members-import');
  });

  it('is a job', function () {
    assert.ok(new MembersImportJob(data) instanceof Job);
  });

  it('carries its payload through a JSON round trip unchanged', function () {
    const job = new MembersImportJob(data);

    const revived = new MembersImportJob(JSON.parse(JSON.stringify(job)));

    assert.deepEqual({ ...revived }, data);
  });
});
