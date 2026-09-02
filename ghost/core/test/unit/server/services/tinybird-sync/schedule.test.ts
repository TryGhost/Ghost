import assert from 'node:assert/strict';
import sinon from 'sinon';
import { afterEach, beforeEach, describe, it } from 'vitest';
import logging from '@tryghost/logging';
import { scheduleTinybirdSyncJob } from '../../../../../core/server/services/tinybird-sync';
import TinybirdSyncJob from '../../../../../core/server/services/tinybird-sync/tinybird-sync-job';

// require, not import: these must be the same CommonJS instances the service
// under test loads lazily, so the stubs below are the ones it reads.
const config = require('../../../../../core/shared/config');
const settingsCache = require('../../../../../core/shared/settings-cache');

describe('tinybird-sync scheduling', function () {
  let jobsService: { scheduleRecurring: sinon.SinonStub };
  let originalEnv: string | undefined;

  beforeEach(function () {
    jobsService = { scheduleRecurring: sinon.stub().resolves() };
    originalEnv = process.env.NODE_ENV;
    sinon.stub(logging, 'info');
  });

  afterEach(function () {
    process.env.NODE_ENV = originalEnv;
    sinon.restore();
  });

  it('does not schedule under the test environment', async function () {
    await scheduleTinybirdSyncJob(jobsService);

    assert.ok(jobsService.scheduleRecurring.notCalled);
  });

  it('does not schedule when Tinybird is not configured', async function () {
    process.env.NODE_ENV = 'production';
    sinon.stub(config, 'get').withArgs('tinybird:stats').returns(undefined);

    await scheduleTinybirdSyncJob(jobsService);

    assert.ok(jobsService.scheduleRecurring.notCalled);
  });

  it('schedules a single five-minute job with a random offset when Tinybird is configured', async function () {
    process.env.NODE_ENV = 'production';
    const get = sinon.stub(config, 'get');
    get.withArgs('tinybird:stats').returns({ endpoint: 'https://api.tinybird.co' });
    get.withArgs('tinybird:adminToken').returns('admin-token');
    sinon.stub(settingsCache, 'get').withArgs('site_uuid').returns('site-uuid');

    await scheduleTinybirdSyncJob(jobsService);
    await scheduleTinybirdSyncJob(jobsService);

    assert.ok(jobsService.scheduleRecurring.calledOnce);
    const [job, schedule] = jobsService.scheduleRecurring.firstCall.args;
    assert.ok(job instanceof TinybirdSyncJob);
    assert.match(schedule.cron, /^\d{1,2} [0-4]\/5 \* \* \* \*$/);
  });
});
