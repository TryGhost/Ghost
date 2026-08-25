import assert from 'node:assert/strict';
import sinon from 'sinon';
import { describe, it, beforeEach, afterEach } from 'vitest';

// require, not import: these must resolve to the same CommonJS module instances
// that register-job-handlers.ts reaches for at execution time.
const jobsService = require('../../../../../core/server/services/jobs-service');
const adapterManager = require('../../../../../core/server/services/adapter-manager').default;
const registerJobHandlers =
  require('../../../../../core/server/services/jobs-service/register-job-handlers').default;

type Processor = (envelope: { type: string; payload: string }) => Promise<void>;

describe('register-job-handlers', function () {
  let deliver: Processor;

  beforeEach(async function () {
    jobsService.init();
    const backend = adapterManager.getAdapter('jobs');
    sinon.stub(backend, 'start').callsFake((...args: unknown[]) => {
      deliver = (args[0] as { processor: Processor }).processor;
    });

    registerJobHandlers();
    await jobsService.getInstance().start();
  });

  afterEach(async function () {
    await jobsService.shutdown({ timeoutMs: 100 });
    sinon.restore();
  });

  // Nothing initialises the gifts service here, which is the state the guard
  // exists for: a dispatch that lands before boot has built the service must
  // fail loudly rather than reading undefined off the module.
  it('fails a clean-gifts delivery when the gift service is not initialised', async function () {
    await assert.rejects(
      () => deliver({ type: 'clean-gifts', payload: '{}' }),
      /clean-gifts ran before the gifts service was initialised/,
    );
  });
});
