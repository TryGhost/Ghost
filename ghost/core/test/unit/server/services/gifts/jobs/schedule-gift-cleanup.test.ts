import assert from 'node:assert/strict';
import sinon from 'sinon';
import { describe, it, beforeEach, afterEach } from 'vitest';
import logging from '@tryghost/logging';

// require, not import: these must resolve to the same CommonJS module instances
// that core/server/services/gifts/jobs/index.js loads - so a stray addJob()
// call is visible here, and the scheduled job is instanceof the class below.
const legacyJobsManager = require('../../../../../../core/server/services/jobs');
const giftJobs = require('../../../../../../core/server/services/gifts/jobs');
const CleanGiftsJob =
  require('../../../../../../core/server/services/gifts/jobs/clean-gifts-job').default;

describe('gift jobs: cleanup scheduling', function () {
  let jobsService: { scheduleRecurring: sinon.SinonStub };
  let addJob: sinon.SinonStub;

  beforeEach(function () {
    jobsService = { scheduleRecurring: sinon.stub().resolves() };
    addJob = sinon.stub(legacyJobsManager, 'addJob');
  });

  afterEach(function () {
    sinon.restore();
  });

  it('does not schedule gift cleanup under the test environment', async function () {
    await giftJobs.scheduleGiftCleanupJob(jobsService);

    assert.ok(
      jobsService.scheduleRecurring.notCalled,
      'clean-gifts must not be scheduled under NODE_ENV=test*',
    );
  });

  it('schedules a single daily off-peak clean-gifts job outside the test environment', async function () {
    const originalEnv = process.env.NODE_ENV;
    sinon.stub(logging, 'info');
    process.env.NODE_ENV = 'production';
    try {
      await giftJobs.scheduleGiftCleanupJob(jobsService);
      await giftJobs.scheduleGiftCleanupJob(jobsService);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }

    assert.ok(
      jobsService.scheduleRecurring.calledOnce,
      'clean-gifts is scheduled once, however often scheduling is attempted',
    );
    const [job, schedule] = jobsService.scheduleRecurring.firstCall.args;
    assert.ok(job instanceof CleanGiftsJob);
    assert.match(
      schedule.cron,
      /^\d{1,2} \d{1,2} [0-5] \* \* \*$/,
      'a random daily cron inside the 0-5am off-peak window',
    );
    assert.ok(addJob.notCalled, 'clean-gifts is no longer registered with the legacy job manager');
  });
});
