import assert from 'node:assert/strict';
import sinon from 'sinon';
import { describe, it, beforeEach, afterEach } from 'vitest';
import logging from '@tryghost/logging';
import { JobsService } from '../../../../../core/server/services/jobs-service/jobs-service';
import ExternalMediaInliner from '../../../../../core/server/services/media-inliner/external-media-inliner';
import ExternalMediaInlinerJob from '../../../../../core/server/services/media-inliner/external-media-inliner-job';
import ContentCSVImportJob from '../../../../../core/server/services/content-import/jobs/content-csv-import-job';
import UpdateCheckJob from '../../../../../core/server/services/update-check/jobs/update-check-job';
import UpdateCheckBootJob from '../../../../../core/server/services/update-check/jobs/update-check-boot-job';

const registerJobHandlers =
  require('../../../../../core/server/services/jobs-service/register-job-handlers').default;

describe('register-job-handlers', function () {
  let jobsService: sinon.SinonStubbedInstance<JobsService>;
  let db: { knex: sinon.SinonStub & { transaction?: sinon.SinonStub } };
  let loggingStub: sinon.SinonStubbedInstance<typeof logging>;
  let mediaInliner: sinon.SinonStubbedInstance<ExternalMediaInliner>;
  let models: { Member: { findOne: sinon.SinonStub } };
  let events: { emit: sinon.SinonStub };
  let sentry: { captureException: sinon.SinonStub };

  // Handlers are looked up by their job type rather than registration order,
  // so adding a handler does not silently shift which one a test exercises.
  function handlerFor(type: string) {
    const call = jobsService.handle
      .getCalls()
      .find((c) => (c.args[0] as { type?: string }).type === type);
    assert.ok(call, `a handler is registered for ${type}`);
    return call!.args[1] as (job: unknown) => Promise<void>;
  }

  beforeEach(function () {
    jobsService = sinon.createStubInstance(JobsService);
    db = { knex: sinon.stub() };
    loggingStub = sinon.stub(logging);
    mediaInliner = sinon.createStubInstance(ExternalMediaInliner);
    models = { Member: { findOne: sinon.stub() } };
    events = { emit: sinon.stub() };
    sentry = { captureException: sinon.stub() };

    registerJobHandlers({
      jobsService,
      db,
      logging: loggingStub,
      models,
      events,
      sentry,
      mediaInliner,
    });
  });

  afterEach(function () {
    sinon.restore();
  });

  // Nothing initialises the gifts service here, which is the state the guard
  // exists for: a dispatch that lands before boot has built the service must
  // fail loudly rather than reading undefined off the module.
  it('fails a clean-gifts delivery when the gift service is not initialised', async function () {
    const cleanGiftsHandler = handlerFor('clean-gifts');

    await assert.rejects(async () => {
      await cleanGiftsHandler({});
    }, /clean-gifts ran before the gifts service was initialised/);
  });

  it('runs clean-tokens with the injected database and logger', async function () {
    const deleteStub = sinon.stub().resolves(2);
    const whereStub = sinon.stub().returns({ delete: deleteStub });
    db.knex.withArgs('tokens').returns({ where: whereStub });
    const cleanTokensHandler = handlerFor('clean-tokens');

    await cleanTokensHandler({});

    assert.ok(db.knex.calledOnceWithExactly('tokens'));
    assert.ok(loggingStub.info.calledOnce);
    const metadata = loggingStub.info.firstCall.args[0] as {
      system: { deleted_count: number };
    };
    assert.equal(metadata.system.deleted_count, 2);
  });

  it('runs clean-expired-comped with the injected database, models, events and logger', async function () {
    db.knex.transaction = sinon.stub().callsFake(async (fn: (trx: unknown) => unknown) => {
      const trx = () => ({
        where: () => ({ select: async () => [] }),
      });
      return fn(trx);
    });
    const cleanExpiredCompedHandler = handlerFor('clean-expired-comped');

    await cleanExpiredCompedHandler({});

    const completionLog = loggingStub.info.getCalls().find((call) => {
      const metadata = call.args[0] as { system?: { event?: string } };
      return metadata?.system?.event === 'clean_expired_comped.completed';
    });
    assert.ok(completionLog, 'the handler runs the task against the injected dependencies');
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
  it('registers both update-check job types against the shared executor', async function () {
    // Compare type strings, not class identity: the module under test loads
    // its job classes through the CJS cache, a different instance from this
    // file's ESM imports.
    assert.equal(jobsService.handle.getCall(5).args[0].type, 'update-check');
    assert.equal(jobsService.handle.getCall(6).args[0].type, 'update-check-boot');

    await jobsService.handle.getCall(5).args[1](new UpdateCheckJob());
    await jobsService.handle.getCall(6).args[1](new UpdateCheckBootJob());
  });
});
