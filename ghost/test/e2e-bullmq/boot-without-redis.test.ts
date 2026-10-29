import assert from 'node:assert/strict';
import sinon from 'sinon';

const logging = require('@tryghost/logging');
const { agentProvider, configUtils } = require('../utils/e2e-framework');
const { getBullMQPrefix } = require('../utils/jobs-backend-utils');
const adapterManager = require('../../core/server/services/adapter-manager').default;
const BullMQJobsBackend = require('../../core/server/adapters/jobs/BullMQJobsBackend').default;

// JobsService keeps its first backend for the life of the process, so this needs
// its own file. Only the backend Ghost boots with has the dead connection: the
// test utilities' own cleanup still needs a working Redis.
describe('Booting Ghost on BullMQ with Redis unreachable', function () {
  const BOOT_BOUND_MS = 30000;
  let agent: any;
  let ghostServer: any;
  let bootMs: number;
  let unreachable: any;

  beforeAll(async function () {
    sinon.stub(logging, 'error');
    unreachable = new BullMQJobsBackend({
      ...configUtils.config.get('adapters:jobs:BullMQJobsBackend'),
      prefix: getBullMQPrefix(),
      connection: { host: '127.0.0.1', port: 1 },
    });
    sinon.stub(adapterManager, 'getAdapter').callThrough().withArgs('jobs').returns(unreachable);

    const startedAt = Date.now();
    ({ adminAgent: agent, ghostServer } = await agentProvider.getAgentsWithFrontend());
    bootMs = Date.now() - startedAt;
  });

  afterAll(async function () {
    await ghostServer?.stop();
    sinon.restore();
  });

  it('boots within a bounded time', function () {
    assert.ok(bootMs < BOOT_BOUND_MS, `boot took ${bootMs}ms`);
  });

  it('serves requests', async function () {
    await agent.get('site/').expectStatus(200);
  });

  // Boot skips recurring registration under NODE_ENV=test*, so this calls it
  // directly on the backend Ghost booted with. In production, initBackgroundServices
  // is not awaited and catches and logs each registration.
  it('fails a recurring registration within the timeout', async function () {
    const { enqueueTimeoutMs } = configUtils.config.get('adapters:jobs:BullMQJobsBackend');
    const startedAt = Date.now();
    await assert.rejects(
      unreachable.scheduleRecurring(
        { version: 1, payload: { job: { type: 'boot-test', payload: '{}' } } },
        { cron: '0 0 1 1 *' },
      ),
      /Timed out scheduling recurring job/,
    );
    assert.ok(Date.now() - startedAt <= enqueueTimeoutMs + 1000);
  });
});
