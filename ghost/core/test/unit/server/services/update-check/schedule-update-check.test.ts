import assert from 'node:assert/strict';
import sinon from 'sinon';
import { describe, it, beforeEach, afterEach } from 'vitest';
import logging from '@tryghost/logging';

// require, not import: these must resolve to the same CommonJS module instances
// that core/server/services/update-check/index.js loads - so a stray addJob()
// call is visible here, and the scheduled job is instanceof the classes below.
const legacyJobsManager = require('../../../../../core/server/services/jobs');
const updateCheck = require('../../../../../core/server/services/update-check');
const UpdateCheckJob =
  require('../../../../../core/server/services/update-check/jobs/update-check-job').default;
const UpdateCheckBootJob =
  require('../../../../../core/server/services/update-check/jobs/update-check-boot-job').default;

describe('update-check scheduling', function () {
  let jobsService: { scheduleRecurring: sinon.SinonStub; dispatch: sinon.SinonStub };
  let addJob: sinon.SinonStub;
  let loggingInfo: sinon.SinonStub;

  beforeEach(function () {
    jobsService = {
      scheduleRecurring: sinon.stub().resolves(),
      dispatch: sinon.stub().resolves(),
    };
    addJob = sinon.stub(legacyJobsManager, 'addJob');
    loggingInfo = sinon.stub(logging, 'info');
  });

  afterEach(function () {
    sinon.restore();
  });

  it('schedules a daily update-check job at a random time of day', async function () {
    await updateCheck.scheduleRecurringJobs(jobsService);

    assert.ok(jobsService.scheduleRecurring.calledOnce);
    const [job, schedule] = jobsService.scheduleRecurring.firstCall.args;
    assert.ok(job instanceof UpdateCheckJob);
    assert.match(
      schedule.cron,
      /^\d{1,2} \d{1,2} (1?\d|2[0-3]) \* \* \*$/,
      'a random daily cron spread across the full 24 hours',
    );
    assert.ok(
      loggingInfo.calledWith(`[Background Job] update-check scheduled at ${schedule.cron}`),
      'the scheduled log line is preserved verbatim',
    );
    assert.ok(addJob.notCalled, 'update-check is no longer registered with the legacy job manager');
  });

  it('dispatches a one-off update-check-boot job', async function () {
    await updateCheck.scheduleBootJob(jobsService);

    assert.ok(jobsService.dispatch.calledOnce);
    const [job] = jobsService.dispatch.firstCall.args;
    assert.ok(job instanceof UpdateCheckBootJob);
    assert.ok(
      loggingInfo.calledWith('[Background Job] update-check-boot queued'),
      'the queued log line is preserved verbatim',
    );
    assert.ok(
      addJob.notCalled,
      'update-check-boot is no longer registered with the legacy job manager',
    );
  });
});
