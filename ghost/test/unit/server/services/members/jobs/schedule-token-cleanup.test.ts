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

  it('schedules a daily clean-tokens job', async function () {
    sinon.stub(logging, 'info');

    await memberJobs.scheduleTokenCleanupJob(jobsService);

    assert.ok(jobsService.scheduleRecurring.calledOnce, 'clean-tokens is scheduled');
    const [job, schedule] = jobsService.scheduleRecurring.firstCall.args;
    assert.ok(job instanceof CleanTokensJob);
    assert.match(schedule.cron, /^\d+ \d+ \d+ \* \* \*$/, 'a random daily 6-field cron');
  });
});
