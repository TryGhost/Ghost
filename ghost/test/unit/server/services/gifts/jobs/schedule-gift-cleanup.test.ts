import assert from 'node:assert/strict';
import sinon from 'sinon';
import { describe, it, beforeEach, afterEach } from 'vitest';
import logging from '@tryghost/logging';

// require, not import: these must resolve to the same CommonJS module instances
// that core/server/services/gifts/jobs/index.js loads, so the scheduled job is
// instanceof the class below.
const giftJobs = require('../../../../../../core/server/services/gifts/jobs');
const CleanGiftsJob =
  require('../../../../../../core/server/services/gifts/jobs/clean-gifts-job').default;

describe('gift jobs: cleanup scheduling', function () {
  let jobsService: { scheduleRecurring: sinon.SinonStub };

  beforeEach(function () {
    jobsService = { scheduleRecurring: sinon.stub().resolves() };
  });

  afterEach(function () {
    sinon.restore();
  });

  it('schedules a single daily off-peak clean-gifts job', async function () {
    sinon.stub(logging, 'info');

    await giftJobs.scheduleGiftCleanupJob(jobsService);
    await giftJobs.scheduleGiftCleanupJob(jobsService);

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
  });
});
