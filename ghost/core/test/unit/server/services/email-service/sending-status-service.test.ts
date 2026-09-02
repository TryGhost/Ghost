import assert from 'node:assert/strict';
import createKnex, { type Knex } from 'knex';
import { SendingStatusService } from '../../../../../core/server/services/email-service/sending-status-service';

describe('SendingStatusService', function () {
  let knex: Knex;
  let service: SendingStatusService;
  let recipientSequence: number;

  beforeEach(async function () {
    knex = createKnex({
      client: 'better-sqlite3',
      connection: {
        filename: ':memory:',
      },
      useNullAsDefault: true,
    });
    recipientSequence = 0;

    await knex.schema.createTable('emails', (table) => {
      table.string('id').primary();
      table.string('status').notNullable();
      table.integer('email_count').notNullable();
      table.dateTime('updated_at').nullable();
    });
    await knex.schema.createTable('email_batches', (table) => {
      table.string('id').primary();
      table.string('email_id').notNullable().index();
      table.string('status').notNullable();
      table.dateTime('created_at').notNullable();
      table.dateTime('updated_at').notNullable();
    });
    await knex.schema.createTable('email_recipients', (table) => {
      table.string('id').primary();
      table.string('batch_id').notNullable().index();
    });

    service = new SendingStatusService({ db: { knex } });
  });

  afterEach(async function () {
    await knex.destroy();
  });

  async function addEmail({
    status,
    emailCount,
    updatedAt,
  }: {
    status: string;
    emailCount: number;
    updatedAt: string;
  }) {
    await knex('emails').insert({
      id: 'email-id',
      status,
      email_count: emailCount,
      updated_at: updatedAt,
    });
  }

  async function addBatch({
    id,
    status,
    createdAt,
    updatedAt,
    recipientCount = 10,
  }: {
    id: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    recipientCount?: number;
  }) {
    await knex('email_batches').insert({
      id,
      email_id: 'email-id',
      status,
      created_at: createdAt,
      updated_at: updatedAt,
    });
    await knex('email_recipients').insert(
      Array.from({ length: recipientCount }, () => {
        const recipientId = `recipient-${recipientSequence}`;
        recipientSequence += 1;
        return {
          id: recipientId,
          batch_id: id,
        };
      }),
    );
  }

  it('returns null when the email does not exist', async function () {
    assert.equal(await service.statusFor('missing-email'), null);
  });

  it('reports preparation progress and estimates from batch creation times', async function () {
    await addEmail({
      status: 'submitting',
      emailCount: 100,
      updatedAt: '2026-09-02T11:59:59Z',
    });
    await addBatch({
      id: 'batch-1',
      status: 'pending',
      createdAt: '2026-09-02T12:00:00Z',
      updatedAt: '2026-09-02T12:00:00Z',
    });
    await addBatch({
      id: 'batch-2',
      status: 'pending',
      createdAt: '2026-09-02T12:00:10Z',
      updatedAt: '2026-09-02T12:00:10Z',
    });

    assert.deepEqual(await service.statusFor('email-id'), {
      id: 'email-id',
      sending: {
        status: 'preparing',
        progress: {
          completed: 20,
          total: 100,
          estimated_seconds_remaining: 80,
        },
      },
    });
  });

  it('reports submission progress and estimates from submitted batch updates', async function () {
    await addEmail({
      status: 'submitting',
      emailCount: 30,
      updatedAt: '2026-09-02T12:01:00Z',
    });
    await addBatch({
      id: 'batch-1',
      status: 'submitted',
      createdAt: '2026-09-02T12:00:00Z',
      updatedAt: '2026-09-02T12:01:10Z',
    });
    await addBatch({
      id: 'batch-2',
      status: 'submitted',
      createdAt: '2026-09-02T12:00:10Z',
      updatedAt: '2026-09-02T12:01:20Z',
    });
    await addBatch({
      id: 'batch-3',
      status: 'pending',
      createdAt: '2026-09-02T12:00:20Z',
      updatedAt: '2026-09-02T12:00:20Z',
    });

    assert.deepEqual(await service.statusFor('email-id'), {
      id: 'email-id',
      sending: {
        status: 'submitting',
        progress: {
          completed: 20,
          total: 30,
          estimated_seconds_remaining: 10,
        },
      },
    });
  });

  it('reports the phase and frozen progress for a failed send', async function () {
    await addEmail({
      status: 'failed',
      emailCount: 20,
      updatedAt: '2026-09-02T12:01:20Z',
    });
    await addBatch({
      id: 'batch-1',
      status: 'submitted',
      createdAt: '2026-09-02T12:00:00Z',
      updatedAt: '2026-09-02T12:01:10Z',
    });
    await addBatch({
      id: 'batch-2',
      status: 'failed',
      createdAt: '2026-09-02T12:00:10Z',
      updatedAt: '2026-09-02T12:01:20Z',
    });

    assert.deepEqual(await service.statusFor('email-id'), {
      id: 'email-id',
      sending: {
        status: 'failed',
        progress: {
          completed: 10,
          total: 20,
          estimated_seconds_remaining: null,
        },
        failed_during: 'submitting',
      },
    });
  });

  it('reports a failure during preparation when no batch started submitting', async function () {
    await addEmail({
      status: 'failed',
      emailCount: 20,
      updatedAt: '2026-09-02T12:00:01Z',
    });
    await addBatch({
      id: 'batch-1',
      status: 'pending',
      createdAt: '2026-09-02T12:00:00Z',
      updatedAt: '2026-09-02T12:00:00Z',
    });

    assert.deepEqual(await service.statusFor('email-id'), {
      id: 'email-id',
      sending: {
        status: 'failed',
        progress: {
          completed: 10,
          total: 20,
          estimated_seconds_remaining: null,
        },
        failed_during: 'preparing',
      },
    });
  });

  it('reports submitted sends as complete', async function () {
    await addEmail({
      status: 'submitted',
      emailCount: 10,
      updatedAt: '2026-09-02T12:01:00Z',
    });
    await addBatch({
      id: 'batch-1',
      status: 'submitted',
      createdAt: '2026-09-02T12:00:00Z',
      updatedAt: '2026-09-02T12:01:00Z',
    });

    assert.deepEqual(await service.statusFor('email-id'), {
      id: 'email-id',
      sending: {
        status: 'submitted',
        progress: {
          completed: 10,
          total: 10,
          estimated_seconds_remaining: 0,
        },
      },
    });
  });

  it('returns no estimate until two batches complete in the current attempt', async function () {
    await addEmail({
      status: 'submitting',
      emailCount: 30,
      updatedAt: '2026-09-02T12:02:00Z',
    });
    await addBatch({
      id: 'batch-1',
      status: 'submitted',
      createdAt: '2026-09-02T12:00:00Z',
      updatedAt: '2026-09-02T12:01:00Z',
    });
    await addBatch({
      id: 'batch-2',
      status: 'submitted',
      createdAt: '2026-09-02T12:00:10Z',
      updatedAt: '2026-09-02T12:02:10Z',
    });

    const result = await service.statusFor('email-id');
    assert.equal(result?.sending.progress.estimated_seconds_remaining, null);
  });
});
