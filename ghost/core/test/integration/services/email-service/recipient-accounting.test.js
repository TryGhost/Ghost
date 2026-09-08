const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const ObjectID = require('bson-objectid').default;
const sinon = require('sinon');
const logging = require('@tryghost/logging');
const models = require('../../../../core/server/models');
const db = require('../../../../core/server/data/db');
const dbUtils = require('../../../utils/db-utils');
const BatchSendingService = require('../../../../core/server/services/email-service/batch-sending-service');

describe('Recipient accounting through MySQL and Bookshelf', function () {
  let email;
  let service;
  let data;
  let sentry;
  let sender;

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
    service = new BatchSendingService({
      db,
      models,
      sentry,
      emailRenderer: { getSegments: async () => [null] },
      emailSegmenter: { getMemberFilterForSegment: () => 'status:free' },
      domainWarmingService: { isEnabled: () => true },
      sendingService: sender,
      BEFORE_RETRY_CONFIG: { maxRetries: 2, sleep: 0 },
    });
    data = { email, post: {}, newsletter: {} };
  });

  afterEach(async function () {
    sinon.restore();
    await db.knex('email_recipients').where({ email_id: email.id }).del();
    await db.knex('email_batches').where({ email_id: email.id }).del();
    await db.knex('emails').where({ id: email.id }).del();
  });

  it('alerts on preflight drift without rejecting a valid candidate sweep', async function () {
    await service.createBatches(data);
    sinon.assert.calledWithMatch(logging.warn, {
      event: { name: 'email.preparation.audience_drift' },
      preflight_email_count: 10,
      candidate_count: 4,
    });
    sinon.assert.calledOnce(sentry.captureMessage);
  });

  it('creates no batch for an all-excluded preparation page', async function () {
    const original = models.Member.getFilteredCollectionQuery.bind(models.Member);
    sinon
      .stub(models.Member, 'getFilteredCollectionQuery')
      .callsFake((...args) => original(...args).where('id', '000000000000000000000004'));
    const memberId = '000000000000000000000004';
    const originalMember = await db.knex('members').where({ id: memberId }).first();
    await db.knex('members').where({ id: memberId }).update({ uuid: '' });
    try {
      assert.deepEqual(await service.createBatches(data), []);
      assert.equal(email.get('candidate_count'), 1);
      assert.equal(email.get('preparation_excluded_count'), 1);
      assert.equal(email.get('email_count'), 0);
      assert.ok(email.get('prepared_at'));
    } finally {
      await db.knex('members').where({ id: memberId }).update({ uuid: originalMember.uuid });
    }
  });

  it('counts exclusions once when recovering a committed preparation batch', async function () {
    const memberId = '000000000000000000000004';
    const originalMember = await db.knex('members').where({ id: memberId }).first();
    await db.knex('members').where({ id: memberId }).update({ uuid: '' });
    const transaction = models.EmailBatch.transaction.bind(models.EmailBatch);
    let lost = false;
    sinon.stub(models.EmailBatch, 'transaction').callsFake(async (handler) => {
      const result = await transaction(handler);
      if (!lost) {
        lost = true;
        throw new Error('Commit acknowledgement lost');
      }
      return result;
    });
    try {
      const batches = await service.createBatches(data);
      assert.deepEqual(
        batches
          .map((batch) => [batch.get('fallback_sending_domain'), batch.get('recipient_count')])
          .sort(),
        [
          [false, 1],
          [false, 1],
          [true, 1],
        ],
      );
      assert.equal(email.get('candidate_count'), 4);
      assert.equal(email.get('preparation_excluded_count'), 1);
      assert.equal(email.get('email_count'), 3);
      assert.equal((await db.knex('email_recipients').where({ email_id: email.id })).length, 3);
    } finally {
      await db.knex('members').where({ id: memberId }).update({ uuid: originalMember.uuid });
    }
  });

  it('uses legacy preparation retries when preflight_email_count is null', async function () {
    await email.save({ preflight_email_count: null }, { patch: true });
    const transaction = models.EmailBatch.transaction.bind(models.EmailBatch);
    let lost = false;
    sinon.stub(models.EmailBatch, 'transaction').callsFake(async (handler) => {
      const result = await transaction(handler);
      if (!lost) {
        lost = true;
        throw new Error('Commit acknowledgement lost');
      }
      return result;
    });
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
    const otherEmail = await models.Email.add({
      post_id: ObjectID().toHexString(),
      submitted_at: new Date(),
      email_count: 1,
    });
    await db.knex('email_recipients').insert({ ...row, id: extraId, email_id: otherEmail.id });
    try {
      await assert.rejects(service.createBatches(data), (error) => {
        assert.equal(JSON.parse(error.errorDetails).reason, 'cross_email_recipient');
        return true;
      });
    } finally {
      await db.knex('email_recipients').where({ id: extraId }).del();
      await db.knex('emails').where({ id: otherEmail.id }).del();
    }
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
      assert.equal(JSON.parse(error.errorDetails).reason, 'batch_after_preparation');
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
    const batch = await service.createBatch(email, null, [member], { useFallbackDomain: false });
    const otherEmail = await models.Email.add({
      post_id: ObjectID().toHexString(),
      submitted_at: new Date(),
      email_count: 1,
    });
    const row = await db.knex('email_recipients').where({ batch_id: batch.id }).first();
    const extraId = ObjectID().toHexString();
    await db.knex('email_recipients').insert({ ...row, id: extraId, email_id: otherEmail.id });
    try {
      await assert.rejects(service.createBatches(data), (error) => {
        assert.equal(error.code, 'BULK_EMAIL_RECIPIENT_VERIFICATION_FAILED');
        assert.equal(JSON.parse(error.errorDetails).reason, 'cross_email_recipient');
        assert.equal(JSON.parse(error.errorDetails).batch_id, batch.id);
        assert.ok(!error.message.includes('Retry sending'));
        return true;
      });
      assert.equal((await db.knex('email_recipients').where({ batch_id: batch.id })).length, 2);
      assert.equal((await service.getBatches(email)).length, 1);
    } finally {
      await db.knex('email_recipients').where({ id: extraId }).del();
      await db.knex('emails').where({ id: otherEmail.id }).del();
    }
  });

  for (const hasOwnBatch of [false, true]) {
    it(`preserves recipients owned by this email in another email's batch (hasOwnBatch=${hasOwnBatch})`, async function () {
      const member = await db.knex('members').first();
      if (hasOwnBatch) {
        await service.createBatch(email, null, [member], { useFallbackDomain: false });
      }
      const otherEmail = await models.Email.add({
        post_id: ObjectID().toHexString(),
        submitted_at: new Date(),
        email_count: 1,
      });
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
      try {
        await assert.rejects(service.createBatches(data), (error) => {
          assert.equal(error.code, 'BULK_EMAIL_RECIPIENT_VERIFICATION_FAILED');
          assert.equal(JSON.parse(error.errorDetails).reason, 'cross_email_recipient');
          assert.equal(JSON.parse(error.errorDetails).batch_id, otherBatch.id);
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
      } finally {
        await db.knex('email_recipients').whereIn('email_id', emailIds).del();
        await db.knex('email_batches').where({ email_id: otherEmail.id }).del();
        await db.knex('emails').where({ id: otherEmail.id }).del();
      }
    });
  }

  for (const balancedSwap of [false, true]) {
    it(`rejects foreign recipient ownership in frozen batches (balancedSwap=${balancedSwap})`, async function () {
      const batches = await service.createBatches(data);
      const ownRow = await db.knex('email_recipients').where({ batch_id: batches[0].id }).first();
      const member = await db.knex('members').first();
      const otherEmail = await models.Email.add({
        post_id: ObjectID().toHexString(),
        submitted_at: new Date(),
        email_count: 1,
      });
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
      try {
        await assert.rejects(service.createBatches(data), (error) => {
          assert.equal(error.code, 'BULK_EMAIL_RECIPIENT_VERIFICATION_FAILED');
          assert.equal(JSON.parse(error.errorDetails).reason, 'cross_email_recipient');
          return true;
        });
        sinon.assert.notCalled(sender.send);
      } finally {
        await db.knex('email_recipients').whereIn('email_id', [email.id, otherEmail.id]).del();
        await db.knex('email_batches').where({ email_id: otherEmail.id }).del();
        await db.knex('emails').where({ id: otherEmail.id }).del();
      }
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
    let removed = false;
    sinon.stub(service, 'createBatch').callsFake(async (...args) => {
      const batch = await createBatch(...args);
      if (!args[3]?.transacting && !removed) {
        removed = true;
        await db.knex('email_recipients').where({ batch_id: batch.id }).del();
      }
      return batch;
    });
    await assert.rejects(service.createBatches(data), (error) => {
      assert.equal(error.code, 'BULK_EMAIL_RECIPIENT_VERIFICATION_FAILED');
      assert.match(error.message, /Retry sending to rebuild/);
      return true;
    });
    sinon.assert.calledWithMatch(logging.error, {
      event: { name: 'email.verification.failed' },
      reason: 'batch_recipient_count',
      email_id: email.id,
    });
    await email.refresh();
    assert.equal(email.get('prepared_at'), null);
  });

  it('accounts for an invalid member and reports it while preparing the remaining recipients', async function () {
    const memberId = '000000000000000000000004';
    const originalMember = await db.knex('members').where({ id: memberId }).first();
    await db.knex('members').where({ id: memberId }).update({ uuid: '' });
    try {
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
    } finally {
      await db.knex('members').where({ id: memberId }).update({ uuid: originalMember.uuid });
    }
  });

  it('recovers the committed batch after acknowledgement loss without duplicating recipients', async function () {
    const transaction = models.EmailBatch.transaction.bind(models.EmailBatch);
    let lostAcknowledgement = false;
    const transactions = sinon.stub(models.EmailBatch, 'transaction').callsFake(async (handler) => {
      const result = await transaction(handler);
      if (!lostAcknowledgement) {
        lostAcknowledgement = true;
        throw new Error('Commit acknowledgement lost');
      }
      return result;
    });
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

    const rebuilt = await service.createBatches({ ...data, existingBatches: partial });
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
    const interrupt = (query) => {
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
    const batch = await service.createBatch(email, null, [member], { useFallbackDomain: false });
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
      assert.equal(error.code, 'BULK_EMAIL_RECIPIENT_VERIFICATION_FAILED');
      assert.ok(!error.message.toLowerCase().includes('retry'));
      return true;
    });
    sinon.stub(service, 'sendEmail').callsFake(() => service.sendBatches({ ...data, batches }));
    await service.emailJob({ emailId: email.id });
    await email.refresh();
    assert.equal(email.get('status'), 'failed');
    assert.match(email.get('error'), /recipient verification failed/);
    assert.ok(!email.get('error').toLowerCase().includes('retry'));
  });

  it('does not mark the email complete or resend after an accepted batch fails its terminal write', async function () {
    const batches = await service.createBatches(data);
    const save = models.EmailBatch.prototype.save;
    sinon.stub(models.EmailBatch.prototype, 'save').callsFake(function (attributes, ...options) {
      if (attributes?.status === 'submitted') {
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
    const transaction = models.EmailBatch.transaction.bind(models.EmailBatch);
    let held;
    let retryTransaction;
    let timedOut = false;
    await db.knex.schema.createTable('accounting_retry_marker', (table) =>
      table.integer('id').primary(),
    );
    try {
      // The original insert remains in doubt on another connection. Its primary
      // key is locked, but a plain recovery read cannot yet see the row.
      sinon.stub(service, 'createBatch').callsFake(async (...args) => {
        if (!args[3]?.transacting && !held) {
          held = await db.knex.transaction();
          await createBatch(...args.slice(0, 3), { ...args[3], transacting: held });
          throw new Error('Original connection outcome unknown');
        }
        return createBatch(...args);
      });
      sinon.stub(models.EmailBatch, 'transaction').callsFake(async (handler) => {
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
                retryTransaction = trx;
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
              assert.equal(restored.timeout, timeout);
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
          assert.equal(error.code, 'ER_LOCK_WAIT_TIMEOUT');
          timedOut = true;
          assert.equal(retryTransaction.isCompleted(), true);
          assert.deepEqual(await db.knex('accounting_retry_marker'), []);
          await held.commit();
          throw error;
        }
      });
      const findOne = models.EmailBatch.findOne.bind(models.EmailBatch);
      sinon.stub(models.EmailBatch, 'findOne').callsFake(async (...args) => {
        if (timedOut) {
          assert.equal(retryTransaction.isCompleted(), true);
          assert.deepEqual(await db.knex('accounting_retry_marker'), []);
        }
        return findOne(...args);
      });
      const batches = await service.createBatches(data);
      assert.equal(timedOut, true);
      assert.equal(batches.length, 3);
      assert.equal((await db.knex('email_recipients').where({ email_id: email.id })).length, 4);
    } finally {
      if (held && !held.isCompleted()) {
        await held.rollback();
      }
      await db.knex.schema.dropTable('accounting_retry_marker');
    }
  });

  it('retries a transaction rolled back before commit with the same operation identity', async function () {
    const transaction = models.EmailBatch.transaction.bind(models.EmailBatch);
    let rolledBack = false;
    sinon.stub(models.EmailBatch, 'transaction').callsFake((handler) =>
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
      const transaction = models.EmailBatch.transaction.bind(models.EmailBatch);
      let interrupted = false;
      sinon.stub(models.EmailBatch, 'transaction').callsFake(async (handler) => {
        const batch = await transaction(handler);
        if (!interrupted) {
          interrupted = true;
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
          throw new Error('Commit acknowledgement lost');
        }
        return batch;
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
      assert.equal(error.code, 'BULK_EMAIL_RECIPIENT_VERIFICATION_FAILED');
      const details = JSON.parse(error.errorDetails);
      assert.equal(details.reason, 'preparation_totals');
      assert.equal(details.candidate_count, 4);
      assert.equal(details.recipient_count, 6);
      assert.equal(details.actual_count, 6);
      return true;
    });
    // An equal-sized omission could mask the duplicate: count equations alone
    // do not establish global recipient identity uniqueness.
  });
});
