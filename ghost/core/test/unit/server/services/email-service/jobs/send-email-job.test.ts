import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import SendEmailJob from '../../../../../../core/server/services/email-service/jobs/send-email-job';

describe('SendEmailJob', function () {
  it('uses the send-email type and a flat email ID payload', function () {
    const job = new SendEmailJob({ emailId: 'email-id' });

    assert.equal(SendEmailJob.type, 'send-email');
    assert.deepEqual({ ...job }, { emailId: 'email-id' });
  });

  it('survives the round trip through the queue', function () {
    const job = new SendEmailJob({ emailId: 'email-id' });

    const revived = new SendEmailJob(JSON.parse(JSON.stringify(job)));

    assert.deepEqual(revived, job);
  });
});
