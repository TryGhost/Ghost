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
            for (const key of ['recipient_count', 'accounted_recipient_count']) {
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
      table.integer('preflight_email_count').nullable();
      table.dateTime('updated_at').nullable();
    });
    await knex.schema.createTable('email_batches', (table) => {
      table.string('id').primary();
      table.string('email_id').notNullable();
      table.string('status').notNullable();
      table.dateTime('created_at').notNullable();
      table.dateTime('updated_at').notNullable();
      table.integer('recipient_count').nullable();
      table.integer('submitted_count').nullable();
      table.integer('submission_excluded_count').nullable();
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

  it('reads accounted progress and historical submission fallbacks without scanning recipients', async function () {
    await addEmail({ status: 'submitting', emailCount: 35, updatedAt: '2026-09-02 12:01:00' });
    await knex('emails').update({ preflight_email_count: 40 });
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
    // Three distinct completions provide the two measured intervals required for an ETA.
    await addBatch({
      status: 'submitted',
      createdAt: '2026-09-02 12:00:20',
      updatedAt: '2026-09-02 12:01:30',
    });
    await addBatch({ status: 'pending', createdAt: '2026-09-02 12:00:30', recipientCount: 5 });
    await knex('email_batches')
      .whereIn('id', ['batch-1', 'batch-2', 'batch-3'])
      .update({ recipient_count: 10 });
    await knex('email_batches')
      .where('id', 'batch-1')
      .update({ submitted_count: 7, submission_excluded_count: 3 });
    await knex('email_batches').where('id', 'batch-4').update({ recipient_count: 5 });
    aggregateCountsAsStrings = true;
    const queries: string[] = [];
    knex.on('query', ({ sql }: { sql: string }) => queries.push(sql));
    assert.deepEqual((await service.statusFor('email-id'))?.sending, {
      status: 'submitting',
      progress: { completed: 30, total: 35, estimatedSecondsRemaining: 5 },
    });
    assert.ok(queries.every((sql) => !sql.includes('email_recipients')));
    assert.equal(
      (await knex('email_batches').where('id', 'batch-2').first()).submitted_count,
      null,
    );
  });

  it('derives the sending status of an unsubmitted email from its batches and their recipient counts', async function () {
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
    await addBatch({ status: 'pending', createdAt: '2026-09-02 12:00:20', recipientCount: 5 });

    assert.deepEqual(await service.statusFor('email-id'), {
      id: 'email-id',
      sending: {
        status: 'submitting',
        progress: { completed: 20, total: 25, estimatedSecondsRemaining: null },
      },
    });
  });

  it('derives a submitted send from the stored email count without reading its batches', async function () {
    await addEmail({ status: 'submitted', emailCount: 10 });

    assert.deepEqual(await service.statusFor('email-id'), {
      id: 'email-id',
      sending: {
        status: 'submitted',
        progress: { completed: 10, total: 10, estimatedSecondsRemaining: 0 },
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
        progress: { completed: 10, total: 10, estimatedSecondsRemaining: 0 },
      },
    });
  });
});
