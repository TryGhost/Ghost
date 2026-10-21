import assert from 'node:assert/strict';
import createKnex, { type Knex } from 'knex';
import { vi } from 'vitest';
import { configure } from '../../../../core/server/data/db/configure-knex';
import { createDatabaseAutomationsRepository } from '../../../../core/server/services/automations/database-automations-repository';
import { createDatabaseAutomationsRepository2 } from '../../../../core/server/services/automations/database-automations-repository-2';
import { toDatabaseDateWithMilliseconds } from '../../../../core/server/lib/db-types/date';

const DatabaseInfo = require('@tryghost/database-info');
const migration = require('../../../../core/server/data/migrations/versions/6.73/2026-10-21-21-22-05-convert-automation-dates-to-sqlite-text');
const sqliteConfig = configure({
  client: 'better-sqlite3',
  connection: { filename: ':memory:' },
  useNullAsDefault: true,
});

describe('SQLite automation date storage', function () {
  let knex: Knex;

  beforeEach(async function () {
    knex = createKnex({
      ...sqliteConfig,
      connection: { filename: ':memory:' },
    });

    await knex.schema.createTable('automations', (table) => {
      table.string('id').primary();
      table.string('status').notNullable();
      table.string('trigger_tier_scope').notNullable();
    });
    await knex.schema.createTable('automation_actions', (table) => {
      table.string('id').primary();
      table.string('type').notNullable();
    });
    await knex.schema.createTable('automation_action_revisions', (table) => {
      table.string('id').primary();
      table.string('action_id').notNullable();
      table.integer('wait_hours');
      table.string('email_subject');
      table.text('email_lexical');
      table.string('email_design_setting_id');
    });
    await knex.schema.createTable('automation_runs', (table) => {
      table.string('id').primary();
      table.dateTime('created_at').notNullable();
      table.dateTime('updated_at').notNullable();
      table.string('automation_id').notNullable();
      table.string('member_id').notNullable();
      table.string('member_email').notNullable();
    });
    await knex.schema.createTable('automation_run_steps', (table) => {
      table.string('id').primary();
      table.dateTime('created_at').notNullable();
      table.dateTime('updated_at').notNullable();
      table.string('automation_run_id').notNullable();
      table.string('automation_action_revision_id').notNullable();
      table.dateTime('ready_at').notNullable();
      table.integer('step_attempts').notNullable().defaultTo(0);
      table.string('status').notNullable().defaultTo('pending');
      table.string('locked_by');
      table.dateTime('locked_at');
      table.dateTime('started_at');
    });
  });

  afterEach(async function () {
    vi.useRealTimers();
    vi.restoreAllMocks();
    await knex.destroy();
  });

  it('converts old integer timestamps to millisecond text and is idempotent', async function () {
    const createdAt = new Date('2026-01-02T03:04:05.123Z');
    const readyAt = new Date('2026-01-02T03:05:05.456Z');
    await knex('automation_runs').insert({
      id: 'legacy-run',
      created_at: createdAt,
      updated_at: createdAt,
      automation_id: 'automation',
      member_id: 'member',
      member_email: 'member@example.com',
    });
    await knex('automation_run_steps').insert({
      id: 'legacy-step',
      created_at: createdAt,
      updated_at: createdAt,
      automation_run_id: 'legacy-run',
      automation_action_revision_id: 'revision',
      ready_at: readyAt,
      status: 'pending',
    });

    const beforeMigration = await knex('automation_run_steps')
      .select(knex.raw('typeof(ready_at) as ready_at_type'))
      .where('id', 'legacy-step')
      .first<{ ready_at_type: string }>();
    assert.equal(beforeMigration?.ready_at_type, 'integer');

    await migration.up({ connection: knex });
    await migration.up({ connection: knex });

    const migratedRun = await knex('automation_runs')
      .select(
        'created_at',
        'updated_at',
        knex.raw('typeof(created_at) as created_at_type'),
        knex.raw('typeof(updated_at) as updated_at_type'),
      )
      .where('id', 'legacy-run')
      .first();
    assert.equal(migratedRun.created_at_type, 'text');
    assert.equal(migratedRun.updated_at_type, 'text');
    assert.equal(migratedRun.created_at, toDatabaseDateWithMilliseconds(createdAt));

    const migratedStep = await knex('automation_run_steps')
      .select(
        'created_at',
        'updated_at',
        'ready_at',
        knex.raw('typeof(created_at) as created_at_type'),
        knex.raw('typeof(updated_at) as updated_at_type'),
        knex.raw('typeof(ready_at) as ready_at_type'),
      )
      .where('id', 'legacy-step')
      .first();
    assert.equal(migratedStep.created_at_type, 'text');
    assert.equal(migratedStep.updated_at_type, 'text');
    assert.equal(migratedStep.ready_at_type, 'text');
    assert.equal(migratedStep.created_at, toDatabaseDateWithMilliseconds(createdAt));
    assert.equal(migratedStep.updated_at, toDatabaseDateWithMilliseconds(createdAt));
    assert.equal(migratedStep.ready_at, toDatabaseDateWithMilliseconds(readyAt));
  });

  it('leaves SQLite values untouched on the MySQL migration path', async function () {
    const createdAt = new Date('2026-01-02T03:04:05.123Z');
    await knex('automation_runs').insert({
      id: 'mysql-path-run',
      created_at: createdAt,
      updated_at: createdAt,
      automation_id: 'automation',
      member_id: 'member',
      member_email: 'member@example.com',
    });

    vi.spyOn(DatabaseInfo, 'isSQLite').mockReturnValue(false);
    await migration.up({ connection: knex });

    const row = await knex('automation_runs')
      .select(knex.raw('typeof(created_at) as created_at_type'))
      .where('id', 'mysql-path-run')
      .first<{ created_at_type: string }>();
    assert.equal(row?.created_at_type, 'integer');
  });

  it('stores millisecond dates and handles the ready_at boundary', async function () {
    const now = new Date('2026-10-21T12:00:00.500Z');
    const legacyReadyAt = new Date(now.getTime() - 60_000);
    const boundaryReadyAt = new Date(now.getTime() - 1);
    const futureReadyAt = new Date(now.getTime() + 1);

    await knex('automations').insert({
      id: 'automation',
      status: 'active',
      trigger_tier_scope: 'free',
    });
    await knex('automation_actions').insert({ id: 'action', type: 'wait' });
    await knex('automation_action_revisions').insert({
      id: 'revision',
      action_id: 'action',
      wait_hours: 1,
    });

    await knex('automation_runs').insert({
      id: 'legacy-run',
      created_at: now,
      updated_at: now,
      automation_id: 'automation',
      member_id: 'member',
      member_email: 'member@example.com',
    });
    await knex('automation_run_steps').insert({
      id: 'legacy-step',
      created_at: now,
      updated_at: now,
      automation_run_id: 'legacy-run',
      automation_action_revision_id: 'revision',
      ready_at: legacyReadyAt,
      status: 'pending',
    });
    await migration.up({ connection: knex });

    const repository2 = createDatabaseAutomationsRepository2({ knex });
    await repository2.insertRuns(knex, [
      {
        id: 'future-run',
        created_at: now,
        updated_at: now,
        automation_id: 'automation',
        member_id: 'member',
        member_email: 'member@example.com',
      },
    ]);
    await repository2.insertRunSteps(knex, [
      {
        id: 'boundary-step',
        created_at: now,
        updated_at: now,
        automation_run_id: 'future-run',
        automation_action_revision_id: 'revision',
        ready_at: boundaryReadyAt,
      },
      {
        id: 'future-step',
        created_at: now,
        updated_at: now,
        automation_run_id: 'future-run',
        automation_action_revision_id: 'revision',
        ready_at: futureReadyAt,
      },
    ]);

    const storedFutureStep = await knex('automation_run_steps')
      .select('ready_at', knex.raw('typeof(ready_at) as ready_at_type'))
      .where('id', 'future-step')
      .first<{ ready_at: string; ready_at_type: string }>();
    const repository = createDatabaseAutomationsRepository({
      knex,
      fakeWaitHoursMultiplier: null,
    });
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(now);
    const { steps } = await repository.fetchAndLockSteps(10);
    assert.deepEqual(
      steps.map((step) => step.id),
      ['legacy-step', 'boundary-step'],
    );

    assert.equal(storedFutureStep?.ready_at_type, 'text');
    assert.equal(storedFutureStep?.ready_at, toDatabaseDateWithMilliseconds(futureReadyAt));
  });
});
