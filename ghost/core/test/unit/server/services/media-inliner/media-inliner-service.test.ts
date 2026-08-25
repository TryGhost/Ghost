import assert from 'node:assert/strict';
import sinon from 'sinon';
import { describe, it, beforeEach } from 'vitest';

const mediaInlinerModule = require('../../../../../core/server/services/media-inliner/service');
const { MediaInlinerService } = mediaInlinerModule;

describe('MediaInlinerService', function () {
  let inliner: { inline: sinon.SinonStub };
  let jobsService: { addJob: sinon.SinonStub };
  let logging: { info: sinon.SinonStub; error: sinon.SinonStub };
  let debug: sinon.SinonStub;
  let service: InstanceType<typeof MediaInlinerService>;

  beforeEach(function () {
    inliner = { inline: sinon.stub().resolves('inlined') };
    jobsService = { addJob: sinon.stub().resolves() };
    logging = { info: sinon.stub(), error: sinon.stub() };
    debug = sinon.stub();
    service = new MediaInlinerService({ inliner, jobsService, logging, debug });
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

    it('enqueues an inline job with default domains when none are provided', async function () {
      const result = await service.startMediaInliner(undefined);

      assert.ok(jobsService.addJob.calledOnce);
      const jobArgs = jobsService.addJob.firstCall.firstArg;
      assert.equal(jobArgs.name, 'external-media-inliner');
      assert.equal(jobArgs.offloaded, false);
      assert.deepEqual(jobArgs.data, { domains: defaultDomains });
      assert.ok(logging.info.calledWithExactly('[Background Job] external-media-inliner queued'));
      assert.deepEqual(result, { status: 'success' });
    });

    it('applies default domains for an empty array', async function () {
      await service.startMediaInliner([]);

      assert.deepEqual(jobsService.addJob.firstCall.firstArg.data, { domains: defaultDomains });
    });

    it('passes explicit domains through', async function () {
      await service.startMediaInliner(['https://example.com']);

      assert.deepEqual(jobsService.addJob.firstCall.firstArg.data, {
        domains: ['https://example.com'],
      });
    });

    it('enqueues a job body that runs the inliner with the payload domains', async function () {
      await service.startMediaInliner(['https://example.com']);

      const { job, data } = jobsService.addJob.firstCall.firstArg;
      const result = await job(data);

      assert.ok(inliner.inline.calledOnceWithExactly(['https://example.com']));
      assert.equal(result, 'inlined');
    });

    it('enqueues a job body that logs and rethrows failures', async function () {
      const err = new Error('inlining failed');
      inliner.inline.rejects(err);
      await service.startMediaInliner(['https://example.com']);

      const { job, data } = jobsService.addJob.firstCall.firstArg;
      await assert.rejects(() => job(data), err);
      assert.ok(logging.error.calledOnce);
      assert.equal(logging.error.firstCall.args[0], err);
    });
  });

  describe('getInstance', function () {
    it('throws before init', function () {
      assert.throws(() => mediaInlinerModule.getInstance(), /used before init/);
    });
  });
});
