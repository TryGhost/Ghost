const assert = require('node:assert/strict');
const sinon = require('sinon');
const knex = require('knex');
const logging = require('@tryghost/logging');
const { createModel } = require('./utils');
const BatchSendingService = require('../../../../../core/server/services/email-service/batch-sending-service');

// Exercise the production retry/recovery code. SQLite supplies real primary-key
// and rollback behavior here; the integration suite covers Bookshelf and MySQL.
describe('Recipient preparation retry recovery', function () {
  let sql;
  let models;
  let service;
  let email;
  let members;

  beforeEach(async function () {
    sinon.stub(logging, 'info');
    sinon.stub(logging, 'error');
    sql = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await sql.schema.createTable('email_batches', (table) => {
      table.string('id').primary();
      table.string('email_id');
      table.string('member_segment');
      table.boolean('fallback_sending_domain');
      table.string('status');
      table.integer('recipient_count');
      table.dateTime('created_at');
    });
    await sql.schema.createTable('email_recipients', (table) => {
      table.string('id').primary();
      table.string('email_id');
      table.string('batch_id').references('email_batches.id');
      table.string('member_id');
      table.string('member_uuid');
      table.string('member_email');
      table.string('member_name');
    });
    members = [
      { id: 'member-a', uuid: 'uuid-a', email: 'a@example.com', name: 'A' },
      { id: 'member-b', uuid: 'uuid-b', email: 'b@example.com', name: 'B' },
    ];
    models = {
      EmailBatch: {
        transaction: (handler) => sql.transaction(handler),
        async add(attributes, options) {
          const model = createModel(attributes);
          await sql('email_batches')
            .insert({ ...attributes, id: model.id, created_at: new Date().toISOString() })
            .transacting(options.transacting);
          return model;
        },
        async findOne({ id }) {
          const row = await sql('email_batches').where({ id }).first();
          return row ? createModel(row) : null;
        },
        async findAll() {
          return { models: (await sql('email_batches')).map(createModel) };
        },
      },
      Member: {
        getFilteredCollectionQuery() {
          return {
            orderByRaw() {
              return this;
            },
            select() {
              return this;
            },
            limit: async () => members,
          };
        },
      },
    };
    email = createModel({ preflight_email_count: 2, email_count: 2, recipient_filter: 'all' });
    service = new BatchSendingService({
      db: { knex: sql },
      models,
      emailRenderer: { getSegments: async () => [null] },
      emailSegmenter: { getMemberFilterForSegment: () => 'all' },
      domainWarmingService: { isEnabled: () => false },
      sendingService: { getMaximumRecipients: () => 100 },
      BEFORE_RETRY_CONFIG: { maxRetries: 2, sleep: 0 },
    });
  });

  afterEach(async function () {
    sinon.restore();
    await sql.destroy();
  });

  function loseAcknowledgement(afterCommit = async () => {}) {
    const transaction = models.EmailBatch.transaction;
    let lost = false;
    return sinon.stub(models.EmailBatch, 'transaction').callsFake(async (handler) => {
      const result = await transaction(handler);
      if (!lost) {
        lost = true;
        await afterCommit();
        throw new Error('Lost commit acknowledgement');
      }
      return result;
    });
  }

  const prepare = () => service.createBatches({ email, post: {}, newsletter: {} });
  async function assertRows(batches, recipients) {
    assert.equal((await sql('email_batches')).length, batches);
    assert.equal((await sql('email_recipients')).length, recipients);
  }

  it('leaves legacy acknowledgement-loss behavior unchanged', async function () {
    await email.save({ preflight_email_count: null });
    loseAcknowledgement();
    await prepare();
    await assertRows(2, 4);
  });

  it('recovers a committed batch instead of inserting a duplicate', async function () {
    const transactions = loseAcknowledgement();
    await prepare();
    await assertRows(1, 2);
    sinon.assert.calledOnce(transactions);
  });

  it('retries a rolled-back transaction under the same batch ID', async function () {
    const transaction = models.EmailBatch.transaction;
    let failed = false;
    sinon.stub(models.EmailBatch, 'transaction').callsFake((handler) =>
      transaction(async (trx) => {
        const batch = await handler(trx);
        if (!failed) {
          failed = true;
          throw new Error('Connection lost before commit');
        }
        return batch;
      }),
    );
    const insert = sinon.spy(models.EmailBatch, 'add');
    await prepare();
    await assertRows(1, 2);
    assert.equal(insert.firstCall.args[0].id, insert.secondCall.args[0].id);
  });

  it('rejects a recovered batch with missing recipients', async function () {
    const transactions = loseAcknowledgement(() => sql('email_recipients').del());
    await assert.rejects(prepare(), { code: 'BULK_EMAIL_RECIPIENT_VERIFICATION_FAILED' });
    await assertRows(1, 0);
    sinon.assert.calledOnce(transactions);
  });

  it('uses the primary key to prevent replay when the recovery read fails', async function () {
    loseAcknowledgement();
    const findOne = models.EmailBatch.findOne;
    const read = sinon.stub(models.EmailBatch, 'findOne');
    read.onFirstCall().rejects(new Error('Recovery read unavailable'));
    read.callsFake(findOne);
    await prepare();
    await assertRows(1, 2);
    sinon.assert.calledTwice(read);
  });

  it('rejects matching counts with different recipient identities', async function () {
    loseAcknowledgement(() =>
      sql('email_recipients')
        .where({ member_id: 'member-a' })
        .update({ member_id: 'wrong-member' }),
    );
    await assert.rejects(prepare(), { code: 'BULK_EMAIL_RECIPIENT_VERIFICATION_FAILED' });
    await assertRows(1, 2);
  });

  it('creates exactly one batch without a database fault', async function () {
    await prepare();
    await assertRows(1, 2);
    assert.equal(email.get('candidate_count'), 2);
    assert.equal(email.get('preparation_excluded_count'), 0);
  });

  it('creates no batch for an all-excluded preparation unit', async function () {
    members = members.map((member) => ({ ...member, uuid: '' }));
    await prepare();
    await assertRows(0, 0);
    assert.equal(email.get('candidate_count'), 2);
    assert.equal(email.get('preparation_excluded_count'), 2);
    assert.equal(email.get('email_count'), 0);
    assert.ok(email.get('prepared_at'));
  });

  it('counts an exclusion once across transaction recovery', async function () {
    members[0].uuid = '';
    loseAcknowledgement();
    await prepare();
    await assertRows(1, 1);
    assert.equal(email.get('candidate_count'), 2);
    assert.equal(email.get('preparation_excluded_count'), 1);
    assert.equal(email.get('email_count'), 1);
  });

  it('checks every row in a batch even when a row names another email', async function () {
    const createBatch = service.createBatch.bind(service);
    sinon.stub(service, 'createBatch').callsFake(async (...args) => {
      const batch = await createBatch(...args);
      if (!args[3]?.transacting) {
        const row = await sql('email_recipients').first();
        await sql('email_recipients').insert({
          ...row,
          id: 'extra-row',
          email_id: 'another-email',
        });
      }
      return batch;
    });
    await assert.rejects(prepare(), { code: 'BULK_EMAIL_RECIPIENT_VERIFICATION_FAILED' });
    await assertRows(1, 3);
  });
});
