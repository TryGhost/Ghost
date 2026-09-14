import assert from 'node:assert/strict';
import createKnex, { type Knex } from 'knex';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import { createTinybirdSyncService } from '../../../../../core/server/services/tinybird-sync/tinybird-sync-service';
import { toDatabaseDate } from '../../../../../core/server/lib/db-types/date';

describe('createTinybirdSyncService', () => {
  let databases: Knex[];

  const createService = (overrides: Record<string, unknown> = {}) => {
    const values: Record<string, unknown> = {
      'tinybird:tracker:endpoint': 'https://analytics.example.com/.ghost/analytics/api/v1/page_hit',
      'tinybird:sync_auth_key': 'sync-secret',
      'tinybird:stats': { id: 'configured-site-uuid' },
    };
    const dependencies = {
      config: { get: vi.fn((key: string) => values[key]) },
      settingsCache: { get: vi.fn(() => 'settings-site-uuid') },
      knex: {} as Knex,
      logging: { info: vi.fn(), error: vi.fn() },
      sleep: vi.fn(async () => {}),
      random: () => 0.5,
      now: () => new Date('2026-03-01T12:00:00.000Z'),
      fetch: globalThis.fetch,
      createId: () => 'watermark-id',
      ...overrides,
    };
    return { dependencies, service: createTinybirdSyncService(dependencies) };
  };

  const createEmptyDatabase = async () => {
    const database = createKnex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      pool: { min: 1, max: 1 },
      useNullAsDefault: true,
    });
    databases.push(database);

    await database.schema.createTable('automation_runs', (table) => {
      table.text('id');
      table.text('automation_id');
      table.text('created_at');
      table.text('updated_at');
    });
    await database.schema.createTable('automation_run_steps', (table) => {
      table.text('id');
      table.text('automation_run_id');
      table.text('automation_action_revision_id');
      table.text('status');
      table.integer('step_attempts');
      table.text('ready_at');
      table.text('started_at');
      table.text('finished_at');
      table.text('created_at');
      table.text('updated_at');
    });
    await database.schema.createTable('tinybird_syncs', (table) => {
      table.text('id');
      table.text('table_name').unique();
      table.text('last_synced_updated_at');
      table.text('last_synced_id');
      table.text('created_at');
      table.text('updated_at');
    });

    return database;
  };

  beforeEach(() => {
    databases = [];
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    await Promise.all(databases.map((database) => database.destroy()));
  });

  it('starts once with randomized initial delay and logs loop failures', async () => {
    const failure = new Error('timer failed');
    const sleep = vi.fn().mockRejectedValue(failure);
    const { dependencies, service } = createService({ sleep });

    service.start();
    service.start();
    await vi.waitFor(() => assert.equal(dependencies.logging.error.mock.calls.length, 1));

    assert.deepEqual(sleep.mock.calls, [[150000]]);
    assert.equal(dependencies.logging.error.mock.calls[0][0], failure);
  });

  it('logs completed runs even when no rows are sent', async () => {
    const failure = new Error('stop loop');
    const sleep = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(failure);
    const database = await createEmptyDatabase();
    const { dependencies, service } = createService({ knex: database, sleep, random: () => 0 });

    service.start();
    await vi.waitFor(() => assert.equal(dependencies.logging.error.mock.calls.length, 1));

    assert.deepEqual(
      dependencies.logging.info.mock.calls.map((call) => call[0].system),
      [
        { event: 'tinybird.sync.completed', table: 'automation_runs', sent: 0 },
        { event: 'tinybird.sync.completed', table: 'automation_run_steps', sent: 0 },
      ],
    );
  });

  it('limits Traffic Analytics requests to 1000 messages', async () => {
    const failure = new Error('stop loop');
    const sleep = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(failure);
    const database = await createEmptyDatabase();
    const updatedAt = toDatabaseDate(new Date('2026-03-01T11:50:00.000Z'));
    await database.batchInsert(
      'automation_runs',
      Array.from({ length: 1001 }, (_, index) => ({
        id: `run-${index}`,
        automation_id: `automation-${index}`,
        created_at: updatedAt,
        updated_at: updatedAt,
      })),
      500,
    );
    const requests: number[] = [];
    const fetch: typeof globalThis.fetch = async (_input, init) => {
      requests.push(String(init?.body).split('\n').length);
      return new Response(null, { status: 202 });
    };
    const { service } = createService({ knex: database, sleep, random: () => 0, fetch });

    service.start();
    await vi.waitFor(() => assert.deepEqual(requests, [1000, 1]));
  });

  it('does not start without complete analytics config', () => {
    const { dependencies, service } = createService({
      config: { get: () => undefined },
    });

    service.start();
    assert.equal(dependencies.sleep.mock.calls.length, 0);
    assert.equal(dependencies.logging.info.mock.calls.length, 1);
  });
});
