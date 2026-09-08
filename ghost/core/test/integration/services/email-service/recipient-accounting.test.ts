import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import ObjectID from 'bson-objectid';
import sinon from 'sinon';
import type { Knex } from 'knex';
const logging = require('@tryghost/logging');
const models = require('../../../../core/server/models');
const db: { knex: Knex } = require('../../../../core/server/data/db');
const dbUtils = require('../../../utils/db-utils');
const BatchSendingService = require('../../../../core/server/services/email-service/batch-sending-service');

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
    segmenter = { getMemberFilterForSegment: sinon.stub().returns('status:free') };
    service = new BatchSendingService({
      db,
      models,
      sentry,
      emailRenderer: renderer,
      emailSegmenter: segmenter,
      domainWarmingService: { isEnabled: () => true },
      sendingService: sender,
      BEFORE_RETRY_CONFIG: { maxRetries: 2, sleep: 0 },
    });
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
  });

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
        [true, 2],
      ],
    ],
  ] as const) {
    it(`counts exclusions once across warming slices and commit recovery (${warmupLimit}, ${memberId})`, async function () {
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

  it('uses legacy preparation retries when preflight_email_count is null', async function () {
    await email.save({ preflight_email_count: null }, { patch: true });
    loseCommitAcknowledgementOnce();
    await service.createBatches(data);
    const batches = await service.getBatches(email);
    assert.equal(batches.length, 4);
    assert.equal((await db.knex('email_recipients').where({ email_id: email.id })).length, 6);
    assert.ok(batches.every((batch) => batch.get('recipient_count') === null));
    await email.refresh();
    for (const field of [
      'preflight_email_count',
      'candidate_count',
      'preparation_excluded_count',
      'prepared_at',
    ]) {
      assert.equal(email.get(field), null, `Legacy preparation should leave ${field} unknown`);
    }
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

  it('counts each consumed candidate once across lookahead pages and warming splits', async function () {
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
    const query = models.Member.getFilteredCollectionQuery.bind(models.Member);
    const audience = sinon.stub(models.Member, 'getFilteredCollectionQuery');
    audience.onFirstCall().callsFake(query);
    audience.onSecondCall().throws(new Error('Preparation interrupted'));
    await assert.rejects(service.createBatches(data), /Preparation interrupted/);
    const partial = await service.getBatches(email);
    assert.equal(partial.length, 1);
    assert.equal(email.get('prepared_at'), null);
    audience.restore();

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
      /only partially sent/,
    );
  });

  it('preserves the legacy outcome for the same omitted-batch scenario', async function () {
    await email.save({ preflight_email_count: null }, { patch: true });
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
    await service.sendBatches({ ...data, batches: dispatched });
    assert.ok(batches.every((batch) => batch.get('recipient_count') === null));
    assert.equal(email.get('candidate_count'), null);
    assert.equal(email.get('prepared_at'), null);
    assert.equal(
      (await service.getBatches(email)).filter((batch) => batch.get('status') === 'pending').length,
      1,
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
