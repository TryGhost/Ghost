import assert from 'node:assert/strict';
import sinon from 'sinon';
import { describe, it, beforeEach, afterEach } from 'vitest';
import logging from '@tryghost/logging';

// require, not import: these must resolve to the same CommonJS module instances
// that core/server/services/gifts/jobs/index.js loads - so a stray addJob()
// call is visible here, and the scheduled job is instanceof the class below.
const legacyJobsManager = require('../../../../../../core/server/services/jobs');
const giftJobs = require('../../../../../../core/server/services/gifts/jobs');
const SendGiftRemindersJob =
  require('../../../../../../core/server/services/gifts/jobs/send-gift-reminders-job').default;

describe('gift jobs: reminder scheduling', function () {
  let jobsService: { scheduleRecurring: sinon.SinonStub };
  let addJob: sinon.SinonStub;
  let loggingInfo: sinon.SinonStub;

  beforeEach(function () {
    jobsService = { scheduleRecurring: sinon.stub().resolves() };
    addJob = sinon.stub(legacyJobsManager, 'addJob');
    loggingInfo = sinon.stub(logging, 'info');
  });

  afterEach(function () {
    sinon.restore();
  });

  it('does not schedule gift reminders under the test environment', async function () {
    await giftJobs.scheduleGiftReminderJob(jobsService);

    assert.ok(
      jobsService.scheduleRecurring.notCalled,
      'send-gift-reminders must not be scheduled under NODE_ENV=test*',
    );
    assert.ok(addJob.notCalled);
  });

  it('schedules a single daily off-peak send-gift-reminders job outside the test environment', async function () {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      await giftJobs.scheduleGiftReminderJob(jobsService);
      await giftJobs.scheduleGiftReminderJob(jobsService);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }

    assert.ok(
      jobsService.scheduleRecurring.calledOnce,
      'send-gift-reminders is scheduled once, however often scheduling is attempted',
    );
    const [job, schedule] = jobsService.scheduleRecurring.firstCall.args;
    assert.ok(job instanceof SendGiftRemindersJob);
    assert.match(
      schedule.cron,
      /^\d{1,2} \d{1,2} [0-5] \* \* \*$/,
      'a random daily cron inside the 0-5am off-peak window',
    );
    assert.ok(
      loggingInfo.calledWith(`[Background Job] send-gift-reminders scheduled at ${schedule.cron}`),
      'the scheduled log line is preserved verbatim',
    );
    assert.ok(
      addJob.notCalled,
      'send-gift-reminders is no longer registered with the legacy job manager',
    );
  });
});
