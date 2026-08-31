import assert from 'node:assert/strict';
import sinon from 'sinon';
import { describe, it, beforeEach, afterEach } from 'vitest';
import logging from '@tryghost/logging';

// require, not import: this must resolve to the same CommonJS module instance
// the boot layer loads, so the module-level "already scheduled" state is shared.
const memberJobs = require('../../../../../../core/server/services/members/jobs');
const CleanExpiredCompedJob =
  require('../../../../../../core/server/services/members/jobs/clean-expired-comped-job').default;

describe('member jobs: expired comped cleanup scheduling', function () {
  let jobsService: { scheduleRecurring: sinon.SinonStub };

  beforeEach(function () {
    jobsService = { scheduleRecurring: sinon.stub().resolves() };
  });

  afterEach(function () {
    sinon.restore();
  });

  it('does not schedule expired comped cleanup under the test environment', async function () {
    await memberJobs.scheduleExpiredCompCleanupJob(jobsService);

    assert.ok(
      jobsService.scheduleRecurring.notCalled,
      'expired comped cleanup must not be scheduled under NODE_ENV=test*',
    );
  });

  it('schedules a single daily off-peak clean-expired-comped job outside the test environment', async function () {
    const originalEnv = process.env.NODE_ENV;
    sinon.stub(logging, 'info');
    process.env.NODE_ENV = 'production';
    try {
      await memberJobs.scheduleExpiredCompCleanupJob(jobsService);
      await memberJobs.scheduleExpiredCompCleanupJob(jobsService);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }

    assert.ok(
      jobsService.scheduleRecurring.calledOnce,
      'clean-expired-comped is scheduled once, however often scheduling is attempted',
    );
    const [job, schedule] = jobsService.scheduleRecurring.firstCall.args;
    assert.ok(job instanceof CleanExpiredCompedJob);
    assert.match(
      schedule.cron,
      /^\d{1,2} \d{1,2} [0-5] \* \* \*$/,
      'a random daily cron inside the 0-5am off-peak window',
    );
  });
});
