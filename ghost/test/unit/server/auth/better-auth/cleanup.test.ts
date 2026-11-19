import assert from 'node:assert/strict';
import sinon from 'sinon';
import logging from '@tryghost/logging';

// require, not import: these must be the CommonJS instances cleanup itself loads
const configUtils = require('../../../../utils/config-utils');
const cleanup: typeof import('../../../../../core/server/auth/better-auth/cleanup') = require('../../../../../core/server/auth/better-auth/cleanup');
const ClearExpiredAuthRowsJob =
  require('../../../../../core/server/auth/better-auth/clear-expired-auth-rows-job').default;
const { Job } = require('../../../../../core/server/services/jobs-service/job');

describe('ClearExpiredAuthRowsJob', function () {
  it('is a job with a stable type and an empty payload', function () {
    const job = new ClearExpiredAuthRowsJob();

    assert.equal(ClearExpiredAuthRowsJob.type, 'clear-expired-auth-rows');
    assert.ok(job instanceof Job);
    assert.deepEqual(JSON.parse(JSON.stringify(job)), {});
  });
});

describe('scheduleClearExpiredJob', function () {
  let jobsService: { scheduleRecurring: sinon.SinonStub };

  beforeEach(function () {
    jobsService = { scheduleRecurring: sinon.stub().resolves() };
    sinon.stub(logging, 'info');
  });

  afterEach(async function () {
    sinon.restore();
    await configUtils.restore();
  });

  it('schedules nothing without the Better Auth tables', async function () {
    configUtils.set({ createInDevelopmentTables: true, 'auth:betterAuthDev': false });

    await cleanup.scheduleClearExpiredJob(jobsService as never);

    sinon.assert.notCalled(jobsService.scheduleRecurring);
  });

  it('schedules a daily off-peak job once', async function () {
    configUtils.set({ createInDevelopmentTables: true, 'auth:betterAuthDev': true });

    await cleanup.scheduleClearExpiredJob(jobsService as never);
    await cleanup.scheduleClearExpiredJob(jobsService as never);

    sinon.assert.calledOnce(jobsService.scheduleRecurring);
    const [job, schedule] = jobsService.scheduleRecurring.firstCall.args;
    assert.ok(job instanceof ClearExpiredAuthRowsJob);
    assert.match(schedule.cron, /^\d+ \d+ [0-5] \* \* \*$/);
  });
});
