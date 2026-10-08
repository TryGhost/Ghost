import assert from 'node:assert/strict';
import sinon from 'sinon';
import { describe, it, beforeEach, afterEach } from 'vitest';
import logging from '@tryghost/logging';

// require, not import: this must resolve to the same CommonJS module instance
// the boot layer loads, so the module-level "already scheduled" state is shared.
const memberJobs = require('../../../../../../core/server/services/members/jobs');
const CleanTokensJob =
  require('../../../../../../core/server/services/members/jobs/clean-tokens-job').default;

describe('member jobs: token cleanup scheduling', function () {
  let jobsService: { scheduleRecurring: sinon.SinonStub };

  beforeEach(function () {
    jobsService = { scheduleRecurring: sinon.stub().resolves() };
  });

  afterEach(function () {
    sinon.restore();
  });

  it('does not schedule token cleanup under the test environment', async function () {
    await memberJobs.scheduleTokenCleanupJob(jobsService);

    assert.ok(
      jobsService.scheduleRecurring.notCalled,
      'token cleanup must not be scheduled under NODE_ENV=test*',
    );
  });

  it('schedules a daily clean-tokens job outside the test environment', async function () {
    const originalEnv = process.env.NODE_ENV;
    sinon.stub(logging, 'info');
    process.env.NODE_ENV = 'production';
    try {
      await memberJobs.scheduleTokenCleanupJob(jobsService);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }

    assert.ok(
      jobsService.scheduleRecurring.calledOnce,
      'clean-tokens is scheduled outside the test environment',
    );
    const [job, schedule] = jobsService.scheduleRecurring.firstCall.args;
    assert.ok(job instanceof CleanTokensJob);
    assert.match(schedule.cron, /^\d+ \d+ \d+ \* \* \*$/, 'a random daily 6-field cron');
  });
});
