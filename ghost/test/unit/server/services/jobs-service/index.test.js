const assert = require('node:assert/strict');
const sinon = require('sinon');
const configUtils = require('../../../../utils/config-utils');

const JOBS_SERVICE_PATH = '../../../../../core/server/services/jobs-service';

let jobsService;
let adapterManager;
let previousModule;

const stubKnex = { client: { config: { client: 'sqlite3' } } };
const stubConfig = { get: () => undefined };
const initArgs = { knex: stubKnex, config: stubConfig };

describe('jobs-service wrapper', function () {
  // The wrapper holds its instance in module state, and the unit project shares
  // modules across files, so reload it per test. vi.resetModules() only clears
  // the Vite module graph, not the CommonJS require cache these requires hit,
  // so evict the module directly. Otherwise whether the uninitialised cases
  // below hold depends on some other file's (or earlier test's) init().
  beforeEach(function () {
    previousModule = require.cache[require.resolve(JOBS_SERVICE_PATH)];
    delete require.cache[require.resolve(JOBS_SERVICE_PATH)];
    jobsService = require(JOBS_SERVICE_PATH);
    adapterManager = require('../../../../../core/server/services/adapter-manager').default;
  });

  afterEach(async function () {
    sinon.restore();
    await configUtils.restore();
    // Restore the original wrapper: already-loaded controllers still retain it.
    // Deleting only our copy would let later tests initialize a different one.
    delete require.cache[require.resolve(JOBS_SERVICE_PATH)];
    if (previousModule) {
      require.cache[require.resolve(JOBS_SERVICE_PATH)] = previousModule;
    }
  });

  it('shutdown before init resolves without constructing a service', async function () {
    await assert.doesNotReject(() => jobsService.shutdown());
  });

  it('getInstance throws before init', function () {
    assert.throws(() => jobsService.getInstance(), /used before init/);
  });

  function makeFakeBackend() {
    return {
      requiredFns: ['start', 'enqueue', 'scheduleRecurring', 'shutdown'],
      shutdownCalls: 0,
      start() {},
      enqueue() {},
      scheduleRecurring() {},
      async shutdown() {
        this.shutdownCalls += 1;
      },
    };
  }

  function stubAdapters() {
    const jobsBackend = makeFakeBackend();
    sinon.stub(adapterManager, 'getAdapter').withArgs('jobs').returns(jobsBackend);
    return { jobsBackend };
  }

  it('init builds the service from the jobs adapter and getInstance returns it', function () {
    stubAdapters();

    const service = jobsService.init(initArgs);

    assert.equal(
      jobsService.getInstance(),
      service,
      'getInstance returns the instance built by init',
    );
  });

  it('init after a shutdown reuses the same instance, so captured references stay live', async function () {
    stubAdapters();

    const service = jobsService.init(initArgs);
    await jobsService.shutdown({ timeoutMs: 10 });

    assert.equal(jobsService.init(initArgs), service, 'the instance survives a reboot');
    sinon.assert.calledOnceWithExactly(adapterManager.getAdapter, 'jobs');
  });

  it('checked-in defaults select the in-memory backend with three workers', function () {
    const defaults = require('../../../../../core/shared/config/defaults.json');

    assert.deepEqual(defaults.adapters.jobs, {
      active: 'InMemoryJobsBackend',
      InMemoryJobsBackend: { concurrency: 3 },
    });
  });

  it('re-init clears handlers so a reboot can register the same job types again', function () {
    stubAdapters();

    class RebootJob {
      static type = 'reboot-job';
    }
    jobsService.init(initArgs).handle(RebootJob, async () => {});

    jobsService.init(initArgs).handle(RebootJob, async () => {});
  });

  it('with the flag on, stays on the direct path when the jobs_outbox table is not available', async function () {
    stubAdapters();
    const logging = require('@tryghost/logging');
    const warn = sinon.stub(logging, 'warn');
    // jobs_outbox is in development, so it only exists where in-development
    // tables are created. Enabling the flag elsewhere must not break dispatch.
    configUtils.set('createInDevelopmentTables', false);

    const service = jobsService.init({
      knex: { client: { config: { client: 'mysql2' } } },
      config: { get: (key) => (key === 'services:jobs:outbox' ? { enabled: true } : undefined) },
    });
    await service.start();

    sinon.assert.calledWithMatch(warn, /jobs_outbox table/);
    await service.shutdown({ timeoutMs: 10 });
  });

  it('shutdown after init shuts down the backend', async function () {
    const { jobsBackend } = stubAdapters();

    jobsService.init(initArgs);
    await jobsService.shutdown({ timeoutMs: 10 });

    assert.equal(jobsBackend.shutdownCalls, 1, 'the jobs backend was shut down');
  });
});
