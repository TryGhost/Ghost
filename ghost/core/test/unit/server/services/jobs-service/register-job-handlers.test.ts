import assert from 'node:assert/strict';
import sinon from 'sinon';
import { describe, it, beforeEach, afterEach } from 'vitest';
import { JobsService } from '../../../../../core/server/services/jobs-service/jobs-service';
import ExternalMediaInliner from '../../../../../core/server/services/media-inliner/external-media-inliner';
import ExternalMediaInlinerJob from '../../../../../core/server/services/media-inliner/external-media-inliner-job';
import ContentCSVImportJob from '../../../../../core/server/services/content-import/jobs/content-csv-import-job';
import MembersImportJob from '../../../../../core/server/services/members/jobs/members-import-job';
import UpdateCheckJob from '../../../../../core/server/services/update-check/jobs/update-check-job';
import ProcessWebmentionJob from '../../../../../core/server/services/mentions/process-webmention-job';
import SendWebmentionsJob from '../../../../../core/server/services/mentions/send-webmentions-job';
import SendEmailJob from '../../../../../core/server/services/email-service/jobs/send-email-job';

const registerJobHandlers =
  require('../../../../../core/server/services/jobs-service/register-job-handlers').default;

describe('register-job-handlers', function () {
  let jobsService: sinon.SinonStubbedInstance<JobsService>;
  let mediaInliner: sinon.SinonStubbedInstance<ExternalMediaInliner>;
  let memberJobs: { cleanTokens: sinon.SinonStub; cleanExpiredComped: sinon.SinonStub };
  let giftService: { cleanup: sinon.SinonStub; processReminders: sinon.SinonStub };
  let mentionsController: { processWebmention: sinon.SinonStub };
  let mentionsSendingService: { sendWebmentions: sinon.SinonStub };
  let membersService: { handleImportJob: sinon.SinonStub };
  let emailService: { handleSendEmailJob: sinon.SinonStub };

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
    giftService = { cleanup: sinon.stub().resolves(), processReminders: sinon.stub().resolves() };
    mentionsController = { processWebmention: sinon.stub().resolves() };
    mentionsSendingService = { sendWebmentions: sinon.stub().resolves() };
    membersService = { handleImportJob: sinon.stub().resolves() };
    emailService = { handleSendEmailJob: sinon.stub().resolves() };

    registerJobHandlers({
      jobsService,
      memberJobs,
      giftService,
      mediaInliner,
      mentionsController,
      mentionsSendingService,
      membersService,
      emailService,
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

  it('runs send-gift-reminders with the injected gift service', async function () {
    const sendGiftRemindersHandler = handlerFor('send-gift-reminders');

    await sendGiftRemindersHandler({});

    assert.ok(giftService.processReminders.calledOnce);
  });

  // A failed reminder poll must reach the jobs service as a failure, not be
  // swallowed into a completion the way the legacy event subscription did.
  it('propagates send-gift-reminders failures', async function () {
    const error = new Error('reminder poll is broken');
    giftService.processReminders.rejects(error);
    const sendGiftRemindersHandler = handlerFor('send-gift-reminders');

    await assert.rejects(async () => {
      await sendGiftRemindersHandler({});
    }, error);
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

  it('runs members-import with the injected members service', async function () {
    const membersImportHandler = handlerFor('members-import');
    const job = new MembersImportJob({
      spoolKey: 'members-import-00000000-0000-0000-0000-000000000000.json',
      labelName: 'Import 2026-09-16 10:30',
      extraLabels: [{ name: 'VIP' }],
      emailRecipient: 'owner@example.com',
    });

    await membersImportHandler(job);

    assert.ok(membersService.handleImportJob.calledOnceWithExactly(job));
  });

  // The legacy inline queue ran members imports alongside the other one-off jobs, so
  // it stays on the shared default lane rather than a lane of its own.
  it('registers members-import on the shared default lane', function () {
    const registration = registrationFor('members-import');

    assert.equal(registration.args[2], undefined);
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

  it('runs send-webmentions with the injected mentions sending service', async function () {
    const sendWebmentionsHandler = handlerFor('send-webmentions');
    const job = new SendWebmentionsJob({
      sourceUrl: 'https://site.com/post/',
      html: '<a href="https://example.com/">link</a>',
      previousHtml: null,
    });

    await sendWebmentionsHandler(job);

    assert.ok(mentionsSendingService.sendWebmentions.calledOnceWithExactly(job));
  });

  it('registers send-webmentions on the dedicated webmentions queue', function () {
    const registration = registrationFor('send-webmentions');

    assert.deepEqual(registration.args[2], { queue: 'webmentions', concurrency: 3 });
  });

  it('runs send-email with the injected email service', async function () {
    const sendEmailHandler = handlerFor('send-email');
    const job = new SendEmailJob({ emailId: 'email-id' });

    await sendEmailHandler(job);

    assert.ok(emailService.handleSendEmailJob.calledOnceWithExactly(job));
  });

  it('registers send-email on a dedicated queue with room for two sends', function () {
    const registration = registrationFor('send-email');

    assert.deepEqual(registration.args[2], { queue: 'email', concurrency: 2 });
  });

  it('propagates send-email failures', async function () {
    const error = new Error('Send failed');
    emailService.handleSendEmailJob.rejects(error);

    await assert.rejects(
      () => handlerFor('send-email')(new SendEmailJob({ emailId: 'email-id' })),
      error,
    );
  });
});
