const assert = require('node:assert/strict');
const Knex = require('knex');
const migration = require('../../../../../core/server/data/migrations/versions/6.64/2026-09-10-13-18-22-add-member-email-counter-state');

describe('Member email counter state migration (SQLite compatibility)', function () {
  let connection;

  beforeEach(async function () {
    connection = Knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await connection.schema.createTable('members', (table) => {
      table.string('id', 24).primary();
      table.integer('email_count').notNullable();
      table.integer('email_opened_count').notNullable();
    });
    await connection.schema.createTable('email_batches', (table) => {
      table.string('id', 24).primary();
      table.string('status').notNullable();
    });
    await connection('members').insert({ id: 'member-1', email_count: 8, email_opened_count: 3 });
    await connection('email_batches').insert({ id: 'batch-1', status: 'submitted' });
  });

  afterEach(async function () {
    await connection.destroy();
  });

  it('marks existing counters and batches uninitialized without changing their data', async function () {
    await migration.up({ connection });
    assert.deepEqual(await connection('members').first(), {
      id: 'member-1',
      email_count: 8,
      email_opened_count: 3,
      email_tracked_count: null,
    });
    assert.deepEqual(await connection('email_batches').first(), {
      id: 'batch-1',
      status: 'submitted',
      member_counters_enabled: 0,
      member_counters_applied_at: null,
    });
  });

  it('preserves applied state when rerun and supports rollback followed by reapplication', async function () {
    await migration.up({ connection });
    await connection('members').update({ email_tracked_count: 0 });
    await connection('email_batches').update({
      member_counters_enabled: true,
      member_counters_applied_at: '2026-09-10 12:00:00',
    });
    await migration.up({ connection });
    assert.equal((await connection('members').first()).email_tracked_count, 0);
    assert.equal((await connection('email_batches').first()).member_counters_enabled, 1);
    assert.equal(
      (await connection('email_batches').first()).member_counters_applied_at,
      '2026-09-10 12:00:00',
    );

    await migration.down({ connection });
    await migration.down({ connection });
    assert.equal(await connection.schema.hasColumn('members', 'email_tracked_count'), false);
    assert.equal(
      await connection.schema.hasColumn('email_batches', 'member_counters_enabled'),
      false,
    );
    assert.equal(
      await connection.schema.hasColumn('email_batches', 'member_counters_applied_at'),
      false,
    );
    assert.deepEqual(await connection('members').first(), {
      id: 'member-1',
      email_count: 8,
      email_opened_count: 3,
    });
    assert.deepEqual(await connection('email_batches').first(), {
      id: 'batch-1',
      status: 'submitted',
    });

    await migration.up({ connection });
    assert.equal((await connection('members').first()).email_tracked_count, null);
    assert.equal((await connection('email_batches').first()).member_counters_enabled, 0);
    assert.equal((await connection('email_batches').first()).member_counters_applied_at, null);
  });
});
