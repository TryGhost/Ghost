import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import express from 'express';
import createKnex, { type Knex } from 'knex';
import ObjectId from 'bson-objectid';
import { afterAll, afterEach, beforeAll, beforeEach, describe, it, vi } from 'vitest';
import {
  AUTOMATION_SYNC_TARGETS,
  SAFETY_LAG_MS,
  chunkByBytes,
  syncTableToTinybird,
} from '../../../../../core/server/services/tinybird-sync/sync-table-to-tinybird';
import { toDatabaseDate } from '../../../../../core/server/lib/db-types/date';

const SITE_UUID = 'bd05ceed-1df9-4af7-832a-d3b5faa7ca1d';
const TARGET = AUTOMATION_SYNC_TARGETS.find((target) => target.table === 'automation_runs')!;
const STEP_TARGET = AUTOMATION_SYNC_TARGETS.find(
  (target) => target.table === 'automation_run_steps',
)!;
const NOW = new Date('2026-03-01T12:00:00.000Z');
const fetch = globalThis.fetch;

interface EventLine {
  type: string;
  site_uuid: string;
  id: string;
  updated_at: string;
  payload: Record<string, unknown>;
}

interface ReceivedRequest {
  url: string;
  authorization: string | undefined;
  contentType: string | undefined;
  lines: EventLine[];
}

let server: Server;
let endpoint: string;
let received: ReceivedRequest[];
let respondWith: { status: number; body: unknown } | 'hang';
let knex: Knex;

const createDatabase = async (): Promise<Knex> => {
  const database = createKnex({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    pool: { min: 1, max: 1 },
    useNullAsDefault: true,
  });

  await database.schema.createTable('automation_runs', (table) => {
    table.text('id').primary();
    table.text('created_at').notNullable();
    table.text('updated_at').notNullable();
    table.text('automation_id').notNullable();
    table.text('member_id');
    table.text('member_email').notNullable();
  });

  await database.schema.createTable('automation_run_steps', (table) => {
    table.text('id').primary();
    table.text('automation_run_id').notNullable();
    table.text('automation_action_revision_id').notNullable();
    table.text('status').notNullable();
    table.integer('step_attempts').notNullable();
    table.text('ready_at');
    table.text('started_at');
    table.text('finished_at');
    table.text('created_at').notNullable();
    table.text('updated_at').notNullable();
  });

  await database.schema.createTable('tinybird_syncs', (table) => {
    table.text('id').primary();
    table.text('table_name').notNullable().unique();
    table.text('last_synced_updated_at').notNullable();
    table.text('created_at').notNullable();
    table.text('updated_at');
  });

  return database;
};

const insertRun = async (updatedAt: Date, overrides: Record<string, unknown> = {}) => {
  const id = ObjectId().toHexString();
  await knex('automation_runs').insert({
    id,
    created_at: toDatabaseDate(updatedAt),
    updated_at: toDatabaseDate(updatedAt),
    automation_id: 'automation-1',
    member_id: 'member-1',
    member_email: 'member@example.com',
    ...overrides,
  });
  return id;
};

const minutesBeforeNow = (minutes: number) => new Date(NOW.getTime() - minutes * 60 * 1000);

const sync = (options: Partial<Parameters<typeof syncTableToTinybird>[1]> = {}) =>
  syncTableToTinybird(TARGET, {
    knex,
    endpoint,
    siteUuid: SITE_UUID,
    now: () => NOW,
    ...options,
  });

const syncSteps = (options: Partial<Parameters<typeof syncTableToTinybird>[1]> = {}) =>
  syncTableToTinybird(STEP_TARGET, {
    knex,
    endpoint,
    siteUuid: SITE_UUID,
    now: () => NOW,
    ...options,
  });

const receivedIds = () => received.flatMap((request) => request.lines.map((line) => line.id));

const watermark = async () => {
  const row = await knex('tinybird_syncs').where({ table_name: TARGET.table }).first();
  return row?.last_synced_updated_at ?? null;
};

beforeAll(async () => {
  const app = express();
  app.use(express.text({ type: 'application/x-ndjson', limit: '20mb' }));
  app.post('/api/v1/automations', (req, res) => {
    received.push({
      url: req.originalUrl,
      authorization: req.get('authorization'),
      contentType: req.get('content-type'),
      lines: String(req.body)
        .split('\n')
        .map((line) => JSON.parse(line) as EventLine),
    });
    if (respondWith === 'hang') {
      return;
    }
    res.status(respondWith.status).json(respondWith.body);
  });
  server = app.listen(0);
  await once(server, 'listening');
  endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  server.closeAllConnections();
  server.close();
  await once(server, 'close');
});

beforeEach(async () => {
  received = [];
  respondWith = { status: 200, body: { successful_rows: 0, quarantined_rows: 0 } };
  knex = await createDatabase();
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = new URL(String(input));
    url.hostname = '127.0.0.1';
    url.port = new URL(endpoint).port;
    return fetch(url, init);
  });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await knex.destroy();
});

describe('syncTableToTinybird', () => {
  it('sends allowlisted columns to the Events API as acknowledged NDJSON events', async () => {
    const updatedAt = minutesBeforeNow(10);
    const id = await insertRun(updatedAt);

    const sent = await sync();

    assert.equal(sent, 1);
    assert.equal(received.length, 1);
    const [request] = received;
    assert.equal(request.url, '/api/v1/automations');
    assert.equal(request.authorization, undefined);
    assert.equal(request.contentType, 'application/x-ndjson');
    assert.deepEqual(request.lines, [
      {
        type: 'automation_runs',
        site_uuid: SITE_UUID,
        id,
        updated_at: '2026-03-01 11:50:00',
        payload: {
          site_uuid: SITE_UUID,
          id,
          automation_id: 'automation-1',
          created_at: '2026-03-01 11:50:00',
          updated_at: '2026-03-01 11:50:00',
        },
      },
    ]);
  });

  it('identifies automation run step payloads by their source table', async () => {
    const updatedAt = minutesBeforeNow(10);
    const id = ObjectId().toHexString();
    await knex('automation_run_steps').insert({
      id,
      automation_run_id: 'run-1',
      automation_action_revision_id: 'revision-1',
      status: 'completed',
      step_attempts: 1,
      ready_at: null,
      started_at: null,
      finished_at: null,
      created_at: toDatabaseDate(updatedAt),
      updated_at: toDatabaseDate(updatedAt),
    });

    await syncSteps();

    assert.equal(received[0].lines[0].type, 'automation_run_steps');
  });

  it('never sends member identity columns', async () => {
    await insertRun(minutesBeforeNow(10));

    await sync();

    const [line] = received[0].lines;
    assert.ok(!('member_email' in line.payload));
    assert.ok(!('member_id' in line.payload));
  });

  it('sends nothing and records no watermark when there are no rows', async () => {
    const sent = await sync();

    assert.equal(sent, 0);
    assert.equal(received.length, 0);
    assert.equal(await watermark(), null);
  });

  it('records the newest synced updated_at as the watermark', async () => {
    await insertRun(minutesBeforeNow(30));
    await insertRun(minutesBeforeNow(20));

    await sync();

    assert.equal(await watermark(), '2026-03-01 11:40:00');
  });

  it('only sends rows at or after the watermark on later runs', async () => {
    await insertRun(minutesBeforeNow(30));
    const boundaryId = await insertRun(minutesBeforeNow(20));
    await sync();
    received = [];

    const newerId = await insertRun(minutesBeforeNow(10));
    await insertRun(minutesBeforeNow(40));
    const sent = await sync();

    assert.equal(sent, 2);
    assert.deepEqual(receivedIds().sort(), [boundaryId, newerId].sort());
  });

  it('holds back rows updated within the safety lag until a later run', async () => {
    const oldId = await insertRun(new Date(NOW.getTime() - SAFETY_LAG_MS - 1000));
    const freshId = await insertRun(new Date(NOW.getTime() - SAFETY_LAG_MS + 1000));

    await sync();
    assert.deepEqual(receivedIds(), [oldId]);

    received = [];
    await sync({ now: () => new Date(NOW.getTime() + SAFETY_LAG_MS) });
    assert.deepEqual(receivedIds(), [oldId, freshId]);
  });

  it('pages through rows in batches ordered by updated_at then id', async () => {
    for (let i = 0; i < 5; i++) {
      await insertRun(minutesBeforeNow(10), { id: `run-${i}` });
    }
    await insertRun(minutesBeforeNow(5), { id: 'run-later' });

    const sent = await sync({ batchSize: 2 });

    assert.equal(sent, 6);
    assert.equal(received.length, 3);
    assert.deepEqual(receivedIds(), ['run-0', 'run-1', 'run-2', 'run-3', 'run-4', 'run-later']);
    assert.equal(await watermark(), '2026-03-01 11:55:00');
  });

  it('splits a batch into multiple requests when it exceeds the payload size in bytes', async () => {
    // 1000 characters but 2000 bytes: measured by string length, three lines would fit.
    const twoByteCharacters = 'ü'.repeat(1000);
    for (let i = 0; i < 3; i++) {
      await insertRun(minutesBeforeNow(10), { id: `run-${i}`, automation_id: twoByteCharacters });
    }

    await sync({ maxPayloadBytes: 5000 });

    assert.deepEqual(
      received.map((request) => request.lines.length),
      [2, 1],
    );
    for (const request of received) {
      assert.ok(request.lines.every((line) => line.payload.automation_id === twoByteCharacters));
    }
  });

  it('throws and leaves the watermark alone when the Events API rejects a request', async () => {
    await insertRun(minutesBeforeNow(10));
    respondWith = { status: 403, body: { error: 'forbidden' } };

    await assert.rejects(sync(), /Tinybird Events API returned 403 for automation_run_events/);
    assert.equal(await watermark(), null);
  });

  it('throws and leaves the watermark alone when rows are quarantined', async () => {
    await insertRun(minutesBeforeNow(10));
    respondWith = { status: 200, body: { successful_rows: 0, quarantined_rows: 1 } };

    await assert.rejects(sync(), /Tinybird quarantined 1 automation_run_events rows/);
    assert.equal(await watermark(), null);
  });

  it('throws and leaves the watermark alone when the request times out', async () => {
    await insertRun(minutesBeforeNow(10));
    respondWith = 'hang';

    await assert.rejects(sync({ requestTimeoutMs: 50 }), { name: 'TimeoutError' });
    assert.equal(await watermark(), null);
  });
});

describe('chunkByBytes', () => {
  it('measures lines in UTF-8 bytes, not string length', () => {
    const ascii = 'aaaa';
    const multibyte = 'ääää';
    assert.equal(ascii.length, multibyte.length);

    assert.deepEqual(chunkByBytes([ascii, ascii], 10), [[ascii, ascii]]);
    assert.deepEqual(chunkByBytes([multibyte, multibyte], 10), [[multibyte], [multibyte]]);
  });

  it('never splits a single line, even when it is over the limit', () => {
    assert.deepEqual(chunkByBytes(['0123456789'], 2), [['0123456789']]);
  });
});
