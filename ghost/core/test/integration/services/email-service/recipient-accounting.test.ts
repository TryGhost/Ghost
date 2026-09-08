import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import ObjectID from 'bson-objectid';
import sinon from 'sinon';
import type { Knex } from 'knex';
import { recipientVerificationError } from '../../../../core/server/services/email-service/recipient-accounting';
import { SendingStatusService } from '../../../../core/server/services/email-service/sending-status-service';

const mapBatch = require('../../../../core/server/api/endpoints/utils/serializers/output/mappers/email-batches');
const logging = require('@tryghost/logging');
const models = require('../../../../core/server/models');
const db: { knex: Knex } = require('../../../../core/server/data/db');
const dbUtils = require('../../../utils/db-utils');
const BatchSendingService = require('../../../../core/server/services/email-service/batch-sending-service');
const SendingService = require('../../../../core/server/services/email-service/sending-service');
const MailgunEmailProvider = require('../../../../core/server/services/email-service/mailgun-email-provider');

// The legacy Bookshelf models are untyped; keep that boundary separate from the test fixtures.
type Email = InstanceType<typeof models.Email>;
type Batch = InstanceType<typeof models.EmailBatch>;
type SendData = {
  email: Email;
  post: Record<string, unknown>;
  newsletter: Record<string, unknown>;
};
type CreateBatchArgs = [
  Email,
  string | null,
  Record<string, unknown>[],
  { useFallbackDomain?: boolean; transacting?: Knex.Transaction; recipientCount?: number },
];
type TransactionHandler = (trx: Knex.Transaction) => Promise<Batch>;
const emailBatchTransactions: { transaction: (handler: TransactionHandler) => Promise<Batch> } =
  models.EmailBatch;

function assertVerificationError(
  error: unknown,
): asserts error is Error & { code: unknown; errorDetails: string } {
  assert.ok(error instanceof Error && 'code' in error && 'errorDetails' in error);
  assert.equal(typeof error.errorDetails, 'string');
}

function verificationDetails(error: unknown) {
  assertVerificationError(error);
  return JSON.parse(error.errorDetails);
}

describe('Recipient accounting through MySQL and Bookshelf', function () {
  let email: Email;
  let fixtureEmailIds: string[];
  let addedMemberIds: string[];
  let memberRestorations: { id: string; attributes: Record<string, unknown> }[];
  let service: {
    createBatch: (...args: CreateBatchArgs) => Promise<Batch>;
    createBatches: (data: SendData) => Promise<Batch[]>;
    getBatches: (email: Email) => Promise<Batch[]>;
    sendBatch: (data: { batch: Batch }) => Promise<boolean>;
    sendBatches: (data: SendData & { batches: Batch[] }) => Promise<void>;
    sendEmail: (email: Email) => Promise<void>;
    emailJob: (data: { emailId: string }) => Promise<void>;
    onPreStop: () => void;
    onShutdown: () => Promise<void>;
    retryDb: <T>(
      action: () => Promise<T>,
      options: { description: string; maxRetries: number; sleep: number },
    ) => Promise<T>;
  };
  let data: SendData;
  let sentry: { captureException: sinon.SinonStub; captureMessage: sinon.SinonStub };
  let renderer: { getSegments: sinon.SinonStub };
  let segmenter: { getMemberFilterForSegment: sinon.SinonStub };
  let sender: {
    getMaximumRecipients: () => number;
    getTargetDeliveryWindow: () => number;
    send: sinon.SinonStub;
  };

  beforeAll(async function () {
    await dbUtils.reset();
    await db.knex('members').insert(
      [1, 2, 3, 4].map((n) => ({
        id: n.toString(16).padStart(24, '0'),
        uuid: crypto.randomUUID(),
        transient_id: crypto.randomUUID(),
        email: `accounting-${n}@example.com`,
        status: 'free',
        created_at: new Date(),
        updated_at: new Date(),
      })),
    );
  });

  beforeEach(async function () {
    fixtureEmailIds = [];
    addedMemberIds = [];
    memberRestorations = [];
    sinon.stub(logging, 'info');
    sinon.stub(logging, 'error');
    sinon.stub(logging, 'warn');
    email = await models.Email.add({
      post_id: ObjectID().toHexString(),
      submitted_at: new Date(),
      email_count: 10,
      preflight_email_count: 10,
      csd_email_count: 3,
      recipient_filter: 'all',
    });
    sentry = { captureException: sinon.stub(), captureMessage: sinon.stub() };
    sender = {
      getMaximumRecipients: () => 2,
      getTargetDeliveryWindow: () => 0,
      send: sinon.stub().resolves({ id: 'accepted' }),
    };
    renderer = { getSegments: sinon.stub().resolves([null]) };
    segmenter = {
      getMemberFilterForSegment: sinon
        .stub()
        .callsFake((_newsletter: unknown, filter: string) =>
          filter === 'all' ? 'status:free' : filter,
        ),
    };
    service = createService();
    data = { email, post: {}, newsletter: {} };
  });

  afterEach(async function () {
    sinon.restore();
    for (const member of memberRestorations.reverse()) {
      await db.knex('members').where({ id: member.id }).update(member.attributes);
    }
    const emailIds = [email.id, ...fixtureEmailIds];
    await db
      .knex('email_recipients')
      .whereIn('email_id', emailIds)
      .orWhereIn('batch_id', db.knex('email_batches').select('id').whereIn('email_id', emailIds))
      .del();
    await db.knex('email_batches').whereIn('email_id', emailIds).del();
    await db.knex('emails').whereIn('id', emailIds).del();
    await db.knex('members').whereIn('id', addedMemberIds).del();
  });

  function createService(): typeof service {
    return new BatchSendingService({
      db,
      models,
      sentry,
      emailRenderer: renderer,
      emailSegmenter: segmenter,
      domainWarmingService: { isEnabled: () => true },
      sendingService: new SendingService({
        emailProvider: sender,
        emailRenderer: {
          renderBody: async () => ({ html: 'Hello', plaintext: 'Hello', replacements: [] }),
          getSubject: () => 'Hello',
          getFromAddress: () => 'sender@example.com',
          getReplyToAddress: () => null,
        },
        emailAddressService: {},
        sentry,
      }),
      BEFORE_RETRY_CONFIG: { maxRetries: 2, sleep: 0 },
      // These transaction fault injections target one operation at a time.
      // Concurrent scheduling is covered in recipient-preparation.test.ts.
      batchCreationConcurrency: 1,
    });
  }

  function stubEmailRelations() {
    const findOne = models.Email.findOne.bind(models.Email);
    sinon.stub(models.Email, 'findOne').callsFake(async (...args) => {
      const found = await findOne(...args);
      if (found) {
        sinon.stub(found, 'getLazyRelation').resolves({ get: () => 'published' });
      }
      return found;
    });
  }

  async function runEmailJob(batches: Batch[]) {
    sinon
      .stub(service, 'sendEmail')
      .callsFake((lockedEmail) => service.sendBatches({ ...data, email: lockedEmail, batches }));
    await service.emailJob({ emailId: email.id });
  }

  function useRealMailgunProvider() {
    const client = { send: sinon.stub().resolves({ id: '<accepted>' }) };
    const provider = new MailgunEmailProvider({
      mailgunClient: client,
      config: { get: () => undefined },
    });
    sender.send.callsFake(provider.send.bind(provider));
    return client;
  }

  async function corruptMember(id: string, patch: Record<string, unknown>) {
    const member = await db.knex('members').where({ id }).first();
    memberRestorations.push({
      id,
      attributes: Object.fromEntries(Object.keys(patch).map((key) => [key, member[key]])),
    });
    await db.knex('members').where({ id }).update(patch);
  }

  function loseCommitAcknowledgementOnce(afterCommit?: (batch: Batch) => Promise<void>) {
    const transaction = emailBatchTransactions.transaction.bind(models.EmailBatch);
    let lost = false;
    return sinon.stub(emailBatchTransactions, 'transaction').callsFake(async (handler) => {
      const result = await transaction(handler);
      if (!lost) {
        lost = true;
        await afterCommit?.(result);
        throw new Error('Commit acknowledgement lost');
      }
      return result;
    });
  }

  async function createOtherEmail() {
    const otherEmail = await models.Email.add({
      post_id: ObjectID().toHexString(),
      submitted_at: new Date(),
      email_count: 1,
    });
    fixtureEmailIds.push(otherEmail.id);
    return otherEmail;
  }

  for (const emptyAudience of [true, false]) {
    it(`uses accounted preparation with a zero preflight estimate (emptyAudience=${emptyAudience})`, async function () {
      await email.save({ preflight_email_count: 0 }, { patch: true });
      if (emptyAudience) {
        segmenter.getMemberFilterForSegment.returns("id:'000000000000000000000000'");
      }
      sinon.stub(email, 'getLazyRelation').resolves({});
      // emailJob reloads the email; use the same model so its test relations survive.
      const findOne = models.Email.findOne.bind(models.Email);
      sinon.stub(models.Email, 'findOne').callsFake(async (...args) => {
        const found = await findOne(...args);
        if (found) {
          sinon.stub(found, 'getLazyRelation').resolves({});
        }
        return found;
      });
      await service.emailJob({ emailId: email.id });
      await email.refresh();
      assert.equal(email.get('status'), 'submitted');
      assert.equal(email.get('email_count'), emptyAudience ? 0 : 4);
      assert.equal(email.get('candidate_count'), emptyAudience ? 0 : 4);
      assert.equal(email.get('preparation_excluded_count'), 0);
      assert.equal(email.get('preflight_email_count'), 0);
      assert.ok(email.get('prepared_at'));
      if (emptyAudience) {
        assert.deepEqual(await service.getBatches(email), []);
        sinon.assert.notCalled(sender.send);
      } else {
        sinon.assert.calledOnce(sentry.captureMessage);
      }
    });
  }

  it('detects email-owned recipient rows omitted from every batch count', async function () {
    await service.createBatches(data);
    const row = await db.knex('email_recipients').where({ email_id: email.id }).first();
    // Model corrupt persisted data without changing the schema. Restore this
    // connection's foreign-key setting before returning it to the pool.
    await db.knex.transaction(async (trx) => {
      await trx.raw('SET FOREIGN_KEY_CHECKS = 0');
      try {
        await trx('email_recipients').insert({
          ...row,
          id: ObjectID().toHexString(),
          batch_id: ObjectID().toHexString(),
        });
      } finally {
        await trx.raw('SET FOREIGN_KEY_CHECKS = 1');
      }
    });
    const reads = sinon.spy(service, 'getBatches');
    await assert.rejects(service.createBatches(data), (error) => {
      const details = verificationDetails(error);

      assert.equal(details.reason, 'preparation_totals');
      assert.equal(details.count_check, 'recipient_rows');
      assert.equal(details.expected, 4);
      assert.equal(details.actual, 5);
      assert.equal(details.count_mismatch, true);
      return true;
    });
    sinon.assert.calledOnce(reads);
  });

  it('stops accounted preparation at a page boundary without freezing the partial set', async function () {
    const createBatch = service.createBatch.bind(service);
    sinon.stub(service, 'createBatch').callsFake(async (...args) => {
      const batch = await createBatch(...args);
      if (!args[3]?.transacting) {
        service.onPreStop();
      }
      return batch;
    });
    await assert.rejects(service.createBatches(data), { code: 'BULK_EMAIL_SHUTDOWN_IN_PROGRESS' });
    await email.refresh();
    assert.equal(email.get('prepared_at'), null);
    assert.equal((await service.getBatches(email)).length, 1);
    assert.equal((await db.knex('email_recipients').where({ email_id: email.id })).length, 2);
    sinon.assert.notCalled(sender.send);
  });

  it('rolls back the retry claim when refreshing the saved email fails', async function () {
    stubEmailRelations();
    await email.save({ status: 'failed' }, { patch: true });
    const failedEmail = await models.Email.findOne({ id: email.id });
    const EmailService = require('../../../../core/server/services/email-service/email-service');
    const scheduleEmail = sinon.stub();
    const retryService = new EmailService({
      models,
      batchSendingService: {
        updateStatusLock: BatchSendingService.prototype.updateStatusLock.bind(service),
        scheduleEmail,
      },
    });
    sinon.stub(retryService, 'checkLimits').resolves();
    const refresh = models.Email.prototype.refresh;
    let failed = false;
    const readError = new Error('Lost retry refresh');
    const refreshStub = sinon
      .stub(models.Email.prototype, 'refresh')
      .callsFake(async function (this: Email, options) {
        if (!failed && this.id === email.id && this.get('status') === 'pending') {
          failed = true;
          throw readError;
        }
        return refresh.call(this, options);
      });
    await assert.rejects(retryService.retryEmail(failedEmail), readError);
    refreshStub.restore();
    assert.equal((await db.knex('emails').where({ id: email.id }).first()).status, 'failed');
    sinon.assert.notCalled(scheduleEmail);
    const claimed = await retryService.retryEmail(failedEmail);
    assert.equal(claimed.get('status'), 'pending');
    assert.equal(claimed.get('updated_at').getUTCMilliseconds(), 0);
    sinon.assert.calledOnce(scheduleEmail);
  });

  it('rejects an incorrect persisted email total before sending frozen recipients', async function () {
    await service.createBatches(data);
    await email.save({ email_count: 5 }, { patch: true });
    await assert.rejects(service.createBatches(data), (error) => {
      const details = verificationDetails(error);
      assert.equal(details.reason, 'email_recipient_count');
      assert.equal(details.expected, 4);
      assert.equal(details.actual, 5);
      assert.equal(details.count_mismatch, true);
      return true;
    });
    sinon.assert.notCalled(sender.send);
  });

  it('lets only one of two concurrent email jobs build the recipient set', async function () {
    stubEmailRelations();
    await Promise.all([
      service.emailJob({ emailId: email.id }),
      service.emailJob({ emailId: email.id }),
    ]);
    await email.refresh();
    assert.equal(email.get('status'), 'submitted');
    assert.equal(email.get('candidate_count'), 4);
    assert.equal((await service.getBatches(email)).length, 3);
    assert.equal((await db.knex('email_recipients').where({ email_id: email.id })).length, 4);
    const sentIds = sender.send
      .getCalls()
      .flatMap((call) =>
        call.args[0].recipients.map((recipient: { email: string }) => recipient.email),
      );
    assert.equal(sentIds.length, 4);
    assert.equal(new Set(sentIds).size, 4);
  });

  it('rejects a stale retry while the winning retry is still preparing recipients', async function () {
    stubEmailRelations();
    await email.save({ status: 'failed' }, { patch: true });
    const stale = await models.Email.findOne({ id: email.id });
    const winner = await models.Email.findOne({ id: email.id });
    const EmailService = require('../../../../core/server/services/email-service/email-service');
    let job: Promise<void> | undefined;
    const scheduleEmail = sinon.stub().callsFake((pending) => {
      job = service.emailJob({ emailId: pending.id });
    });
    const retryService = new EmailService({
      models,
      batchSendingService: {
        updateStatusLock: BatchSendingService.prototype.updateStatusLock.bind(service),
        scheduleEmail,
      },
    });
    sinon.stub(retryService, 'checkLimits').resolves();
    const createBatch = service.createBatch.bind(service);
    let checked = false;
    sinon.stub(service, 'createBatch').callsFake(async (...args) => {
      const batch = await createBatch(...args);
      if (!checked && !args[3]?.transacting) {
        checked = true;
        await assert.rejects(retryService.retryEmail(stale), { statusCode: 400 });
        await email.refresh();
        assert.equal(email.get('status'), 'submitting');
        assert.equal(email.get('prepared_at'), null);
      }
      return batch;
    });
    await retryService.retryEmail(winner);
    await job;
    assert.ok(checked);
    sinon.assert.calledOnce(scheduleEmail);
    await email.refresh();
    assert.equal(email.get('status'), 'submitted');
    assert.equal(email.get('email_count'), 4);
  });

  it('rebuilds partial preparation after shutdown with a fresh service', async function () {
    stubEmailRelations();
    const createBatch = service.createBatch.bind(service);
    sinon.stub(service, 'createBatch').callsFake(async (...args) => {
      const batch = await createBatch(...args);
      if (!args[3]?.transacting) {
        service.onPreStop();
      }
      return batch;
    });
    await service.emailJob({ emailId: email.id });
    await service.onShutdown();
    await email.refresh();
    const partialIds = (await service.getBatches(email)).map((batch) => batch.id);
    assert.equal(email.get('status'), 'submitting');
    assert.equal(email.get('prepared_at'), null);
    assert.equal(partialIds.length, 1);
    sinon.assert.notCalled(sender.send);

    // The boot scanner releases the interrupted email's lock before dispatching it.
    await email.save({ status: 'pending' }, { patch: true });
    const restarted = createService();
    await restarted.emailJob({ emailId: email.id });
    await email.refresh();
    assert.equal(email.get('status'), 'submitted');
    assert.equal(email.get('email_count'), 4);
    assert.equal(email.get('candidate_count'), 4);
    const batches = await restarted.getBatches(email);
    assert.ok(batches.every((batch) => !partialIds.includes(batch.id)));
    const sentIds = sender.send
      .getCalls()
      .flatMap((call) =>
        call.args[0].recipients.map((recipient: { email: string }) => recipient.email),
      );
    assert.equal(sentIds.length, 4);
    assert.equal(new Set(sentIds).size, 4);
  });

  it('drains active submissions and resumes the frozen recipients after shutdown', async function () {
    stubEmailRelations();
    await service.createBatches(data);
    const batchesBefore = await db
      .knex('email_batches')
      .where({ email_id: email.id })
      .orderBy('id');
    const rowsBefore = await db
      .knex('email_recipients')
      .select('id', 'batch_id', 'member_id', 'member_uuid', 'member_email')
      .where({ email_id: email.id })
      .orderBy('id');
    sender.send.callsFake(async () => {
      service.onPreStop();
      return { id: 'accepted-before-shutdown' };
    });
    await service.emailJob({ emailId: email.id });
    await service.onShutdown();
    await email.refresh();
    assert.equal(email.get('status'), 'submitting');
    const stopped = await service.getBatches(email);
    assert.ok(stopped.some((batch) => batch.get('status') === 'submitted'));
    assert.ok(stopped.some((batch) => batch.get('status') === 'pending'));
    assert.ok(stopped.every((batch) => batch.get('status') !== 'submitting'));

    sender.send.resolves({ id: 'accepted-after-restart' });
    segmenter.getMemberFilterForSegment.throws(
      new Error('Frozen recipients must not be swept again'),
    );
    await email.save({ status: 'pending' }, { patch: true });
    await createService().emailJob({ emailId: email.id });
    await email.refresh();
    assert.equal(email.get('status'), 'submitted');
    assert.equal(email.get('email_count'), 4);
    assert.deepEqual(
      (await service.getBatches(email)).map((batch) => batch.id).sort(),
      batchesBefore.map((batch) => batch.id),
    );
    assert.deepEqual(
      await db
        .knex('email_recipients')
        .select('id', 'batch_id', 'member_id', 'member_uuid', 'member_email')
        .where({ email_id: email.id })
        .orderBy('id'),
      rowsBefore,
    );
    const sentIds = sender.send
      .getCalls()
      .flatMap((call) =>
        call.args[0].recipients.map((recipient: { email: string }) => recipient.email),
      );
    assert.equal(sentIds.length, 4);
    assert.equal(new Set(sentIds).size, 4);
  });

  it('stops accounted cleanup between chunks without deleting the batch metadata', async function () {
    const partial = await models.EmailBatch.add({ email_id: email.id, recipient_count: 1001 });
    const member = await db.knex('members').first();
    await db.knex('email_recipients').insert(
      Array.from({ length: 1001 }, () => ({
        id: ObjectID().toHexString(),
        email_id: email.id,
        batch_id: partial.id,
        member_id: member.id,
        member_uuid: member.uuid,
        member_email: member.email,
      })),
    );
    const stop = (_response: unknown, query: { sql: string }) => {
      if (query.sql.startsWith('delete from `email_recipients`')) {
        service.onPreStop();
      }
    };
    db.knex.on('query-response', stop);
    try {
      await assert.rejects(service.createBatches(data), {
        code: 'BULK_EMAIL_SHUTDOWN_IN_PROGRESS',
      });
      assert.equal((await db.knex('email_recipients').where({ email_id: email.id })).length, 1);
      assert.equal((await service.getBatches(email)).length, 1);
      await email.refresh();
      assert.equal(email.get('prepared_at'), null);
    } finally {
      db.knex.removeListener('query-response', stop);
    }
  });

  for (const status of ['submitting', 'submitted']) {
    it(`ignores prior verification diagnostics on a ${status} batch`, async function () {
      const batches = await service.createBatches(data);
      await service.sendBatches({ ...data, batches });
      await batches[0].save(
        {
          status,
          error_data: JSON.stringify({
            code: 'BULK_EMAIL_RECIPIENT_VERIFICATION_FAILED',
            reason: 'previous_attempt',
          }),
        },
        { patch: true },
      );
      if (status === 'submitted') {
        await service.sendBatches({ ...data, batches: await service.getBatches(email) });
      } else {
        await assert.rejects(
          service.sendBatches({ ...data, batches: await service.getBatches(email) }),
          (error) => {
            assert.ok(error instanceof Error && 'code' in error);
            assert.equal(error.code, 'BULK_EMAIL_SUBMISSION_UNCERTAIN');
            assert.match(
              error.message,
              /We couldn’t confirm whether your newsletter finished sending/,
            );
            return true;
          },
        );
      }
    });
  }

  it('reports persisted verification failure when marking recipients processed subsequently fails', async function () {
    const batches = await service.createBatches(data);
    const failedBatch = batches.find((batch) => batch.get('recipient_count') === 2);
    await db
      .knex('email_recipients')
      .where({ batch_id: failedBatch.id })
      .update({ member_email: 'duplicate@example.com' });
    useRealMailgunProvider();
    // Exercise the exhausted-write result without retry backoff.
    sinon.stub(service, 'retryDb').callsFake(async (operation) => operation());
    const processedError = new Error('Unable to mark recipients processed');
    const processedSave = sinon.stub().rejects(processedError);
    sinon
      .stub(models.EmailRecipient, 'where')
      .callThrough()
      .withArgs({ batch_id: failedBatch.id })
      .returns({ save: processedSave });
    await runEmailJob(batches);
    sinon.assert.calledOnce(processedSave);
    await failedBatch.refresh();
    assert.equal(failedBatch.get('status'), 'failed');
    assert.equal(JSON.parse(failedBatch.get('error_data')).reason, 'provider_payload_count');
    await email.refresh();
    assert.equal(email.get('status'), 'failed');
    assert.match(email.get('error'), /checking your newsletter’s recipients/);
    sinon.assert.calledOnce(sentry.captureException);
    const details = verificationDetails(sentry.captureException.firstCall.args[0]);
    assert.equal(details.reason, 'batch_verification_failed');
    assert.equal(details.batch_id, failedBatch.id);
    assert.equal(details.batch_error.reason, 'provider_payload_count');
  });

  it('reports persisted verification failures during shutdown with unstarted batches', async function () {
    const batches = await service.createBatches(data);
    sender.send.onFirstCall().callsFake(async () => {
      service.onPreStop();
      throw recipientVerificationError(email.id, 'provider_payload_count');
    });
    await runEmailJob(batches);
    const reported = sentry.captureException
      .getCalls()
      .filter(
        ({ args }: sinon.SinonSpyCall) =>
          args[0].code === 'BULK_EMAIL_RECIPIENT_VERIFICATION_FAILED',
      );
    assert.equal(reported.length, 1);
    assert.equal(JSON.parse(reported[0].args[0].errorDetails).reason, 'batch_verification_failed');
    await email.refresh();
    assert.equal(email.get('status'), 'submitting');
    assert.equal(email.get('error'), null);
    assert.ok((await service.getBatches(email)).some((batch) => batch.get('status') === 'pending'));
  });

  it('reads active mixed-era progress from batch counts including all-excluded submissions', async function () {
    const batches = await service.createBatches(data);
    const full = batches.find((b) => b.get('recipient_count') === 2);
    const singles = batches.filter((b) => b.get('recipient_count') === 1);
    await email.save({ status: 'submitting' }, { patch: true });
    await full.save({ status: 'submitted' }, { patch: true });
    await singles[0].save(
      { status: 'submitted', submitted_count: 0, submission_excluded_count: 1 },
      { patch: true },
    );
    const statusService = new SendingStatusService({ knex: db.knex });
    const queries: string[] = [];
    const recordQuery = ({ sql }: { sql: string }) => queries.push(sql);
    db.knex.on('query', recordQuery);
    try {
      const active = await statusService.statusFor(email.id);
      assert.ok(active);
      assert.equal(active.sending.status, 'submitting');
      assert.equal(active.sending.progress.completed, 3);
      assert.equal(active.sending.progress.total, 4);
      assert.ok(queries.every((sql) => !sql.includes('email_recipients')));
    } finally {
      db.knex.removeListener('query', recordQuery);
    }
    await full.refresh();
    assert.equal(full.get('submitted_count'), null);
    assert.equal(singles[0].get('mailgun_message_id'), null);
    await singles[1].save(
      { status: 'submitted', submitted_count: 1, submission_excluded_count: 0 },
      { patch: true },
    );
    const done = await statusService.statusFor(email.id);
    assert.ok(done);
    assert.equal(done.sending.progress.completed, 4);
    assert.equal(done.sending.progress.total, 4);
  });

  it('preserves the failed progress total when an accounted batch count is unexpectedly null', async function () {
    const batches = await service.createBatches(data);
    const corrupt = batches.find((batch) => batch.get('recipient_count') === 1);
    await email.save({ status: 'failed' }, { patch: true });
    await db
      .knex('email_batches')
      .where({ email_id: email.id })
      .whereNot({ id: corrupt.id })
      .update({
        status: 'submitted',
        submitted_count: db.knex.ref('recipient_count'),
        submission_excluded_count: 0,
      });
    await corrupt.save({ status: 'failed', recipient_count: null }, { patch: true });
    const result = await new SendingStatusService({ knex: db.knex }).statusFor(email.id);
    assert.ok(result);
    assert.equal(result.sending.status, 'failed');
    assert.deepEqual(result.sending.progress, {
      completed: 3,
      total: 4,
      estimatedSecondsRemaining: null,
    });
    await corrupt.refresh();
    assert.equal(corrupt.get('recipient_count'), null);
  });

  it('leaves already-started legacy submission counts unknown and preserves the intended count', async function () {
    await createLegacyBatches(['submitted', 'pending', 'pending', 'pending']);
    await email.save({ email_count: 4 }, { patch: true });
    const batches = await service.createBatches(data);
    await db
      .knex('email_recipients')
      .where({ batch_id: batches.find((batch) => batch.get('status') === 'pending').id })
      .update({ member_email: 'invalid' });
    await runEmailJob(batches);
    await email.refresh();
    assert.equal(email.get('status'), 'submitted');
    assert.equal(email.get('email_count'), 4);
    assert.equal(email.get('preflight_email_count'), null);
    for (const batch of await service.getBatches(email)) {
      assert.equal(batch.get('submitted_count'), null);
      assert.equal(batch.get('submission_excluded_count'), null);
    }
  });

  it('verifies submission counts for an unsent legacy email rebuilt with accounting', async function () {
    await createLegacyBatches(['pending']);
    await runEmailJob(await service.createBatches(data));
    await email.refresh();
    assert.equal(email.get('status'), 'submitted');
    assert.equal(email.get('preflight_email_count'), 10);
    assert.equal(email.get('email_count'), 4);
    const batches = await service.getBatches(email);
    assert.equal(
      batches.reduce((sum, batch) => sum + batch.get('submitted_count'), 0),
      4,
    );
    assert.ok(batches.every((batch) => batch.get('submission_excluded_count') === 0));
  });

  it('rejects changed candidate totals while every submitted batch remains internally consistent', async function () {
    const batches = await service.createBatches(data);
    await service.sendBatches({ ...data, batches });
    sender.send.resetHistory();
    await email.save({ candidate_count: 5 }, { patch: true });
    await assert.rejects(
      service.sendBatches({ ...data, batches: await service.getBatches(email) }),
      (error) => {
        const details = verificationDetails(error);
        assert.equal(details.code, 'BULK_EMAIL_RECIPIENT_VERIFICATION_FAILED');
        // The preparation identity catches this before the redundant submission sum.
        assert.equal(details.reason, 'preparation_totals');
        return true;
      },
    );
    sinon.assert.notCalled(sender.send);
  });

  it('preserves a verified batch failure when another batch has an uncertain submission', async function () {
    const batches = await service.createBatches(data);
    await batches[0].save({ status: 'submitting' }, { patch: true });
    await batches[1].save(
      {
        status: 'failed',
        error_data: JSON.stringify({
          code: 'BULK_EMAIL_RECIPIENT_VERIFICATION_FAILED',
          reason: 'provider_payload_count',
        }),
      },
      { patch: true },
    );
    sinon.stub(service, 'sendBatch').resolves(false);
    await assert.rejects(service.sendBatches({ ...data, batches }), (error) => {
      const details = verificationDetails(error);
      assert.equal(details.code, 'BULK_EMAIL_RECIPIENT_VERIFICATION_FAILED');
      assert.equal(details.batch_id, batches[1].id);
      return true;
    });
  });

  it('alerts on preflight drift without rejecting a valid candidate sweep', async function () {
    await service.createBatches(data);
    sinon.assert.calledWithMatch(logging.warn, {
      event: { name: 'email.preparation.audience_drift' },
      preflight_email_count: 10,
      candidate_count: 4,
    });
    sinon.assert.calledOnce(sentry.captureMessage);
    sinon.assert.neverCalledWithMatch(logging.error, {
      event: { name: 'email.recipient_count.mismatch' },
    });
  });

  it('creates no batch for an all-excluded preparation page', async function () {
    const original = models.Member.getFilteredCollectionQuery.bind(models.Member);
    sinon
      .stub(models.Member, 'getFilteredCollectionQuery')
      .callsFake((...args) => original(...args).where('id', '000000000000000000000004'));
    const memberId = '000000000000000000000004';
    await corruptMember(memberId, { uuid: '' });
    assert.deepEqual(await service.createBatches(data), []);
    assert.equal(email.get('candidate_count'), 1);
    assert.equal(email.get('preparation_excluded_count'), 1);
    assert.equal(email.get('email_count'), 0);
    assert.ok(email.get('prepared_at'));
  });

  it('carries warming capacity and exclusions across an entirely excluded segment', async function () {
    renderer.getSegments.resolves(['status:-free', 'status:free']);
    segmenter.getMemberFilterForSegment.callsFake((_newsletter, _filter, segment) => segment);
    const memberId = '000000000000000000000004';
    await corruptMember(memberId, { uuid: '', status: 'paid' });
    const batches = await service.createBatches(data);
    await email.refresh();
    assert.equal(email.get('candidate_count'), 4);
    assert.equal(email.get('preparation_excluded_count'), 1);
    assert.equal(email.get('email_count'), 3);
    assert.equal(email.get('csd_email_count'), 3);
    assert.ok(email.get('prepared_at'));
    assert.deepEqual(
      batches
        .map((batch) => [
          batch.get('member_segment'),
          batch.get('fallback_sending_domain'),
          batch.get('recipient_count'),
        ])
        .sort(),
      [
        ['status:free', false, 2],
        ['status:free', true, 1],
      ],
    );
    const recipients = await db.knex('email_recipients').where({ email_id: email.id });
    assert.deepEqual(recipients.map((row) => row.member_id).sort(), [
      '000000000000000000000001',
      '000000000000000000000002',
      '000000000000000000000003',
    ]);
    sinon.assert.calledOnce(sentry.captureException);
  });

  for (const [warmupLimit, memberId, expectedBatches] of [
    [
      3,
      '000000000000000000000004',
      [
        [false, 1],
        [false, 1],
        [true, 1],
      ],
    ],
    [
      1,
      '000000000000000000000004',
      [
        [true, 1],
        [true, 2],
      ],
    ],
    [
      1,
      '000000000000000000000003',
      [
        [false, 1],
        [true, 1],
        [true, 1],
      ],
    ],
  ] as const) {
    it(`counts exclusions once across warming pages and commit recovery (${warmupLimit}, ${memberId})`, async function () {
      await email.save({ csd_email_count: warmupLimit }, { patch: true });
      await corruptMember(memberId, { uuid: '' });
      loseCommitAcknowledgementOnce();
      const batches = await service.createBatches(data);
      assert.deepEqual(
        batches
          .map((batch) => [batch.get('fallback_sending_domain'), batch.get('recipient_count')])
          .sort(),
        expectedBatches,
      );
      assert.equal(email.get('candidate_count'), 4);
      assert.equal(email.get('preparation_excluded_count'), 1);
      assert.equal(email.get('email_count'), 3);
      assert.equal((await db.knex('email_recipients').where({ email_id: email.id })).length, 3);
    });
  }

  async function addMember(id = ObjectID().toHexString()) {
    const template = await db.knex('members').first();
    addedMemberIds.push(id);
    await db.knex('members').insert({
      ...template,
      id,
      uuid: crypto.randomUUID(),
      transient_id: crypto.randomUUID(),
      email: `${id}@example.com`,
      created_at: new Date('2020-01-01'),
    });
    return id;
  }

  it('excludes newly added members even when their creation timestamp is backdated', async function () {
    const createBatch = service.createBatch.bind(service);
    let newMemberId: string;
    sinon.stub(service, 'createBatch').callsFake(async (...args) => {
      const batch = await createBatch(...args);
      if (!args[3]?.transacting && !newMemberId) {
        newMemberId = await addMember();
      }
      return batch;
    });
    await service.createBatches(data);
    assert.equal(email.get('candidate_count'), 4);
    const recipients = await db.knex('email_recipients').where({ email_id: email.id });
    assert.equal(recipients.length, 4);
    assert.ok(recipients.every((row) => row.member_id !== newMemberId));
  });

  it('preserves large numeric member IDs selected by the sweep', async function () {
    await addMember('650706040078550001536020');
    await addMember('65070957007855000153605b');
    await service.createBatches(data);
    const actual = await db
      .knex('email_recipients')
      .where({ email_id: email.id })
      .orderBy('member_id')
      .pluck('member_id');
    assert.deepEqual(actual, await db.knex('members').orderBy('id').pluck('id'));
    assert.equal(email.get('candidate_count'), 6);
  });

  for (const [enabled, limit, primaryCount] of [
    [false, 0, 4],
    [true, 0, 0],
    [true, 2, 2],
    [true, 4, 4],
    [true, 10, 4],
    [true, null, 4],
  ] as const) {
    it(`preserves warming allocation and its stored allowance (${enabled}, ${limit})`, async function () {
      await email.save({ csd_email_count: limit }, { patch: true });
      service = new BatchSendingService({
        db,
        models,
        sentry,
        emailRenderer: renderer,
        emailSegmenter: segmenter,
        domainWarmingService: { isEnabled: () => enabled },
        sendingService: sender,
      });
      const batches = await service.createBatches(data);
      assert.equal(
        batches
          .filter((batch) => !batch.get('fallback_sending_domain'))
          .reduce((sum, batch) => sum + batch.get('recipient_count'), 0),
        primaryCount,
      );
      assert.equal(
        batches.reduce((sum, batch) => sum + batch.get('recipient_count'), 0),
        4,
      );
      assert.equal(email.get('email_count'), 4);
      assert.equal(email.get('csd_email_count'), limit);
    });
  }

  it('finishes a warming page before filling the next page on the fallback domain', async function () {
    await email.save({ csd_email_count: 1 }, { patch: true });
    sinon.stub(sender, 'getMaximumRecipients').returns(3);
    const batches = await service.createBatches(data);
    assert.equal(batches.length, 2);
    const primary = batches.find((batch) => !batch.get('fallback_sending_domain'));
    const fallback = batches.find((batch) => batch.get('fallback_sending_domain'));
    assert.equal(primary.get('recipient_count'), 1);
    assert.equal(fallback.get('recipient_count'), 3);
    assert.deepEqual(
      await db.knex('email_recipients').where({ batch_id: primary.id }).pluck('member_id'),
      ['000000000000000000000004'],
    );
    assert.deepEqual(
      await db
        .knex('email_recipients')
        .where({ batch_id: fallback.id })
        .orderBy('member_id')
        .pluck('member_id'),
      ['000000000000000000000001', '000000000000000000000002', '000000000000000000000003'],
    );
    assert.equal(email.get('candidate_count'), 4);
    assert.equal(email.get('preparation_excluded_count'), 0);
    assert.equal(email.get('email_count'), 4);
  });

  it('prepares disjoint segments without duplicating or omitting members', async function () {
    await corruptMember('000000000000000000000001', { status: 'paid' });
    await corruptMember('000000000000000000000002', { status: 'paid' });
    renderer.getSegments.resolves(['status:free', 'status:paid']);
    segmenter.getMemberFilterForSegment.callsFake((_newsletter, _filter, segment) => segment);
    const batches = await service.createBatches(data);
    for (const segment of ['status:free', 'status:paid']) {
      assert.equal(
        batches
          .filter((batch) => batch.get('member_segment') === segment)
          .reduce((sum, batch) => sum + batch.get('recipient_count'), 0),
        2,
      );
    }
    const actual = await db
      .knex('email_recipients')
      .where({ email_id: email.id })
      .orderBy('member_id')
      .pluck('member_id');
    assert.deepEqual(actual, await db.knex('members').orderBy('id').pluck('id'));
    assert.equal(email.get('candidate_count'), 4);
  });

  async function createLegacyBatches(statuses: string[]) {
    await email.save({ preflight_email_count: null }, { patch: true });
    const members = await db.knex('members').orderBy('id', 'desc');
    const batches = [];
    for (const [index, status] of statuses.entries()) {
      const batch = await service.createBatch(email, null, [members[index]], {
        useFallbackDomain: false,
      });
      await batch.save({ status }, { patch: true });
      batches.push(batch);
    }
    return batches;
  }

  for (const pendingCount of [0, 2, 4]) {
    it(`rebuilds unsent legacy preparation against current eligibility (${pendingCount} pending batches)`, async function () {
      const old = await createLegacyBatches(Array(pendingCount).fill('pending'));
      await corruptMember('000000000000000000000004', { status: 'paid' });
      const batches = await service.createBatches(data);
      assert.ok(batches.every((batch) => !old.some((previous) => previous.id === batch.id)));
      const recipients = await db.knex('email_recipients').where({ email_id: email.id });
      assert.equal(recipients.length, 3);
      assert.ok(recipients.every((row) => row.member_id !== '000000000000000000000004'));
      await email.refresh();
      assert.equal(email.get('preflight_email_count'), 10);
      assert.equal(email.get('candidate_count'), 3);
      assert.equal(email.get('email_count'), 3);
      assert.equal(email.get('csd_email_count'), 3);
      assert.equal(email.get('preparation_excluded_count'), 0);
      assert.ok(email.get('prepared_at'));
      assert.equal(
        batches.reduce((sum, batch) => sum + batch.get('recipient_count'), 0),
        3,
      );
      const audience = sinon
        .stub(models.Member, 'getFilteredCollectionQuery')
        .throws(new Error('Frozen'));
      assert.deepEqual(
        (await service.createBatches(data)).map((batch) => batch.id),
        batches.map((batch) => batch.id),
      );
      sinon.assert.notCalled(audience);
    });
  }

  for (const status of ['submitting', 'submitted', 'failed']) {
    it(`preserves all legacy batches when one has started submission (${status})`, async function () {
      await createLegacyBatches([status, 'pending']);
      const before = await db.knex('email_batches').where({ email_id: email.id }).orderBy('id');
      const recipients = await db
        .knex('email_recipients')
        .where({ email_id: email.id })
        .orderBy('id');
      const audience = sinon
        .stub(models.Member, 'getFilteredCollectionQuery')
        .throws(new Error('Already started'));
      const batches = await service.createBatches(data);
      assert.equal(batches.length, 2);
      assert.deepEqual(
        await db.knex('email_batches').where({ email_id: email.id }).orderBy('id'),
        before,
      );
      assert.deepEqual(
        await db.knex('email_recipients').where({ email_id: email.id }).orderBy('id'),
        recipients,
      );
      await email.refresh();
      assert.equal(email.get('preflight_email_count'), null);
      assert.equal(email.get('candidate_count'), null);
      assert.equal(email.get('prepared_at'), null);
      sinon.assert.notCalled(audience);
    });
  }

  it('recovers an uncertain commit after opting an unsent legacy email into accounting', async function () {
    await email.save({ preflight_email_count: null }, { patch: true });
    loseCommitAcknowledgementOnce();
    const batches = await service.createBatches(data);
    assert.equal(batches.length, 3);
    assert.equal((await db.knex('email_recipients').where({ email_id: email.id })).length, 4);
    assert.ok(batches.every((batch) => batch.get('recipient_count') !== null));
    await email.refresh();
    assert.equal(email.get('preflight_email_count'), 10);
    assert.ok(email.get('prepared_at'));
  });

  it('rebuilds after a crash between legacy opt-in and batch creation', async function () {
    const old = await createLegacyBatches(['pending']);
    const create = sinon
      .stub(service, 'createBatch')
      .rejects(new Error('Interrupted after opt-in'));
    await assert.rejects(service.createBatches(data), /Interrupted after opt-in/);
    await email.refresh();
    assert.equal(email.get('preflight_email_count'), 10);
    assert.equal(email.get('prepared_at'), null);
    create.restore();
    const batches = await service.createBatches(data);
    assert.ok(batches.every((batch) => batch.id !== old[0].id));
    assert.equal(email.get('candidate_count'), 4);
    assert.ok(email.get('prepared_at'));
  });

  it('rejects extra batch recipients belonging to another email', async function () {
    const batches = await service.createBatches(data);
    const row = await db.knex('email_recipients').where({ batch_id: batches[0].id }).first();
    const extraId = ObjectID().toHexString();
    const otherEmail = await createOtherEmail();
    await db.knex('email_recipients').insert({ ...row, id: extraId, email_id: otherEmail.id });
    await assert.rejects(service.createBatches(data), (error) => {
      const details = verificationDetails(error);
      assert.equal(details.reason, 'cross_email_recipient');
      return true;
    });
  });

  it('classifies reverse ownership corruption as an ownership failure on frozen preparation', async function () {
    await service.createBatches(data);
    const otherEmail = await createOtherEmail();
    const member = await db.knex('members').first();
    const otherBatch = await service.createBatch(otherEmail, null, [member], {
      useFallbackDomain: false,
    });
    await db
      .knex('email_recipients')
      .where({ batch_id: otherBatch.id })
      .update({ email_id: email.id });
    const getBatches = sinon.spy(service, 'getBatches');
    await assert.rejects(service.createBatches(data), (error) => {
      const details = verificationDetails(error);
      assert.equal(details.reason, 'cross_email_recipient');
      assert.equal(details.batch_id, otherBatch.id);
      return true;
    });
    sinon.assert.calledOnce(getBatches);
    sinon.assert.calledWithMatch(logging.error, {
      event: { name: 'email.verification.failed' },
      reason: 'cross_email_recipient',
      batch_id: otherBatch.id,
    });
    sinon.assert.neverCalledWithMatch(logging.error, {
      event: { name: 'email.recipient_count.mismatch' },
    });
  });

  it('returns the persisted preparation set when an in-memory batch result is stale', async function () {
    const createBatch = service.createBatch.bind(service);
    sinon.stub(service, 'createBatch').callsFake(async (...args) => {
      const batch = await createBatch(...args);
      return args[3]?.transacting ? batch : { id: 'stale-result' };
    });
    const batches = await service.createBatches(data);
    const persisted = await service.getBatches(email);
    assert.deepEqual(batches.map((b) => b.id).sort(), persisted.map((b) => b.id).sort());
  });

  it('does not reach submission after preparation verification fails in sendEmail', async function () {
    sinon.stub(email, 'getLazyRelation').resolves({});
    const createBatch = service.createBatch.bind(service);
    sinon.stub(service, 'createBatch').callsFake(async (...args) => {
      const batch = await createBatch(...args);
      if (!args[3]?.transacting) {
        await db.knex('email_recipients').where({ batch_id: batch.id }).del();
      }
      return batch;
    });
    await assert.rejects(service.sendEmail(email), {
      code: 'BULK_EMAIL_RECIPIENT_VERIFICATION_FAILED',
    });
    sinon.assert.notCalled(sender.send);
  });

  it('rejects batches that become newer than preparation during submission', async function () {
    const batches = await service.createBatches(data);
    sinon.stub(service, 'sendBatch').callsFake(async ({ batch }) => {
      await db
        .knex('email_batches')
        .where({ id: batch.id })
        .update({
          status: 'submitted',
          created_at: new Date(email.get('prepared_at').getTime() + 1000),
        });
      return true;
    });
    await assert.rejects(service.sendBatches({ ...data, batches }), (error) => {
      const details = verificationDetails(error);
      assert.equal(details.reason, 'batch_after_preparation');
      return true;
    });
  });

  it('refuses completion when a worker reports success but its persisted batch failed', async function () {
    const batches = await service.createBatches(data);
    sinon.stub(service, 'sendBatch').callsFake(async ({ batch }) => {
      await db.knex('email_batches').where({ id: batch.id }).update({ status: 'failed' });
      return true;
    });
    await assert.rejects(
      service.sendBatches({ ...data, batches }),
      /please retry sending your newsletter/,
    );
  });

  it('reports cross-email recipient corruption before deleting incomplete preparation', async function () {
    const member = await db.knex('members').first();
    const batch = await service.createBatch(email, null, [member], {
      useFallbackDomain: false,
      recipientCount: 1,
    });
    const otherEmail = await createOtherEmail();
    const row = await db.knex('email_recipients').where({ batch_id: batch.id }).first();
    const extraId = ObjectID().toHexString();
    await db.knex('email_recipients').insert({ ...row, id: extraId, email_id: otherEmail.id });
    await assert.rejects(service.createBatches(data), (error) => {
      const details = verificationDetails(error);
      assert.equal(details.code, 'BULK_EMAIL_RECIPIENT_VERIFICATION_FAILED');
      assert.equal(details.reason, 'cross_email_recipient');
      assert.equal(details.batch_id, batch.id);
      assert.equal(details.can_rebuild, false);
      return true;
    });
    assert.equal((await db.knex('email_recipients').where({ batch_id: batch.id })).length, 2);
    assert.equal((await service.getBatches(email)).length, 1);
  });

  for (const hasOwnBatch of [false, true]) {
    it(`preserves recipients owned by this email in another email's batch (hasOwnBatch=${hasOwnBatch})`, async function () {
      const member = await db.knex('members').first();
      if (hasOwnBatch) {
        await service.createBatch(email, null, [member], {
          useFallbackDomain: false,
          recipientCount: 1,
        });
      }
      const otherEmail = await createOtherEmail();
      const otherBatch = await service.createBatch(otherEmail, null, [member], {
        useFallbackDomain: false,
      });
      const row = await db.knex('email_recipients').where({ batch_id: otherBatch.id }).first();
      await db.knex('email_recipients').where({ id: row.id }).update({ email_id: email.id });
      const emailIds = [email.id, otherEmail.id];
      const recipients = await db
        .knex('email_recipients')
        .whereIn('email_id', emailIds)
        .orderBy('id');
      const batches = await db.knex('email_batches').whereIn('email_id', emailIds).orderBy('id');
      await assert.rejects(service.createBatches(data), (error) => {
        const details = verificationDetails(error);
        assert.equal(details.code, 'BULK_EMAIL_RECIPIENT_VERIFICATION_FAILED');
        assert.equal(details.reason, 'cross_email_recipient');
        assert.equal(details.batch_id, otherBatch.id);
        return true;
      });
      assert.deepEqual(
        await db.knex('email_recipients').whereIn('email_id', emailIds).orderBy('id'),
        recipients,
      );
      assert.deepEqual(
        await db.knex('email_batches').whereIn('email_id', emailIds).orderBy('id'),
        batches,
      );
    });
  }

  for (const balancedSwap of [false, true]) {
    it(`rejects foreign recipient ownership in frozen batches (balancedSwap=${balancedSwap})`, async function () {
      const batches = await service.createBatches(data);
      const ownRow = await db.knex('email_recipients').where({ batch_id: batches[0].id }).first();
      const member = await db.knex('members').first();
      const otherEmail = await createOtherEmail();
      const otherBatch = await service.createBatch(otherEmail, null, [member], {
        useFallbackDomain: false,
      });
      const foreignRow = await db
        .knex('email_recipients')
        .where({ batch_id: otherBatch.id })
        .first();
      await db
        .knex('email_recipients')
        .where({ id: foreignRow.id })
        .update({ batch_id: batches[0].id });
      if (balancedSwap) {
        await db
          .knex('email_recipients')
          .where({ id: ownRow.id })
          .update({ batch_id: otherBatch.id });
      }
      await assert.rejects(service.createBatches(data), (error) => {
        const details = verificationDetails(error);
        assert.equal(details.code, 'BULK_EMAIL_RECIPIENT_VERIFICATION_FAILED');
        assert.equal(details.reason, 'cross_email_recipient');
        return true;
      });
      sinon.assert.notCalled(sender.send);
    });
  }

  it('persists verified submission totals and exclusions when completing the email', async function () {
    const batches = await service.createBatches(data);
    const excludedBatch = batches.find((batch) => batch.get('recipient_count') === 1);
    await db
      .knex('email_recipients')
      .where({ batch_id: excludedBatch.id })
      .update({ member_email: 'invalid' });
    await runEmailJob(batches);
    await email.refresh();
    assert.equal(email.get('status'), 'submitted');
    assert.equal(email.get('email_count'), 3);
    assert.equal(email.get('candidate_count'), 4);
    const persisted = await service.getBatches(email);
    assert.equal(
      persisted.reduce((sum, b) => sum + b.get('submitted_count'), 0),
      3,
    );
    assert.equal(
      persisted.reduce((sum, b) => sum + b.get('submission_excluded_count'), 0),
      1,
    );
    await excludedBatch.refresh();
    assert.equal(excludedBatch.get('status'), 'submitted');
    assert.equal(excludedBatch.get('submitted_count'), 0);
    assert.equal(excludedBatch.get('mailgun_message_id'), null);
    sinon.assert.calledWithMatch(logging.info, {
      event: { name: 'email.batch.submitted' },
      email_id: email.id,
      batch_id: excludedBatch.id,
      submitted_count: 0,
      submission_excluded_count: 1,
      mailgun_message_id: null,
    });
    sinon.assert.calledWithMatch(logging.info, {
      event: { name: 'email.batch.submitted' },
      email_id: email.id,
      mailgun_message_id: 'accepted',
    });
    sinon.assert.neverCalledWithMatch(logging.error, {
      event: { name: 'email.recipient_count.mismatch' },
    });
    const response = mapBatch(excludedBatch, { options: {} });
    assert.equal(response.status, 'submitted');
    assert.equal(response.mailgun_message_id, null);
    sinon.assert.calledTwice(sender.send);
  });

  for (const excludedCount of [1, 4]) {
    it(`reuses completed batches with ${excludedCount} submission exclusions`, async function () {
      stubEmailRelations();
      const batches = await service.createBatches(data);
      const recipients = await db
        .knex('email_recipients')
        .where({ email_id: email.id })
        .limit(excludedCount);
      await db
        .knex('email_recipients')
        .whereIn(
          'id',
          recipients.map((row) => row.id),
        )
        .update({ member_email: 'invalid' });
      await service.emailJob({ emailId: email.id });
      await email.refresh();
      assert.equal(email.get('status'), 'submitted');
      assert.equal(email.get('email_count'), 4 - excludedCount);

      await email.save({ status: 'failed' }, { patch: true });
      sinon.stub(models.Member, 'findPage').throws(new Error('Audience must stay frozen'));
      sender.send.resetHistory();
      await service.emailJob({ emailId: email.id });
      await email.refresh();
      assert.equal(email.get('status'), 'submitted');
      assert.equal(email.get('email_count'), 4 - excludedCount);
      assert.deepEqual(
        (await service.getBatches(email)).map((batch) => batch.id),
        batches.map((batch) => batch.id),
      );
      sinon.assert.notCalled(sender.send);
    });
  }

  it('preserves a duplicate-payload verification error through batch failure to the email banner', async function () {
    const batches = await service.createBatches(data);
    const duplicateBatch = batches.find((batch) => batch.get('recipient_count') === 2);
    await db
      .knex('email_recipients')
      .where({ batch_id: duplicateBatch.id })
      .update({ member_email: 'duplicate@example.com' });
    const client = useRealMailgunProvider();
    await runEmailJob(batches);
    await duplicateBatch.refresh();
    assert.equal(duplicateBatch.get('status'), 'failed');
    assert.equal(
      JSON.parse(duplicateBatch.get('error_data')).code,
      'BULK_EMAIL_RECIPIENT_VERIFICATION_FAILED',
    );
    sinon.assert.calledTwice(client.send);
    await email.refresh();
    assert.equal(email.get('status'), 'failed');
    sinon.assert.calledOnce(sentry.captureException);
    assert.match(
      email.get('error'),
      /An error occurred while checking your newsletter’s recipients/,
    );
    assert.ok(!email.get('error').toLowerCase().includes('retry'));
    sinon.assert.calledWithMatch(logging.error, {
      event: { name: 'email.recipient_count.mismatch' },
      email_id: email.id,
      batch_id: duplicateBatch.id,
      reason: 'batch_verification_failed',
      expected: 2,
      actual: 1,
    });
  });

  for (const countMismatch of [false, undefined]) {
    it(`does not infer a count mismatch from persisted ownership diagnostics (${countMismatch})`, async function () {
      const batches = await service.createBatches(data);
      await batches[0].save(
        {
          status: 'failed',
          error_data: JSON.stringify({
            code: 'BULK_EMAIL_RECIPIENT_VERIFICATION_FAILED',
            reason: 'cross_email_recipient',
            expected: 2,
            actual: 1,
            count_mismatch: countMismatch,
          }),
        },
        { patch: true },
      );
      sinon.stub(service, 'sendBatch').resolves(false);
      await assert.rejects(service.sendBatches({ ...data, batches }), (error) => {
        const details = verificationDetails(error);

        assert.equal(details.reason, 'batch_verification_failed');
        assert.equal(details.count_mismatch, false);
        assert.equal(details.batch_error.reason, 'cross_email_recipient');
        return true;
      });
      sinon.assert.neverCalledWithMatch(logging.error, {
        event: { name: 'email.recipient_count.mismatch' },
      });
    });
  }

  for (const shutdown of [false, true]) {
    it(`preserves a verification failure when its batch status cannot be saved (shutdown: ${shutdown})`, async function () {
      const batches = await service.createBatches(data);
      const duplicateBatch = batches.find((batch) => batch.get('recipient_count') === 2);
      await db
        .knex('email_recipients')
        .where({ batch_id: duplicateBatch.id })
        .update({ member_email: 'duplicate@example.com' });
      useRealMailgunProvider();
      // Exercise exhausted writes without retry backoff.
      sinon.stub(service, 'retryDb').callsFake(async (operation) => operation());
      const save = models.EmailBatch.prototype.save;
      sinon.stub(models.EmailBatch.prototype, 'save').callsFake(function (
        this: Batch,
        attributes,
        ...args
      ) {
        if (
          this.id === duplicateBatch.id &&
          attributes &&
          typeof attributes === 'object' &&
          'status' in attributes &&
          attributes.status === 'failed'
        ) {
          if (shutdown) {
            service.onPreStop();
          }
          throw new Error('Batch status write unavailable');
        }
        return save.call(this, attributes, ...args);
      });
      await runEmailJob(batches);
      await duplicateBatch.refresh();
      assert.equal(duplicateBatch.get('status'), 'submitting');
      assert.equal(duplicateBatch.get('error_data'), null);
      sinon.assert.calledOnce(sentry.captureException);
      const error = sentry.captureException.firstCall.args[0];
      assert.equal(error.retryable, false);
      assert.equal(verificationDetails(error).reason, 'provider_payload_count');
      await email.refresh();
      assert.equal(email.get('status'), shutdown ? 'submitting' : 'failed');
      assert.equal(email.get('error'), shutdown ? null : error.message);
      if (shutdown) {
        assert.ok(
          (await service.getBatches(email)).some((batch) => batch.get('status') === 'pending'),
        );
      }
      const alerts = logging.error
        .getCalls()
        .filter(
          ({ args }: sinon.SinonSpyCall) =>
            args[0]?.event?.name === 'email.recipient_count.mismatch',
        );
      assert.equal(alerts.length, 1);
    });
  }

  it('keeps exclusion progress without claiming a partially sent email when every provider request fails', async function () {
    const batches = await service.createBatches(data);
    const excludedBatch = batches.find((batch) => batch.get('recipient_count') === 2);
    await db
      .knex('email_recipients')
      .where({ batch_id: excludedBatch.id })
      .update({ member_email: 'invalid-email' });
    sender.send.rejects(new Error('Provider unavailable'));
    sinon.stub(service, 'retryDb').callsFake(async (operation) => operation());
    await runEmailJob(batches);
    await excludedBatch.refresh();
    assert.equal(excludedBatch.get('status'), 'submitted');
    assert.equal(excludedBatch.get('submitted_count'), 0);
    assert.equal(excludedBatch.get('submission_excluded_count'), 2);
    await email.refresh();
    assert.equal(email.get('status'), 'failed');
    assert.doesNotMatch(email.get('error'), /partially sent/);
    const result = await new SendingStatusService({ knex: db.knex }).statusFor(email.id);
    assert.equal(result?.sending.progress.completed, 2);
    assert.equal(result?.sending.progress.total, 4);
  });

  it('counts each selected candidate once across pages and warming splits', async function () {
    const batches = await service.createBatches(data);
    await email.refresh();
    assert.equal(email.get('candidate_count'), 4);
    assert.equal(email.get('preparation_excluded_count'), 0);
    assert.equal(email.get('preflight_email_count'), 10);
    assert.equal(email.get('email_count'), 4);
    assert.equal(email.get('csd_email_count'), 3);
    assert.ok(email.get('prepared_at'));
    assert.deepEqual(batches.map((b) => b.get('recipient_count')).sort(), [1, 1, 2]);
    const recipients = await db.knex('email_recipients').where({ email_id: email.id });
    assert.equal(recipients.length, 4);
    assert.equal(new Set(recipients.map((r) => r.member_id)).size, 4);
  });

  it('completes mixed preparation-era submissions without inventing historical counts', async function () {
    const batches = await service.createBatches(data);
    await batches[0].save({ status: 'submitted' }, { patch: true });
    await runEmailJob(batches);
    await email.refresh();
    assert.equal(email.get('status'), 'submitted');
    assert.equal(email.get('email_count'), 4);
    await batches[0].refresh();
    assert.equal(batches[0].get('submitted_count'), null);
    assert.equal(batches[0].get('submission_excluded_count'), null);
    sinon.assert.calledWithMatch(logging.info, {
      event: { name: 'email.submission.unverified' },
      unverified_batch_ids: [batches[0].id],
    });
    sinon.assert.neverCalledWithMatch(logging.error, {
      event: { name: 'email.recipient_count.mismatch' },
    });
    sinon.assert.calledTwice(sender.send);
  });

  it('rejects inconsistent persisted submission counts even when all batches are submitted', async function () {
    const batches = await service.createBatches(data);
    await service.sendBatches({ ...data, batches });
    await batches[0].refresh();
    await batches[0].save(
      { submitted_count: batches[0].get('recipient_count') + 1 },
      { patch: true },
    );
    await assert.rejects(
      service.sendBatches({ ...data, batches: await service.getBatches(email) }),
      {
        code: 'BULK_EMAIL_RECIPIENT_VERIFICATION_FAILED',
      },
    );
    sinon.assert.callCount(sender.send, 3);
    sinon.assert.calledWithMatch(logging.error, {
      event: { name: 'email.recipient_count.mismatch' },
      code: 'BULK_EMAIL_RECIPIENT_VERIFICATION_FAILED',
      email_id: email.id,
      batch_id: batches[0].id,
      reason: 'batch_submission_counts',
      expected: batches[0].get('recipient_count'),
      actual: batches[0].get('recipient_count') + 1,
      recipient_count: batches[0].get('recipient_count'),
      submitted_count: batches[0].get('recipient_count') + 1,
      submission_excluded_count: 0,
    });
  });

  it('reports partially missing submission metadata without a P1 count mismatch', async function () {
    const batches = await service.createBatches(data);
    await service.sendBatches({ ...data, batches });
    await batches[0].save({ submitted_count: null }, { patch: true });
    await assert.rejects(
      service.sendBatches({ ...data, batches: await service.getBatches(email) }),
      {
        code: 'BULK_EMAIL_RECIPIENT_VERIFICATION_FAILED',
      },
    );
    sinon.assert.calledWithMatch(logging.error, {
      event: { name: 'email.verification.failed' },
      reason: 'batch_submission_counts',
      actual: null,
    });
    sinon.assert.neverCalledWithMatch(logging.error, {
      event: { name: 'email.recipient_count.mismatch' },
    });
  });

  it('keeps ordinary provider failures retry-oriented', async function () {
    const batches = await service.createBatches(data);
    sender.send.rejects(new Error('Provider unavailable'));
    await runEmailJob(batches);
    await email.refresh();
    assert.equal(email.get('status'), 'failed');
    assert.match(email.get('error'), /retry/i);
    assert.doesNotMatch(
      email.get('error'),
      /An error occurred while checking your newsletter’s recipients/,
    );
  });

  it('completes a zero-candidate email with verified zero submissions', async function () {
    await email.save({ recipient_filter: "email:'nobody@example.com'" }, { patch: true });
    const batches = await service.createBatches(data);
    assert.equal(batches.length, 0);
    await runEmailJob(batches);
    await email.refresh();
    assert.equal(email.get('status'), 'submitted');
    assert.equal(email.get('candidate_count'), 0);
    assert.equal(email.get('email_count'), 0);
    sinon.assert.notCalled(sender.send);
  });

  it('does not complete preparation when persisted recipients are missing', async function () {
    const createBatch = service.createBatch.bind(service);
    let removedBatch: Batch;
    sinon.stub(service, 'createBatch').callsFake(async (...args) => {
      const batch = await createBatch(...args);
      if (!args[3]?.transacting && !removedBatch) {
        removedBatch = batch;
        await db.knex('email_recipients').where({ batch_id: batch.id }).del();
      }
      return batch;
    });
    await assert.rejects(service.createBatches(data), (error) => {
      const details = verificationDetails(error);
      assert.equal(details.code, 'BULK_EMAIL_RECIPIENT_VERIFICATION_FAILED');
      assert.equal(details.can_rebuild, true);
      return true;
    });
    sinon.assert.calledWithMatch(logging.error, {
      event: { name: 'email.recipient_count.mismatch' },
      code: 'BULK_EMAIL_RECIPIENT_VERIFICATION_FAILED',
      reason: 'batch_recipient_count',
      email_id: email.id,
      batch_id: removedBatch.id,
      expected: removedBatch.get('recipient_count'),
      actual: 0,
    });
    await email.refresh();
    assert.equal(email.get('prepared_at'), null);
  });

  for (const field of ['candidate_count', 'preparation_excluded_count']) {
    it(`identifies invalid ${field} as candidate metadata rather than a rows mismatch`, async function () {
      await service.createBatches(data);
      email.set(field, null);
      await assert.rejects(service.createBatches(data), (error) => {
        const details = verificationDetails(error);

        assert.equal(details.count_check, 'candidate_total');
        assert.equal(details[field], null);
        assert.equal(details.count_mismatch, false);
        return true;
      });
    });
  }

  it('reports unknown batch counts without triggering a count mismatch incident', async function () {
    const batches = await service.createBatches(data);
    await db.knex('email_batches').where({ id: batches[0].id }).update({ recipient_count: null });
    await assert.rejects(service.createBatches(data), {
      code: 'BULK_EMAIL_RECIPIENT_VERIFICATION_FAILED',
    });
    sinon.assert.calledWithMatch(logging.error, {
      event: { name: 'email.verification.failed' },
      reason: 'batch_recipient_count',
      expected: null,
    });
    sinon.assert.neverCalledWithMatch(logging.error, {
      event: { name: 'email.recipient_count.mismatch' },
    });
  });

  it('accounts for an invalid member and reports it while preparing the remaining recipients', async function () {
    const memberId = '000000000000000000000004';
    await corruptMember(memberId, { uuid: '' });
    const batches = await service.createBatches(data);
    await email.refresh();
    assert.equal(email.get('candidate_count'), 4);
    assert.equal(email.get('preparation_excluded_count'), 1);
    assert.equal(email.get('email_count'), 3);
    assert.equal(
      batches.reduce((sum, b) => sum + b.get('recipient_count'), 0),
      3,
    );
    sinon.assert.calledOnceWithMatch(sentry.captureException, {
      code: 'BULK_EMAIL_INVALID_RECIPIENT',
    });
    sinon.assert.neverCalledWithMatch(logging.error, {
      event: { name: 'email.recipient_count.mismatch' },
    });
  });

  it('recovers the committed batch after acknowledgement loss without duplicating recipients', async function () {
    const transactions = loseCommitAcknowledgementOnce();
    const batches = await service.createBatches(data);
    assert.equal(batches.length, 3);
    assert.equal((await db.knex('email_recipients').where({ email_id: email.id })).length, 4);
    sinon.assert.callCount(transactions, 3);
  });

  it('reuses frozen batches on retry without querying the audience again', async function () {
    const prepared = await service.createBatches(data);
    const recipients = await db
      .knex('email_recipients')
      .where({ email_id: email.id })
      .orderBy('id');
    const audience = sinon
      .stub(models.Member, 'getFilteredCollectionQuery')
      .throws(new Error('Audience must stay frozen'));
    const retried = await service.createBatches(data);
    assert.deepEqual(retried.map((b) => b.id).sort(), prepared.map((b) => b.id).sort());
    assert.deepEqual(
      await db.knex('email_recipients').where({ email_id: email.id }).orderBy('id'),
      recipients,
    );
    sinon.assert.notCalled(audience);
  });

  it('discards incomplete preparation and rebuilds the complete audience on retry', async function () {
    const createBatch = service.createBatch.bind(service);
    let writes = 0;
    const interrupted = Object.assign(new Error('Preparation interrupted'), { retryable: false });
    const writer = sinon.stub(service, 'createBatch').callsFake((...args) => {
      if (!args[3]?.transacting) {
        writes += 1;
        if (writes > 1) {
          throw interrupted;
        }
      }
      return createBatch(...args);
    });
    await assert.rejects(service.createBatches(data), /Preparation interrupted/);
    const partial = await service.getBatches(email);
    assert.equal(partial.length, 1);
    assert.equal(email.get('prepared_at'), null);
    writer.restore();

    const rebuilt = await service.createBatches(data);
    assert.equal(rebuilt.length, 3);
    assert.ok(rebuilt.every((batch) => batch.id !== partial[0].id));
    assert.equal((await db.knex('email_recipients').where({ email_id: email.id })).length, 4);
    assert.equal(email.get('candidate_count'), 4);
    assert.equal(email.get('preflight_email_count'), 10);
  });

  it('resumes cleanup after a failure between bounded recipient deletes', async function () {
    const partial = await models.EmailBatch.add({ email_id: email.id, recipient_count: 1001 });
    const member = await db.knex('members').first();
    await db.knex('email_recipients').insert(
      Array.from({ length: 1001 }, () => ({
        id: ObjectID().toHexString(),
        email_id: email.id,
        batch_id: partial.id,
        member_id: member.id,
        member_uuid: member.uuid,
        member_email: member.email,
      })),
    );
    let deletes = 0;
    const interrupt = (query: { sql: string }) => {
      if (query.sql.startsWith('delete from `email_recipients`')) {
        deletes += 1;
        if (deletes === 2) {
          throw new Error('Cleanup interrupted after first chunk');
        }
      }
    };
    db.knex.on('query', interrupt);
    try {
      const batches = await service.createBatches(data);
      assert.ok(deletes >= 3);
      assert.ok(batches.every((batch) => batch.id !== partial.id));
      assert.equal((await db.knex('email_recipients').where({ email_id: email.id })).length, 4);
    } finally {
      db.knex.removeListener('query', interrupt);
    }
  });

  it('leaves incomplete preparation untouched if any batch has entered submission', async function () {
    const member = await db.knex('members').first();
    const batch = await service.createBatch(email, null, [member], {
      useFallbackDomain: false,
      recipientCount: 1,
    });
    const recipients = await db.knex('email_recipients').where({ email_id: email.id });
    for (const status of ['submitting', 'submitted', 'failed']) {
      await batch.save({ status }, { patch: true });
      await assert.rejects(service.createBatches(data), {
        code: 'BULK_EMAIL_RECIPIENT_VERIFICATION_FAILED',
      });
      assert.deepEqual(await db.knex('email_recipients').where({ email_id: email.id }), recipients);
      assert.equal((await service.getBatches(email)).length, 1);
    }
  });

  it('rejects batches created after the persisted preparation boundary on retry', async function () {
    const batches = await service.createBatches(data);
    await email.refresh();
    await db
      .knex('email_batches')
      .where({ id: batches[0].id })
      .update({
        created_at: new Date(email.get('prepared_at').getTime() + 1000),
      });
    await assert.rejects(service.createBatches(data), {
      code: 'BULK_EMAIL_RECIPIENT_VERIFICATION_FAILED',
    });
  });

  it('does not report success when a persisted pending batch is absent from the worker list', async function () {
    const batches = await service.createBatches(data);
    const dispatched = batches.slice(0, 2);
    await db
      .knex('email_batches')
      .whereIn(
        'id',
        dispatched.map((b) => b.id),
      )
      .update({ status: 'submitted' });
    sinon.stub(service, 'sendBatch').resolves(true);
    await assert.rejects(
      service.sendBatches({ ...data, batches: dispatched }),
      /please retry sending your newsletter/,
    );
  });

  it('retains legacy submission accounting for a send that already started', async function () {
    await createLegacyBatches(['submitted', 'pending', 'pending']);
    const batches = await service.createBatches(data);
    const dispatched = batches.filter((batch) => batch.get('status') === 'submitted');
    sinon.stub(service, 'sendBatch').resolves(true);
    await service.sendBatches({ ...data, batches: dispatched });
    assert.ok(batches.every((batch) => batch.get('recipient_count') === null));
    assert.equal(email.get('candidate_count'), null);
    assert.equal(email.get('prepared_at'), null);
    assert.equal(
      (await service.getBatches(email)).filter((batch) => batch.get('status') === 'pending').length,
      2,
    );
  });

  it('propagates a final verification mismatch before the generic partial-failure error', async function () {
    const batches = await service.createBatches(data);
    sinon.stub(service, 'sendBatch').resolves(false);
    await db.knex('email_recipients').where({ batch_id: batches[0].id }).del();
    await assert.rejects(service.sendBatches({ ...data, batches }), (error) => {
      const details = verificationDetails(error);
      assert.equal(details.code, 'BULK_EMAIL_RECIPIENT_VERIFICATION_FAILED');
      assert.equal(details.can_rebuild, false);
      return true;
    });
    sinon.stub(service, 'sendEmail').callsFake(() => service.sendBatches({ ...data, batches }));
    await service.emailJob({ emailId: email.id });
    await email.refresh();
    assert.equal(email.get('status'), 'failed');
    assert.match(
      email.get('error'),
      /An error occurred while checking your newsletter’s recipients/,
    );
    assert.ok(!email.get('error').toLowerCase().includes('retry'));
  });

  it('does not mark the email complete or resend after an accepted batch fails its terminal write', async function () {
    const batches = await service.createBatches(data);
    const save = models.EmailBatch.prototype.save;
    sinon.stub(models.EmailBatch.prototype, 'save').callsFake(function (
      this: Batch,
      attributes,
      ...options
    ) {
      if (
        attributes &&
        typeof attributes === 'object' &&
        'status' in attributes &&
        attributes.status === 'submitted'
      ) {
        return Promise.reject(new Error('Terminal write unavailable'));
      }
      return save.call(this, attributes, ...options);
    });
    await assert.rejects(service.sendBatches({ ...data, batches }), {
      code: 'BULK_EMAIL_SUBMISSION_UNCERTAIN',
    });
    assert.equal(sender.send.callCount, 3);
    const persisted = await service.getBatches(email);
    assert.ok(persisted.every((batch) => batch.get('status') === 'submitting'));
    await assert.rejects(service.sendBatches({ ...data, batches: persisted }));
    assert.equal(sender.send.callCount, 3);
  });

  it('rolls back a lock-wait timeout before reading the original committed batch', async function () {
    const createBatch = service.createBatch.bind(service);
    const transaction = emailBatchTransactions.transaction.bind(models.EmailBatch);
    const transactions: { held?: Knex.Transaction; retry?: Knex.Transaction } = {};
    let timedOut = false;
    const restoredTimeouts: [unknown, unknown][] = [];
    const rollbackObservations: { completed: boolean | undefined; rows: unknown[] }[] = [];
    const transactionErrors: unknown[] = [];
    await db.knex.schema.createTable('accounting_retry_marker', (table) =>
      table.integer('id').primary(),
    );
    try {
      // The original insert remains in doubt on another connection. Its primary
      // key is locked, but a plain recovery read cannot yet see the row.
      sinon.stub(service, 'createBatch').callsFake(async (...args) => {
        if (!args[3]?.transacting && !transactions.held) {
          transactions.held = await db.knex.transaction();
          await createBatch(args[0], args[1], args[2], {
            ...args[3],
            transacting: transactions.held,
          });
          throw new Error('Original connection outcome unknown');
        }
        return createBatch(...args);
      });
      sinon.stub(emailBatchTransactions, 'transaction').callsFake(async (handler) => {
        try {
          return await transaction(async (trx) => {
            const [[{ timeout }]] = await trx.raw(
              'SELECT @@SESSION.innodb_lock_wait_timeout AS timeout',
            );
            await trx.raw('SET SESSION innodb_lock_wait_timeout = 1');
            let handlerError;
            let result;
            try {
              if (!timedOut) {
                transactions.retry = trx;
                // MySQL only rolls back the timed-out statement. This earlier
                // write must also disappear when Bookshelf rejects the handler.
                await trx('accounting_retry_marker').insert({ id: 1 });
              }
              result = await handler(trx);
            } catch (error) {
              handlerError = error;
            }
            try {
              await trx.raw('SET SESSION innodb_lock_wait_timeout = ?', [timeout]);
              const [[restored]] = await trx.raw(
                'SELECT @@SESSION.innodb_lock_wait_timeout AS timeout',
              );
              restoredTimeouts.push([restored.timeout, timeout]);
            } catch (restoreError) {
              // A lost connection can also prevent restoring the session. Keep
              // the transaction failure as the cause reported by this test.
              throw handlerError || restoreError;
            }
            if (handlerError) {
              throw handlerError;
            }
            return result;
          });
        } catch (error) {
          transactionErrors.push(error instanceof Error && 'code' in error ? error.code : error);
          timedOut = true;
          rollbackObservations.push({
            completed: transactions.retry?.isCompleted(),
            rows: await db.knex('accounting_retry_marker'),
          });
          await transactions.held?.commit();
          throw error;
        }
      });
      const findOne = models.EmailBatch.findOne.bind(models.EmailBatch);
      sinon.stub(models.EmailBatch, 'findOne').callsFake(async (...args) => {
        if (timedOut) {
          rollbackObservations.push({
            completed: transactions.retry?.isCompleted(),
            rows: await db.knex('accounting_retry_marker'),
          });
        }
        return findOne(...args);
      });
      const batches = await service.createBatches(data);
      assert.equal(timedOut, true);
      assert.deepEqual(transactionErrors, ['ER_LOCK_WAIT_TIMEOUT']);
      assert.ok(restoredTimeouts.length > 0);
      for (const [actual, expected] of restoredTimeouts) {
        assert.equal(actual, expected);
      }
      assert.ok(rollbackObservations.length >= 2);
      for (const observation of rollbackObservations) {
        assert.deepEqual(observation, { completed: true, rows: [] });
      }
      assert.equal(batches.length, 3);
      assert.equal((await db.knex('email_recipients').where({ email_id: email.id })).length, 4);
    } finally {
      if (transactions.held && !transactions.held.isCompleted()) {
        await transactions.held.rollback();
      }
      await db.knex.schema.dropTable('accounting_retry_marker');
    }
  });

  it('retries a transaction rolled back before commit with the same operation identity', async function () {
    const transaction = emailBatchTransactions.transaction.bind(models.EmailBatch);
    let rolledBack = false;
    sinon.stub(emailBatchTransactions, 'transaction').callsFake((handler) =>
      transaction(async (trx) => {
        const result = await handler(trx);
        if (!rolledBack) {
          rolledBack = true;
          throw new Error('Connection lost before commit');
        }
        return result;
      }),
    );
    const insert = sinon.spy(models.EmailBatch, 'add');
    const batches = await service.createBatches(data);
    assert.equal(batches.length, 3);
    assert.equal(insert.firstCall.args[0].id, insert.secondCall.args[0].id);
    assert.equal(email.get('candidate_count'), 4);
    assert.equal(email.get('preparation_excluded_count'), 0);
    assert.equal((await db.knex('email_recipients').where({ email_id: email.id })).length, 4);
  });

  for (const fault of ['recovery-read', 'metadata', 'identity', 'missing-recipients']) {
    it(`handles ${fault} after an uncertain commit`, async function () {
      loseCommitAcknowledgementOnce(async (batch) => {
        if (fault === 'metadata') {
          await db
            .knex('email_batches')
            .where({ id: batch.id })
            .update({ fallback_sending_domain: true });
        } else if (fault === 'identity') {
          await db
            .knex('email_recipients')
            .where({ batch_id: batch.id })
            .update({ member_uuid: crypto.randomUUID() });
        } else if (fault === 'missing-recipients') {
          await db.knex('email_recipients').where({ batch_id: batch.id }).del();
        }
      });
      if (fault === 'recovery-read') {
        const findOne = models.EmailBatch.findOne.bind(models.EmailBatch);
        const recovery = sinon.stub(models.EmailBatch, 'findOne').callsFake(findOne);
        recovery.onFirstCall().rejects(new Error('Recovery lookup unavailable'));
        const batches = await service.createBatches(data);
        assert.equal(batches.length, 3);
        sinon.assert.calledWithMatch(logging.info, {
          event: { name: 'email.batch.recovery.started' },
          err: sinon.match.has('message', 'Commit acknowledgement lost'),
        });
        assert.equal((await db.knex('email_recipients').where({ email_id: email.id })).length, 4);
      } else {
        await assert.rejects(service.createBatches(data), {
          code: 'BULK_EMAIL_RECIPIENT_VERIFICATION_FAILED',
        });
        await email.refresh();
        assert.equal(email.get('prepared_at'), null);
        assert.equal((await service.getBatches(email)).length, 1);
        if (fault === 'missing-recipients') {
          sinon.assert.calledWithMatch(logging.error, {
            event: { name: 'email.recipient_count.mismatch' },
            reason: 'batch_recovery_conflict',
          });
        } else {
          sinon.assert.calledWithMatch(logging.error, {
            event: { name: 'email.verification.failed' },
            reason: 'batch_recovery_conflict',
          });
          sinon.assert.neverCalledWithMatch(logging.error, {
            event: { name: 'email.recipient_count.mismatch' },
          });
        }
      }
    });
  }

  it('detects a duplicate batch by the independent candidate total', async function () {
    const createBatch = service.createBatch.bind(service);
    let duplicated = false;
    sinon.stub(service, 'createBatch').callsFake(async (...args) => {
      const batch = await createBatch(...args);
      if (!args[3]?.transacting && !duplicated) {
        duplicated = true;
        const copyId = ObjectID().toHexString();
        const row = await db.knex('email_batches').where({ id: batch.id }).first();
        await db.knex('email_batches').insert({ ...row, id: copyId });
        const rows = await db.knex('email_recipients').where({ batch_id: batch.id });
        await db.knex('email_recipients').insert(
          rows.map((recipient) => ({
            ...recipient,
            id: ObjectID().toHexString(),
            batch_id: copyId,
          })),
        );
      }
      return batch;
    });
    await assert.rejects(service.createBatches(data), (error) => {
      const details = verificationDetails(error);
      assert.equal(details.code, 'BULK_EMAIL_RECIPIENT_VERIFICATION_FAILED');

      assert.equal(details.reason, 'preparation_totals');
      assert.equal(details.candidate_count, 4);
      assert.equal(details.recipient_count, 6);
      assert.equal(details.actual_count, 6);
      return true;
    });
    sinon.assert.calledWithMatch(logging.error, {
      event: { name: 'email.recipient_count.mismatch' },
      code: 'BULK_EMAIL_RECIPIENT_VERIFICATION_FAILED',
      email_id: email.id,
      reason: 'preparation_totals',
      count_check: 'candidate_total',
      expected: 4,
      actual: 6,
      candidate_count: 4,
      preparation_excluded_count: 0,
      recipient_count: 6,
      actual_count: 6,
    });
    // An equal-sized omission could mask the duplicate: count equations alone
    // do not establish global recipient identity uniqueness.
  });
});
