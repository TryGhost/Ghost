import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { Job } from '../../../../../../core/server/services/jobs-service/job';
import SendGiftRemindersJob from '../../../../../../core/server/services/gifts/jobs/send-gift-reminders-job';

describe('SendGiftRemindersJob', function () {
  it('has a stable type', function () {
    assert.equal(SendGiftRemindersJob.type, 'send-gift-reminders');
  });

  it('is a job', function () {
    assert.ok(new SendGiftRemindersJob() instanceof Job);
  });

  it('has an empty, serialisable payload', function () {
    const job = new SendGiftRemindersJob();

    assert.equal(JSON.stringify(job), '{}');
    assert.deepEqual(JSON.parse(JSON.stringify(job)), {});
  });
});
