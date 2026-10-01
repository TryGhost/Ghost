import assert from 'node:assert/strict';
import createKnex, { type Knex } from 'knex';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import { createTinybirdSyncService } from '../../../../../core/server/services/tinybird-sync/tinybird-sync-service';
import TinybirdSyncJob from '../../../../../core/server/services/tinybird-sync/jobs/tinybird-sync-job';
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
      labs: { isSet: vi.fn(() => true) },
      knex: {} as Knex,
      logging: { info: vi.fn(), error: vi.fn() },
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

  it('schedules a five-minute recurring job at a random offset', async () => {
    const jobsService = { scheduleRecurring: vi.fn(async () => {}) };
    const { dependencies, service } = createService();

    await service.scheduleJob(jobsService);

    assert.equal(jobsService.scheduleRecurring.mock.calls.length, 1);
    const [job, schedule] = jobsService.scheduleRecurring.mock.calls[0] as unknown as [
      TinybirdSyncJob,
      { cron: string },
    ];
    assert.ok(job instanceof TinybirdSyncJob);
    assert.deepEqual(schedule, { cron: '30 2/5 * * * *' });
    assert.deepEqual(dependencies.logging.info.mock.calls, [
      [
        { system: { event: 'tinybird.sync.started' } },
        '[Tinybird sync] Started: sync enabled by labs flag (but may change)',
      ],
      ['[Background Job] tinybird-sync scheduled at 30 2/5 * * * *'],
    ]);
  });

  it('rejects a second schedule', async () => {
    const jobsService = { scheduleRecurring: vi.fn(async () => {}) };
    const { service } = createService();

    await service.scheduleJob(jobsService);
    await assert.rejects(() => service.scheduleJob(jobsService), {
      message: 'Tinybird sync is already scheduled.',
    });

    assert.equal(jobsService.scheduleRecurring.mock.calls.length, 1);
  });

  it('allows scheduling to be retried after it fails', async () => {
    const failure = new Error('backend not started');
    const jobsService = {
      scheduleRecurring: vi.fn().mockRejectedValueOnce(failure).mockResolvedValueOnce(undefined),
    };
    const { service } = createService();

    await assert.rejects(() => service.scheduleJob(jobsService), failure);
    await service.scheduleJob(jobsService);

    assert.equal(jobsService.scheduleRecurring.mock.calls.length, 2);
  });

  it('logs that sync is disabled by labs flag when scheduling', async () => {
    const jobsService = { scheduleRecurring: vi.fn(async () => {}) };
    const { dependencies, service } = createService({ labs: { isSet: vi.fn(() => false) } });

    await service.scheduleJob(jobsService);

    assert.deepEqual(dependencies.logging.info.mock.calls[0], [
      { system: { event: 'tinybird.sync.started' } },
      '[Tinybird sync] Started: sync disabled by labs flag (but may change)',
    ]);
    assert.equal(jobsService.scheduleRecurring.mock.calls.length, 1);
  });

  it('does not schedule without complete analytics config', async () => {
    const jobsService = { scheduleRecurring: vi.fn(async () => {}) };
    const fetch = vi.fn();
    const { dependencies, service } = createService({
      config: { get: () => undefined },
      fetch,
    });

    await service.scheduleJob(jobsService);
    await service.sync();

    assert.equal(jobsService.scheduleRecurring.mock.calls.length, 0);
    assert.equal(fetch.mock.calls.length, 0);
    assert.deepEqual(dependencies.logging.info.mock.calls, [
      ['[Tinybird sync] Not started: Traffic Analytics service is not configured'],
    ]);
  });

  it('uses a five-minute request timeout', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    const database = await createEmptyDatabase();
    await database('automation_runs').insert({
      id: 'run-id',
      automation_id: 'automation-id',
      created_at: '2026-03-01 11:50:00',
      updated_at: '2026-03-01 11:50:00',
    });
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    const { service } = createService({ knex: database, fetch });

    await service.sync();

    assert.ok(timeout.mock.calls.some(([duration]) => duration === 5 * 60 * 1000));
  });

  it('logs completed runs even when no rows are sent', async () => {
    const database = await createEmptyDatabase();
    const { dependencies, service } = createService({ knex: database });

    await service.sync();

    assert.deepEqual(
      dependencies.logging.info.mock.calls.map((call) => call[0].system),
      [
        { event: 'tinybird.sync.completed', table: 'automation_runs', sent: 0 },
        { event: 'tinybird.sync.completed', table: 'automation_run_steps', sent: 0 },
      ],
    );
  });

  it('logs a table that fails to sync without failing the run', async () => {
    const database = await createEmptyDatabase();
    await database.schema.dropTable('automation_run_steps');
    const { dependencies, service } = createService({ knex: database });

    await service.sync();

    assert.equal(dependencies.logging.error.mock.calls.length, 1);
    assert.equal(
      dependencies.logging.error.mock.calls[0][1],
      '[Tinybird sync] Failed to sync table',
    );
  });

  it('skips sync when labs flag is disabled', async () => {
    const database = await createEmptyDatabase();
    const fetch = vi.fn();
    const { dependencies, service } = createService({
      knex: database,
      fetch,
      labs: { isSet: vi.fn(() => false) },
    });

    await service.sync();

    assert.equal(fetch.mock.calls.length, 0);
    assert.equal(dependencies.logging.info.mock.calls.length, 0);
  });

  it('limits Traffic Analytics requests to 1000 messages', async () => {
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
    const { service } = createService({ knex: database, fetch });

    await service.sync();

    assert.deepEqual(requests, [1000, 1]);
  });
});
