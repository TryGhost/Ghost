const assert = require('node:assert/strict');
const sinon = require('sinon');

const JOBS_SERVICE_PATH = '../../../../../core/server/services/jobs-service';

let jobsService;
let adapterManager;

describe('jobs-service wrapper', function () {
  // The wrapper holds its instance in module state, and the unit project shares
  // modules across files, so reload it per test. vi.resetModules() only clears
  // the Vite module graph, not the CommonJS require cache these requires hit,
  // so evict the module directly. Otherwise whether the uninitialised cases
  // below hold depends on some other file's (or earlier test's) init().
  beforeEach(function () {
    delete require.cache[require.resolve(JOBS_SERVICE_PATH)];
    jobsService = require(JOBS_SERVICE_PATH);
    adapterManager = require('../../../../../core/server/services/adapter-manager').default;
  });

  afterEach(function () {
    sinon.restore();
    // Evict again so an init() from this file's tests never leaks an
    // initialised singleton to other files sharing this worker.
    delete require.cache[require.resolve(JOBS_SERVICE_PATH)];
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

    const service = jobsService.init();

    assert.equal(
      jobsService.getInstance(),
      service,
      'getInstance returns the instance built by init',
    );
  });

  it('init after a shutdown reuses the same instance, so captured references stay live', async function () {
    stubAdapters();

    const service = jobsService.init();
    await jobsService.shutdown({ timeoutMs: 10 });

    assert.equal(jobsService.init(), service, 'the instance survives a reboot');
  });

  it('re-init clears handlers so a reboot can register the same job types again', function () {
    stubAdapters();

    class RebootJob {
      static type = 'reboot-job';
    }
    jobsService.init().handle(RebootJob, async () => {});

    jobsService.init().handle(RebootJob, async () => {});
  });

  it('shutdown after init shuts down the backend', async function () {
    const { jobsBackend } = stubAdapters();

    jobsService.init();
    await jobsService.shutdown({ timeoutMs: 10 });

    assert.equal(jobsBackend.shutdownCalls, 1, 'the jobs backend was shut down');
  });
});
