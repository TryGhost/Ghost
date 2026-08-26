import assert from 'node:assert/strict';
import sinon from 'sinon';
import { describe, it, beforeEach, afterEach } from 'vitest';
import logging from '@tryghost/logging';
import { JobsService } from '../../../../../core/server/services/jobs-service/jobs-service';
import ExternalMediaInliner from '../../../../../core/server/services/media-inliner/external-media-inliner';
import ExternalMediaInlinerJob from '../../../../../core/server/services/media-inliner/external-media-inliner-job';

const registerJobHandlers =
  require('../../../../../core/server/services/jobs-service/register-job-handlers').default;

describe('register-job-handlers', function () {
  let jobsService: sinon.SinonStubbedInstance<JobsService>;
  let db: { knex: sinon.SinonStub };
  let loggingStub: sinon.SinonStubbedInstance<typeof logging>;
  let mediaInliner: sinon.SinonStubbedInstance<ExternalMediaInliner>;

  beforeEach(function () {
    jobsService = sinon.createStubInstance(JobsService);
    db = { knex: sinon.stub() };
    loggingStub = sinon.stub(logging);
    mediaInliner = sinon.createStubInstance(ExternalMediaInliner);

    registerJobHandlers({ jobsService, db, logging: loggingStub, mediaInliner });
  });

  afterEach(function () {
    sinon.restore();
  });

  // Nothing initialises the gifts service here, which is the state the guard
  // exists for: a dispatch that lands before boot has built the service must
  // fail loudly rather than reading undefined off the module.
  it('fails a clean-gifts delivery when the gift service is not initialised', async function () {
    const cleanGiftsHandler = jobsService.handle.secondCall.args[1];

    await assert.rejects(async () => {
      await cleanGiftsHandler({});
    }, /clean-gifts ran before the gifts service was initialised/);
  });

  it('runs clean-tokens with the injected database and logger', async function () {
    const deleteStub = sinon.stub().resolves(2);
    const whereStub = sinon.stub().returns({ delete: deleteStub });
    db.knex.withArgs('tokens').returns({ where: whereStub });
    const cleanTokensHandler = jobsService.handle.firstCall.args[1];

    await cleanTokensHandler({});

    assert.ok(db.knex.calledOnceWithExactly('tokens'));
    assert.ok(loggingStub.info.calledOnce);
    const metadata = loggingStub.info.firstCall.args[0] as {
      system: { deleted_count: number };
    };
    assert.equal(metadata.system.deleted_count, 2);
  });

  it('runs external-media-inliner with the injected media inliner', async function () {
    const externalMediaInlinerHandler = jobsService.handle.thirdCall.args[1];
    const job = new ExternalMediaInlinerJob({ domains: ['https://example.com'] });

    await externalMediaInlinerHandler(job);

    assert.ok(mediaInliner.inline.calledOnceWithExactly(['https://example.com']));
  });

  it('propagates external-media-inliner failures', async function () {
    const error = new Error('Inlining failed');
    mediaInliner.inline.rejects(error);
    const externalMediaInlinerHandler = jobsService.handle.thirdCall.args[1];
    const job = new ExternalMediaInlinerJob({ domains: ['https://example.com'] });

    await assert.rejects(async () => {
      await externalMediaInlinerHandler(job);
    }, error);
  });
});
