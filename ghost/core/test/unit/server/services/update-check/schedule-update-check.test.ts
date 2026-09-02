import assert from 'node:assert/strict';
import sinon from 'sinon';
import { describe, it, beforeEach, afterEach } from 'vitest';
import logging from '@tryghost/logging';

// require, not import: these must resolve to the same CommonJS module instances
// that core/server/services/update-check/index.js loads - so a stray addJob()
// call is visible here, and the scheduled job is instanceof the class below.
const legacyJobsManager = require('../../../../../core/server/services/jobs');
const config = require('../../../../../core/shared/config');
const updateCheck = require('../../../../../core/server/services/update-check');
const UpdateCheckJob =
  require('../../../../../core/server/services/update-check/jobs/update-check-job').default;

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
    await updateCheck.scheduleJobs(jobsService);

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
    assert.ok(
      jobsService.dispatch.notCalled,
      'no boot run is dispatched unless updateCheck:forceUpdate is set',
    );
    assert.ok(addJob.notCalled, 'update-check is no longer registered with the legacy job manager');
  });

  it('also dispatches a one-off boot run when updateCheck:forceUpdate is set', async function () {
    sinon.stub(config, 'get').withArgs('updateCheck:forceUpdate').returns(true);

    await updateCheck.scheduleJobs(jobsService);

    assert.ok(jobsService.scheduleRecurring.calledOnce, 'the recurring job is still scheduled');
    assert.ok(jobsService.dispatch.calledOnce);
    const [job] = jobsService.dispatch.firstCall.args;
    assert.ok(job instanceof UpdateCheckJob);
    assert.ok(
      loggingInfo.calledWith('[Background Job] update-check boot run queued'),
      'the boot dispatch is logged',
    );
    assert.ok(addJob.notCalled, 'the boot run is no longer registered with the legacy job manager');
  });
});
