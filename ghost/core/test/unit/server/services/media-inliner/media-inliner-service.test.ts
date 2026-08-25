import assert from 'node:assert/strict';
import sinon from 'sinon';
import { describe, it, beforeEach } from 'vitest';

const mediaInlinerModule = require('../../../../../core/server/services/media-inliner/service');
const { MediaInlinerService } = mediaInlinerModule;
const ExternalMediaInlinerJob =
  require('../../../../../core/server/services/media-inliner/external-media-inliner-job').default;

describe('MediaInlinerService', function () {
  let inliner: { inline: sinon.SinonStub };
  let dispatch: sinon.SinonStub;
  let getJobsService: sinon.SinonStub;
  let logging: { info: sinon.SinonStub; error: sinon.SinonStub };
  let debug: sinon.SinonStub;
  let service: InstanceType<typeof MediaInlinerService>;

  beforeEach(function () {
    inliner = { inline: sinon.stub().resolves('inlined') };
    dispatch = sinon.stub().resolves();
    getJobsService = sinon.stub().returns({ dispatch });
    logging = { info: sinon.stub(), error: sinon.stub() };
    debug = sinon.stub();
    service = new MediaInlinerService({ inliner, getJobsService, logging, debug });
  });

  describe('inline', function () {
    it('delegates to the inliner', async function () {
      const result = await service.inline(['https://example.com']);

      assert.ok(inliner.inline.calledOnceWithExactly(['https://example.com']));
      assert.equal(result, 'inlined');
    });
  });

  describe('startMediaInliner', function () {
    const defaultDomains = ['https://s3.amazonaws.com/revue', 'https://substackcdn.com'];

    it('dispatches a job with default domains when none are provided', async function () {
      const result = await service.startMediaInliner(undefined);

      assert.ok(dispatch.calledOnce);
      const job = dispatch.firstCall.firstArg;
      assert.ok(job instanceof ExternalMediaInlinerJob);
      assert.deepEqual(job.domains, defaultDomains);
      assert.ok(logging.info.calledWithExactly('[Background Job] external-media-inliner queued'));
      assert.deepEqual(result, { status: 'success' });
    });

    it('applies default domains for an empty array', async function () {
      await service.startMediaInliner([]);

      assert.deepEqual(dispatch.firstCall.firstArg.domains, defaultDomains);
    });

    it('passes explicit domains through', async function () {
      await service.startMediaInliner(['https://example.com']);

      assert.deepEqual(dispatch.firstCall.firstArg.domains, ['https://example.com']);
    });

    it('resolves the jobs service at dispatch time, not construction time', async function () {
      assert.ok(getJobsService.notCalled);

      await service.startMediaInliner(['https://example.com']);

      assert.ok(getJobsService.calledOnce);
    });
  });

  describe('getInstance', function () {
    it('throws before init', function () {
      assert.throws(() => mediaInlinerModule.getInstance(), /used before init/);
    });
  });
});
