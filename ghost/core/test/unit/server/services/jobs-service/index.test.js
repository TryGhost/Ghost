/* global vi */

const assert = require('node:assert/strict');
const sinon = require('sinon');

let jobsService;
let adapterManager;

describe('jobs-service wrapper', function () {
  // The wrapper holds its instance in module state, and the unit project shares
  // modules across files, so reload it per test. Otherwise whether the
  // uninitialised cases below hold depends on some other file's init().
  beforeEach(function () {
    vi.resetModules();
    jobsService = require('../../../../../core/server/services/jobs-service');
    adapterManager = require('../../../../../core/server/services/adapter-manager').default;
  });

  afterEach(function () {
    sinon.restore();
  });

  it('shutdown before init resolves without constructing a service', async function () {
    await assert.doesNotReject(() => jobsService.shutdown());
  });

  it('getInstance throws before init', function () {
    assert.throws(() => jobsService.getInstance(), /used before init/);
  });

  it('init builds the service from the jobs adapter and getInstance returns it', function () {
    const fakeBackend = {
      requiredFns: ['start', 'enqueue', 'scheduleRecurring', 'shutdown'],
      start() {},
      enqueue() {},
      scheduleRecurring() {},
      async shutdown() {},
    };
    sinon.stub(adapterManager, 'getAdapter').withArgs('jobs').returns(fakeBackend);

    const service = jobsService.init();

    assert.equal(
      jobsService.getInstance(),
      service,
      'getInstance returns the instance built by init',
    );
  });
});
