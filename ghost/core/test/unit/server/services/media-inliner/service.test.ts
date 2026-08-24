import assert from 'node:assert/strict';
import sinon from 'sinon';
import { describe, it, afterEach } from 'vitest';

// require() so the singletons are the same instances the service under test uses
const mediaInlinerService = require('../../../../../core/server/services/media-inliner');
const adapterManager = require('../../../../../core/server/services/adapter-manager').default;
const ExternalMediaInlinerJob =
  require('../../../../../core/server/services/media-inliner/external-media-inliner-job').default;

function initServiceWithJobsService(dispatch: sinon.SinonStub) {
  sinon.stub(adapterManager, 'getAdapter').returns({});
  return mediaInlinerService.init({ getJobsService: () => ({ dispatch }) });
}

describe('media-inliner service', function () {
  // init() mutates the process-wide service singleton, and the unit project runs
  // with isolate:false — put it back or it leaks into the next file.
  const original = { inliner: mediaInlinerService.inliner, api: mediaInlinerService.api };

  afterEach(function () {
    mediaInlinerService.inliner = original.inliner;
    mediaInlinerService.api = original.api;
    sinon.restore();
  });

  it('exposes the configured inliner after init', async function () {
    await initServiceWithJobsService(sinon.stub().resolves());

    assert.equal(typeof mediaInlinerService.inliner.inline, 'function');
  });

  describe('startMediaInliner', function () {
    it('dispatches a job for the requested domains', async function () {
      const dispatch = sinon.stub().resolves();
      await initServiceWithJobsService(dispatch);

      const result = await mediaInlinerService.api.startMediaInliner(['https://example.com']);

      assert.deepEqual(result, { status: 'success' });
      sinon.assert.calledOnce(dispatch);
      const job = dispatch.firstCall.args[0];
      assert.ok(job instanceof ExternalMediaInlinerJob);
      assert.deepEqual(job.domains, ['https://example.com']);
    });

    it('dispatches a job for the default domains when none are given', async function () {
      const dispatch = sinon.stub().resolves();
      await initServiceWithJobsService(dispatch);

      await mediaInlinerService.api.startMediaInliner([]);

      assert.deepEqual(dispatch.firstCall.args[0].domains, [
        'https://s3.amazonaws.com/revue',
        'https://substackcdn.com',
      ]);
    });
  });

  describe('ExternalMediaInlinerJob', function () {
    it('has a stable type and a serialisable payload', function () {
      assert.equal(ExternalMediaInlinerJob.type, 'external-media-inliner');

      const job = new ExternalMediaInlinerJob({ domains: ['https://example.com'] });
      const roundTripped = new ExternalMediaInlinerJob(JSON.parse(JSON.stringify(job)));

      assert.deepEqual(roundTripped.domains, ['https://example.com']);
    });
  });
});
