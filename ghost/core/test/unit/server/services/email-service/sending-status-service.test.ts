import assert from 'node:assert/strict';
import createKnex, { type Knex } from 'knex';
import { SendingStatusService } from '../../../../../core/server/services/email-service/sending-status-service';

describe('SendingStatusService', function () {
  let knex: Knex;
  let service: SendingStatusService;
  let batchCount: number;
  let aggregateCountsAsStrings: boolean;

  beforeEach(async function () {
    aggregateCountsAsStrings = false;
    knex = createKnex({
      client: 'better-sqlite3',
      connection: {
        filename: ':memory:',
      },
      useNullAsDefault: true,
      postProcessResponse(result) {
        if (!aggregateCountsAsStrings || !Array.isArray(result)) {
          return result;
        }

        return result.map((row) => {
          if (row && typeof row === 'object') {
            for (const key of ['count', 'recipient_count']) {
              const value = Reflect.get(row, key);
              if (typeof value === 'number') {
                Reflect.set(row, key, String(value));
              }
            }
          }
          return row;
        });
      },
    });

    await knex.schema.createTable('emails', (table) => {
      table.string('id').primary();
      table.string('status').notNullable();
      table.integer('email_count').notNullable();
      table.dateTime('updated_at').nullable();
    });
    await knex.schema.createTable('email_batches', (table) => {
      table.string('id').primary();
      table.string('email_id').notNullable();
      table.string('status').notNullable();
      table.dateTime('created_at').notNullable();
      table.dateTime('updated_at').notNullable();
    });
    await knex.schema.createTable('email_recipients', (table) => {
      table.string('id').primary();
      table.string('email_id').notNullable();
      table.string('batch_id').notNullable();
    });

    service = new SendingStatusService({ knex });
    batchCount = 0;
  });

  afterEach(async function () {
    await knex.destroy();
  });

  async function addEmail({
    status,
    emailCount,
    updatedAt = '2026-09-02 11:59:59',
  }: {
    status: string;
    emailCount: number;
    updatedAt?: string;
  }) {
    await knex('emails').insert({
      id: 'email-id',
      status,
      email_count: emailCount,
      updated_at: updatedAt,
    });
  }

  async function addBatch({
    status,
    createdAt,
    updatedAt = createdAt,
    recipientCount = 10,
  }: {
    status: string;
    createdAt: string;
    updatedAt?: string;
    recipientCount?: number;
  }) {
    batchCount += 1;
    const id = `batch-${batchCount}`;
    await knex('email_batches').insert({
      id,
      email_id: 'email-id',
      status,
      created_at: createdAt,
      updated_at: updatedAt,
    });
    if (recipientCount === 0) {
      return;
    }
    await knex('email_recipients').insert(
      Array.from({ length: recipientCount }, (_, index) => ({
        id: `${id}-recipient-${index}`,
        email_id: 'email-id',
        batch_id: id,
      })),
    );
  }

  it('returns null when the email does not exist', async function () {
    assert.equal(await service.statusFor('missing-email'), null);
  });

  it('reports a pending email as preparing', async function () {
    await addEmail({ status: 'pending', emailCount: 100 });

    assert.deepEqual(await service.statusFor('email-id'), {
      id: 'email-id',
      sending: {
        status: 'preparing',
        progress: { completed: 0, total: 100, estimated_seconds_remaining: null },
      },
    });
  });

  it('reports preparation progress and estimates from batch creation times', async function () {
    await addEmail({ status: 'submitting', emailCount: 100 });
    await addBatch({ status: 'pending', createdAt: '2026-09-02 12:00:00' });
    await addBatch({ status: 'pending', createdAt: '2026-09-02 12:00:10' });

    assert.deepEqual(await service.statusFor('email-id'), {
      id: 'email-id',
      sending: {
        status: 'preparing',
        progress: { completed: 20, total: 100, estimated_seconds_remaining: 80 },
      },
    });
  });

  it('grows the total when more recipients are prepared than estimated', async function () {
    await addEmail({ status: 'submitting', emailCount: 15 });
    await addBatch({ status: 'pending', createdAt: '2026-09-02 12:00:00' });
    await addBatch({ status: 'pending', createdAt: '2026-09-02 12:00:10' });

    const result = await service.statusFor('email-id');
    assert.deepEqual(result?.sending.progress, {
      completed: 20,
      total: 20,
      estimated_seconds_remaining: 0,
    });
  });

  it('excludes batches created before the current attempt from the preparing estimate', async function () {
    await addEmail({ status: 'submitting', emailCount: 30, updatedAt: '2026-09-02 12:00:11' });
    await addBatch({ status: 'pending', createdAt: '2026-09-02 12:00:00' });
    await addBatch({ status: 'pending', createdAt: '2026-09-02 12:00:10' });

    const result = await service.statusFor('email-id');
    assert.deepEqual(result?.sending.progress, {
      completed: 20,
      total: 30,
      estimated_seconds_remaining: null,
    });
  });

  it('reports submission progress and estimates from submitted batch updates', async function () {
    await addEmail({ status: 'submitting', emailCount: 50, updatedAt: '2026-09-02 12:01:00' });
    await addBatch({
      status: 'submitted',
      createdAt: '2026-09-02 12:00:00',
      updatedAt: '2026-09-02 12:01:10',
    });
    await addBatch({
      status: 'submitted',
      createdAt: '2026-09-02 12:00:10',
      updatedAt: '2026-09-02 12:01:20',
    });
    await addBatch({ status: 'pending', createdAt: '2026-09-02 12:00:20' });

    assert.deepEqual(await service.statusFor('email-id'), {
      id: 'email-id',
      sending: {
        status: 'submitting',
        progress: { completed: 20, total: 30, estimated_seconds_remaining: 10 },
      },
    });
  });

  it('excludes batches that failed during the current attempt from the remaining work', async function () {
    await addEmail({ status: 'submitting', emailCount: 40, updatedAt: '2026-09-02 12:00:30' });
    await addBatch({
      status: 'submitted',
      createdAt: '2026-09-02 12:00:00',
      updatedAt: '2026-09-02 12:01:00',
    });
    await addBatch({
      status: 'submitted',
      createdAt: '2026-09-02 12:00:10',
      updatedAt: '2026-09-02 12:01:10',
    });
    await addBatch({
      status: 'failed',
      createdAt: '2026-09-02 12:00:20',
      updatedAt: '2026-09-02 12:01:15',
    });
    await addBatch({ status: 'pending', createdAt: '2026-09-02 12:00:30' });

    const result = await service.statusFor('email-id');
    assert.deepEqual(result?.sending.progress, {
      completed: 20,
      total: 40,
      estimated_seconds_remaining: 10,
    });
  });

  it('reports no remaining time once only batches that failed during the attempt are left', async function () {
    await addEmail({ status: 'submitting', emailCount: 30, updatedAt: '2026-09-02 12:00:30' });
    await addBatch({
      status: 'submitted',
      createdAt: '2026-09-02 12:00:00',
      updatedAt: '2026-09-02 12:01:00',
    });
    await addBatch({
      status: 'submitted',
      createdAt: '2026-09-02 12:00:10',
      updatedAt: '2026-09-02 12:01:10',
    });
    await addBatch({
      status: 'failed',
      createdAt: '2026-09-02 12:00:20',
      updatedAt: '2026-09-02 12:01:15',
    });

    const result = await service.statusFor('email-id');
    assert.deepEqual(result?.sending.progress, {
      completed: 20,
      total: 30,
      estimated_seconds_remaining: 0,
    });
  });

  it('reports the phase and frozen progress for a failed send', async function () {
    await addEmail({ status: 'failed', emailCount: 20, updatedAt: '2026-09-02 12:01:20' });
    await addBatch({
      status: 'submitted',
      createdAt: '2026-09-02 12:00:00',
      updatedAt: '2026-09-02 12:01:10',
    });
    await addBatch({
      status: 'failed',
      createdAt: '2026-09-02 12:00:10',
      updatedAt: '2026-09-02 12:01:20',
    });

    assert.deepEqual(await service.statusFor('email-id'), {
      id: 'email-id',
      sending: {
        status: 'failed',
        progress: { completed: 10, total: 20, estimated_seconds_remaining: null },
        failed_during: 'submitting',
      },
    });
  });

  it('reports a failure during preparation when no batch started submitting', async function () {
    await addEmail({ status: 'failed', emailCount: 20, updatedAt: '2026-09-02 12:00:01' });
    await addBatch({ status: 'pending', createdAt: '2026-09-02 12:00:00' });

    assert.deepEqual(await service.statusFor('email-id'), {
      id: 'email-id',
      sending: {
        status: 'failed',
        progress: { completed: 10, total: 20, estimated_seconds_remaining: null },
        failed_during: 'preparing',
      },
    });
  });

  it('keeps the frozen submission progress of a retried email while it waits for its job', async function () {
    await addEmail({ status: 'pending', emailCount: 20, updatedAt: '2026-09-02 12:05:00' });
    await addBatch({
      status: 'submitted',
      createdAt: '2026-09-02 12:00:00',
      updatedAt: '2026-09-02 12:01:10',
    });
    await addBatch({
      status: 'failed',
      createdAt: '2026-09-02 12:00:10',
      updatedAt: '2026-09-02 12:01:20',
    });

    assert.deepEqual(await service.statusFor('email-id'), {
      id: 'email-id',
      sending: {
        status: 'submitting',
        progress: { completed: 10, total: 20, estimated_seconds_remaining: null },
      },
    });
  });

  it('reports submitted sends as complete from their recipient count', async function () {
    await addEmail({ status: 'submitted', emailCount: 0, updatedAt: '2026-09-02 12:01:00' });
    await addBatch({
      status: 'submitted',
      createdAt: '2026-09-02 12:00:00',
      updatedAt: '2026-09-02 12:01:00',
    });

    assert.deepEqual(await service.statusFor('email-id'), {
      id: 'email-id',
      sending: {
        status: 'submitted',
        progress: { completed: 10, total: 10, estimated_seconds_remaining: 0 },
      },
    });
  });

  it('accepts aggregate counts returned as decimal strings', async function () {
    await addEmail({ status: 'submitting', emailCount: 10 });
    await addBatch({ status: 'pending', createdAt: '2026-09-02 12:00:00' });
    aggregateCountsAsStrings = true;

    assert.deepEqual(await service.statusFor('email-id'), {
      id: 'email-id',
      sending: {
        status: 'preparing',
        progress: { completed: 10, total: 10, estimated_seconds_remaining: 0 },
      },
    });

    await knex('emails').where('id', 'email-id').update({ status: 'submitted' });
    assert.deepEqual(await service.statusFor('email-id'), {
      id: 'email-id',
      sending: {
        status: 'submitted',
        progress: { completed: 10, total: 10, estimated_seconds_remaining: 0 },
      },
    });
  });

  it('excludes batches submitted before the current attempt from the submitting estimate', async function () {
    await addEmail({ status: 'submitting', emailCount: 30, updatedAt: '2026-09-02 12:02:00' });
    await addBatch({
      status: 'submitted',
      createdAt: '2026-09-02 12:00:00',
      updatedAt: '2026-09-02 12:01:00',
    });
    await addBatch({
      status: 'submitted',
      createdAt: '2026-09-02 12:00:10',
      updatedAt: '2026-09-02 12:02:10',
    });
    await addBatch({ status: 'pending', createdAt: '2026-09-02 12:00:20' });

    const result = await service.statusFor('email-id');
    assert.equal(result?.sending.progress.estimated_seconds_remaining, null);
  });

  it('ignores batches without recipients when estimating', async function () {
    await addEmail({ status: 'submitting', emailCount: 30 });
    await addBatch({ status: 'pending', createdAt: '2026-09-02 12:00:00', recipientCount: 0 });
    await addBatch({ status: 'pending', createdAt: '2026-09-02 12:00:10' });

    const result = await service.statusFor('email-id');
    assert.deepEqual(result?.sending.progress, {
      completed: 10,
      total: 30,
      estimated_seconds_remaining: null,
    });
  });
});
