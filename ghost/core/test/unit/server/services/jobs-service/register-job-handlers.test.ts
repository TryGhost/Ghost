import assert from 'node:assert/strict';
import sinon from 'sinon';
import { describe, it, beforeEach, afterEach } from 'vitest';
import logging from '@tryghost/logging';
import type { JobEnvelope } from '@tryghost/adapter-base-jobs';

// require, not import: these must resolve to the same CommonJS module
// instances register-job-handlers loads, so the init() and stubs here are the
// ones the handlers read.
const jobsService = require('../../../../../core/server/services/jobs-service');
const adapterManager = require('../../../../../core/server/services/adapter-manager').default;
const mediaInliner = require('../../../../../core/server/services/media-inliner');
const registerJobHandlers =
  require('../../../../../core/server/services/jobs-service/register-job-handlers').default;

describe('registerJobHandlers', function () {
  let processor: (envelope: JobEnvelope) => Promise<void>;
  let getInstanceStub: sinon.SinonStub;
  let inlineStub: sinon.SinonStub;

  beforeEach(async function () {
    const fakeBackend = {
      start({ processor: p }: { processor: typeof processor }) {
        processor = p;
      },
      enqueue() {},
      scheduleRecurring() {},
      async shutdown() {},
    };
    sinon.stub(adapterManager, 'getAdapter').withArgs('jobs').returns(fakeBackend);
    sinon.stub(logging, 'info');

    inlineStub = sinon.stub().resolves();
    getInstanceStub = sinon.stub(mediaInliner, 'getInstance').returns({ inline: inlineStub });

    jobsService.init();
    registerJobHandlers();
    await jobsService.getInstance().start();
  });

  afterEach(async function () {
    await jobsService.shutdown({ timeoutMs: 100 });
    sinon.restore();
  });

  it('registers the external-media-inliner handler on the class-based service', async function () {
    await processor({
      type: 'external-media-inliner',
      payload: JSON.stringify({ domains: ['https://example.com'] }),
    });

    assert.ok(inlineStub.calledOnceWithExactly(['https://example.com']));
  });

  it('reads the live media-inliner instance at execution time, not registration time', async function () {
    assert.ok(getInstanceStub.notCalled);

    await processor({
      type: 'external-media-inliner',
      payload: JSON.stringify({ domains: ['https://example.com'] }),
    });

    assert.ok(getInstanceStub.calledOnce);
  });
});
