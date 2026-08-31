import assert from 'node:assert/strict';
import sinon from 'sinon';
import { describe, it, beforeEach, afterEach } from 'vitest';
import logging from '@tryghost/logging';

// require, not import: these must resolve to the same CommonJS module
// instances that core/server/services/members/jobs/index.js loads, so the
// init() here is the instance scheduleExpiredCompCleanupJob() reads.
const jobsService = require('../../../../../../core/server/services/jobs-service');
const adapterManager = require('../../../../../../core/server/services/adapter-manager').default;
const memberJobs = require('../../../../../../core/server/services/members/jobs');

describe('member jobs: expired comped cleanup scheduling', function () {
  let scheduleStub: sinon.SinonStub;

  beforeEach(function () {
    jobsService.init();
    const backend = adapterManager.getAdapter('jobs');
    scheduleStub = sinon.stub(backend, 'scheduleRecurring');
  });

  afterEach(async function () {
    await jobsService.shutdown({ timeoutMs: 100 });
    sinon.restore();
  });

  it('does not schedule expired comped cleanup under the test environment', async function () {
    await memberJobs.scheduleExpiredCompCleanupJob();

    assert.ok(
      scheduleStub.notCalled,
      'expired comped cleanup must not be scheduled under NODE_ENV=test*',
    );
  });

  it('schedules a single daily off-peak clean-expired-comped job outside the test environment', async function () {
    const originalEnv = process.env.NODE_ENV;
    sinon.stub(logging, 'info');
    process.env.NODE_ENV = 'production';
    try {
      await memberJobs.scheduleExpiredCompCleanupJob();
      await memberJobs.scheduleExpiredCompCleanupJob();
    } finally {
      process.env.NODE_ENV = originalEnv;
    }

    assert.ok(
      scheduleStub.calledOnce,
      'clean-expired-comped is scheduled once, however often scheduling is attempted',
    );
    const [envelope, schedule] = scheduleStub.firstCall.args;
    assert.equal(envelope.type, 'clean-expired-comped');
    assert.match(
      schedule.cron,
      /^\d{1,2} \d{1,2} [0-5] \* \* \*$/,
      'a random daily cron inside the 0-5am off-peak window',
    );
  });
});
