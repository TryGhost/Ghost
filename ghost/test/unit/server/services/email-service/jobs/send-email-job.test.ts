import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import SendEmailJob from '../../../../../../core/server/services/email-service/jobs/send-email-job';

describe('SendEmailJob', function () {
  it('uses the send-email type and a flat email ID payload', function () {
    const job = new SendEmailJob({ emailId: 'email-id' });

    assert.equal(SendEmailJob.type, 'send-email');
    assert.deepEqual({ ...job }, { emailId: 'email-id' });
  });

  it('survives JSON serialization, keeping its request time for a replay', function () {
    const job = new SendEmailJob({ emailId: 'email-id', requestedAt: '2026-11-19T12:00:00.000Z' });

    const revived = new SendEmailJob(JSON.parse(JSON.stringify(job)));

    assert.deepEqual(revived, job);
  });
});
