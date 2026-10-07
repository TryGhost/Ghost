import assert from 'node:assert/strict';
import sinon from 'sinon';
import InMemoryJobsBackend from '../../../../../core/server/adapters/jobs/InMemoryJobsBackend';
import type ProcessWebmentionJob from '../../../../../core/server/services/mentions/process-webmention-job';

const JOBS_SERVICE_PATH = '../../../../../core/server/services/jobs-service';
const adapterManager = require('../../../../../core/server/services/adapter-manager').default;
const logging = require('@tryghost/logging');
const MentionController = require('../../../../../core/server/services/mentions/mention-controller');
const ProcessWebmentionJobClass =
  require('../../../../../core/server/services/mentions/process-webmention-job').default;

describe('jobs-service retained consumers', function () {
  let jobsService: typeof import('../../../../../core/server/services/jobs-service');
  let backend: InMemoryJobsBackend;
  let previousModule: NodeModule | undefined;

  beforeEach(function () {
    // Isolate this lifecycle from other files sharing the CommonJS registry,
    // but keep the same module and consumer throughout the restart below.
    previousModule = require.cache[require.resolve(JOBS_SERVICE_PATH)];
    delete require.cache[require.resolve(JOBS_SERVICE_PATH)];
    jobsService = require(JOBS_SERVICE_PATH);
    backend = new InMemoryJobsBackend();
    sinon.stub(adapterManager, 'getAdapter').withArgs('jobs').returns(backend);
    sinon.stub(logging);
  });

  afterEach(async function () {
    try {
      await backend.shutdown({ timeoutMs: 0 });
    } finally {
      sinon.restore();
      delete require.cache[require.resolve(JOBS_SERVICE_PATH)];
      if (previousModule) {
        require.cache[require.resolve(JOBS_SERVICE_PATH)] = previousModule;
      }
    }
  });

  it('keeps a retained MentionController dispatching to the current handler after restart', async function () {
    const service = jobsService.init();
    const controller = new MentionController();
    const api = { processWebmention: sinon.stub().resolves() };
    await controller.init({
      api,
      jobsService: service,
      mentionResourceService: { getByID: sinon.stub() },
    });

    const firstDelivery = Promise.withResolvers<void>();
    const firstHandler = sinon.spy(async (job: ProcessWebmentionJob) => {
      await controller.processWebmention(job);
      firstDelivery.resolve();
    });
    service.handle(ProcessWebmentionJobClass, firstHandler, {
      queue: 'webmentions',
      concurrency: 3,
    });
    await service.start();

    await controller.receive({
      data: {
        source: 'https://source.example/first/',
        target: 'https://target.example/post/',
        extension: { sequence: 1 },
      },
    });
    await firstDelivery.promise;
    await jobsService.shutdown();

    sinon.assert.calledOnce(firstHandler);
    sinon.assert.calledOnceWithExactly(api.processWebmention, {
      source: new URL('https://source.example/first/'),
      target: new URL('https://target.example/post/'),
      payload: { extension: { sequence: 1 } },
    });

    const restartedService = jobsService.init();
    // Delivery alone can pass with a replacement service because the adapter
    // manager also retains its backend. Consumers still require this identity.
    assert.equal(restartedService, service);
    assert.equal(jobsService.getInstance(), service);

    const secondDelivery = Promise.withResolvers<void>();
    const secondHandler = sinon.spy(async (job: ProcessWebmentionJob) => {
      await controller.processWebmention(job);
      secondDelivery.resolve();
    });
    restartedService.handle(ProcessWebmentionJobClass, secondHandler, {
      queue: 'webmentions',
      concurrency: 3,
    });
    await restartedService.start();

    await controller.receive({
      data: {
        source: 'https://source.example/second/',
        target: 'https://target.example/post/',
        extension: { sequence: 2 },
      },
    });
    await secondDelivery.promise;
    await jobsService.shutdown();

    sinon.assert.calledOnce(firstHandler);
    sinon.assert.calledOnce(secondHandler);
    sinon.assert.calledTwice(api.processWebmention);
    assert.deepEqual(api.processWebmention.secondCall.args, [
      {
        source: new URL('https://source.example/second/'),
        target: new URL('https://target.example/post/'),
        payload: { extension: { sequence: 2 } },
      },
    ]);
    sinon.assert.notCalled(logging.error);
  });
});
