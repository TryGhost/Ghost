import assert from 'node:assert/strict';
import sinon from 'sinon';
import { describe, it, beforeEach, afterEach } from 'vitest';
import { JobsService } from '../../../../../core/server/services/jobs-service/jobs-service';
import ExternalMediaInliner from '../../../../../core/server/services/media-inliner/external-media-inliner';
import ExternalMediaInlinerJob from '../../../../../core/server/services/media-inliner/external-media-inliner-job';
import ContentCSVImportJob from '../../../../../core/server/services/content-import/jobs/content-csv-import-job';
import UpdateCheckJob from '../../../../../core/server/services/update-check/jobs/update-check-job';
import ProcessWebmentionJob from '../../../../../core/server/services/mentions/process-webmention-job';

const registerJobHandlers =
  require('../../../../../core/server/services/jobs-service/register-job-handlers').default;

describe('register-job-handlers', function () {
  let jobsService: sinon.SinonStubbedInstance<JobsService>;
  let mediaInliner: sinon.SinonStubbedInstance<ExternalMediaInliner>;
  let memberJobs: { cleanTokens: sinon.SinonStub; cleanExpiredComped: sinon.SinonStub };
  let giftService: { cleanup: sinon.SinonStub };
  let mentionsController: { processWebmention: sinon.SinonStub };

  // Handlers are looked up by their job type rather than registration order,
  // so adding a handler does not silently shift which one a test exercises.
  function registrationFor(type: string) {
    const call = jobsService.handle
      .getCalls()
      .find((c) => (c.args[0] as { type?: string }).type === type);
    assert.ok(call, `a handler is registered for ${type}`);
    return call!;
  }

  function handlerFor(type: string) {
    return registrationFor(type).args[1] as (job: unknown) => Promise<void>;
  }

  beforeEach(function () {
    jobsService = sinon.createStubInstance(JobsService);
    mediaInliner = sinon.createStubInstance(ExternalMediaInliner);
    memberJobs = {
      cleanTokens: sinon.stub().resolves(0),
      cleanExpiredComped: sinon.stub().resolves(),
    };
    giftService = { cleanup: sinon.stub().resolves() };
    mentionsController = { processWebmention: sinon.stub().resolves() };

    registerJobHandlers({
      jobsService,
      memberJobs,
      giftService,
      mediaInliner,
      mentionsController,
    });
  });

  afterEach(function () {
    sinon.restore();
  });

  it('runs clean-gifts with the injected gift service', async function () {
    const cleanGiftsHandler = handlerFor('clean-gifts');

    await cleanGiftsHandler({});

    assert.ok(giftService.cleanup.calledOnce);
  });

  it('runs clean-tokens with the injected member jobs module', async function () {
    const cleanTokensHandler = handlerFor('clean-tokens');

    await cleanTokensHandler({});

    assert.ok(memberJobs.cleanTokens.calledOnce);
  });

  it('runs clean-expired-comped with the injected member jobs module', async function () {
    const cleanExpiredCompedHandler = handlerFor('clean-expired-comped');

    await cleanExpiredCompedHandler({});

    assert.ok(memberJobs.cleanExpiredComped.calledOnce);
  });

  it('runs external-media-inliner with the injected media inliner', async function () {
    const externalMediaInlinerHandler = handlerFor('external-media-inliner');
    const job = new ExternalMediaInlinerJob({ domains: ['https://example.com'] });

    await externalMediaInlinerHandler(job);

    assert.ok(mediaInliner.inline.calledOnceWithExactly(['https://example.com']));
  });

  it('propagates external-media-inliner failures', async function () {
    const error = new Error('Inlining failed');
    mediaInliner.inline.rejects(error);
    const externalMediaInlinerHandler = handlerFor('external-media-inliner');
    const job = new ExternalMediaInlinerJob({ domains: ['https://example.com'] });

    await assert.rejects(async () => {
      await externalMediaInlinerHandler(job);
    }, error);
  });

  it('routes content CSV import jobs to the content import service', async function () {
    const job = new ContentCSVImportJob({
      importId: 'run_test',
      file: { path: '/tmp/staged-import', name: 'posts.zip' },
      mapping: { Headline: 'title' },
      importTagNames: ['#Import 2026-01-01 10:30', '#Import Run run_test'],
      emailRecipient: 'owner@example.com',
    });
    const contentImportHandler = handlerFor('content-csv-import');

    await assert.rejects(
      () => contentImportHandler(job),
      /Content import service used before init/,
    );
  });

  // Under the test env the update check executor exits at its environment
  // gate, so invoking the registered handler proves the wiring without
  // touching the network.
  it('registers the update-check handler', async function () {
    // handlerFor matches on the type string, not class identity: the module
    // under test loads its job class through the CJS cache, a different
    // instance from this file's ESM import.
    const updateCheckHandler = handlerFor('update-check');

    await updateCheckHandler(new UpdateCheckJob());
  });

  it('runs process-webmention with the injected mentions controller', async function () {
    const processWebmentionHandler = handlerFor('process-webmention');
    const job = new ProcessWebmentionJob({
      source: 'https://source.com/post/',
      target: 'https://target.com/post/',
      payload: {},
    });

    await processWebmentionHandler(job);

    assert.ok(mentionsController.processWebmention.calledOnceWithExactly(job));
  });

  // Guards the webmention isolation itself: dropping the options object in a
  // refactor would silently move webmentions back onto the shared queue while
  // every handler-behavior test still passes.
  it('registers process-webmention on the dedicated webmentions queue', function () {
    const registration = registrationFor('process-webmention');

    assert.deepEqual(registration.args[2], { queue: 'webmentions', concurrency: 3 });
  });
});
