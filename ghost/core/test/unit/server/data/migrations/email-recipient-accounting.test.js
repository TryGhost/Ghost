const assert = require('node:assert/strict');
const knex = require('knex');
const migration = require('../../../../../core/server/data/migrations/versions/6.63/2026-09-07-13-39-34-add-email-recipient-accounting');

// The shared integration suite uses MySQL. Keep the retained SQLite DDL path
// covered here with a real database, including rows referenced by recipients.
describe('Email recipient accounting migration (SQLite)', function () {
  let connection;

  beforeEach(async function () {
    connection = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await connection.raw('PRAGMA foreign_keys = ON');
    await connection.schema.createTable('emails', (table) => {
      table.string('id').primary();
      table.integer('email_count').notNullable();
    });
    await connection.schema.createTable('email_batches', (table) => {
      table.string('id').primary();
      table.string('email_id').references('emails.id');
    });
    await connection.schema.createTable('email_recipients', (table) => {
      table.string('id').primary();
      table.string('batch_id').references('email_batches.id');
    });
    await connection('emails').insert({ id: 'email', email_count: 1 });
    await connection('email_batches').insert({ id: 'batch', email_id: 'email' });
    await connection('email_recipients').insert({ id: 'recipient', batch_id: 'batch' });
  });

  afterEach(async function () {
    await connection.destroy();
  });

  it('adds unknown counts idempotently and preserves existing rows through rollback', async function () {
    const options = { connection };
    await migration.up(options);
    await migration.up(options);
    assert.deepEqual(await connection('emails').first(), {
      id: 'email',
      email_count: 1,
      preflight_email_count: null,
      candidate_count: null,
      preparation_excluded_count: null,
      prepared_at: null,
    });
    assert.deepEqual(await connection('email_batches').first(), {
      id: 'batch',
      email_id: 'email',
      recipient_count: null,
      submission_excluded_count: null,
      submitted_count: null,
    });
    await migration.down(options);
    await migration.down(options);
    assert.deepEqual(await connection('emails').first(), { id: 'email', email_count: 1 });
    assert.deepEqual(await connection('email_batches').first(), { id: 'batch', email_id: 'email' });
    assert.deepEqual(await connection('email_recipients').first(), {
      id: 'recipient',
      batch_id: 'batch',
    });
    await migration.up(options);
    assert.equal((await connection('emails').first()).preflight_email_count, null);
  });
});
