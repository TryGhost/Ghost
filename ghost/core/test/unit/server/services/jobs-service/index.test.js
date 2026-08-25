const assert = require('node:assert/strict');
const sinon = require('sinon');

const jobsService = require('../../../../../core/server/services/jobs-service');
const adapterManager = require('../../../../../core/server/services/adapter-manager').default;

describe('jobs-service wrapper', function () {
  afterEach(function () {
    sinon.restore();
  });

  // These two run before any init() in this file, so the module singleton is
  // still undefined.
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
