import assert from 'node:assert/strict';
import sinon from 'sinon';
import { describe, it, beforeEach, afterEach } from 'vitest';
import logging from '@tryghost/logging';

// require, not import: these must resolve to the same CommonJS module instances
// that core/server/services/gifts/jobs/index.js loads, so the scheduled job is
// instanceof the class below.
const giftJobs = require('../../../../../../core/server/services/gifts/jobs');
const SendGiftRemindersJob =
  require('../../../../../../core/server/services/gifts/jobs/send-gift-reminders-job').default;

describe('gift jobs: reminder scheduling', function () {
  let jobsService: { scheduleRecurring: sinon.SinonStub };
  let loggingInfo: sinon.SinonStub;

  beforeEach(function () {
    jobsService = { scheduleRecurring: sinon.stub().resolves() };
    loggingInfo = sinon.stub(logging, 'info');
  });

  afterEach(function () {
    sinon.restore();
  });

  it('schedules a single daily off-peak send-gift-reminders job', async function () {
    await giftJobs.scheduleGiftReminderJob(jobsService);
    await giftJobs.scheduleGiftReminderJob(jobsService);

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
  });
});
