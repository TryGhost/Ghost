import type { Knex } from 'knex';
import type { ReadonlyDeep } from 'type-fest';
import errors from '@tryghost/errors';
import { fromDatabaseDate, toDatabaseDate, type DatabaseDate } from '../../lib/db-types/date';

export type TinybirdSyncTarget = ReadonlyDeep<{
  table: string;
  columns: string[];
}>;

export type TinybirdSyncOptions = {
  knex: Knex;
  endpoint: URL;
  trafficAnalyticsAuth: string;
  siteUuid: string;
  now: () => Date;
  fetch: typeof globalThis.fetch;
  createId: () => string;
  batchSize: number;
  maxPayloadBytes: number;
  requestTimeoutMs: number;
};

// Only what the Tinybird materialized views read. Member identity and lock bookkeeping
// stay in MySQL.
export const AUTOMATION_SYNC_TARGETS: ReadonlyDeep<TinybirdSyncTarget[]> = [
  {
    table: 'automation_runs',
    columns: ['id', 'automation_id', 'created_at', 'updated_at'],
  },
  {
    table: 'automation_run_steps',
    columns: [
      'id',
      'automation_run_id',
      'automation_action_revision_id',
      'status',
      'step_attempts',
      'ready_at',
      'started_at',
      'finished_at',
      'created_at',
      'updated_at',
    ],
  },
];

// A row's updated_at is assigned before its transaction commits, so a row can become
// visible after rows with later timestamps. Holding back the newest rows keeps the
// watermark from moving past a row whose transaction is still open.
export const SAFETY_LAG_MS = 60 * 1000;

type Row = Record<string, unknown> & { id: string; updated_at: DatabaseDate };

type Cursor = {
  updatedAt: Date;
  id: string;
};

const serializeValue = (key: string, value: unknown): unknown =>
  key.endsWith('_at') && value !== null && value !== undefined
    ? fromDatabaseDate(value as DatabaseDate).toISOString()
    : value;

const toEventLine = (row: Row, siteUuid: string, type: string): string => {
  const payload = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, serializeValue(key, value)]),
  );
  return JSON.stringify({
    type,
    site_uuid: siteUuid,
    id: row.id,
    updated_at: fromDatabaseDate(row.updated_at).toISOString(),
    payload: { ...payload, site_uuid: siteUuid },
  });
};

function* chunkByBytes(lines: string[], maxBytes: number): Generator<string[]> {
  let current: string[] = [];
  let currentBytes = 0;

  for (const line of lines) {
    const bytes = Buffer.byteLength(line) + '\n'.length;
    if (current.length && currentBytes + bytes > maxBytes) {
      yield current;
      current = [];
      currentBytes = 0;
    }
    current.push(line);
    currentBytes += bytes;
  }

  if (current.length) {
    yield current;
  }
}

async function postEvents(
  lines: string[],
  { table }: TinybirdSyncTarget,
  { endpoint, trafficAnalyticsAuth, siteUuid, fetch, requestTimeoutMs }: TinybirdSyncOptions,
): Promise<void> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${trafficAnalyticsAuth}`,
      'Content-Type': 'application/x-ndjson',
      'x-site-uuid': siteUuid,
    },
    body: lines.join('\n'),
    signal: AbortSignal.timeout(requestTimeoutMs),
  });

  if (!response.ok) {
    throw new errors.InternalServerError({
      message: `Traffic Analytics returned ${response.status} while syncing ${table}: ${await response.text()}`,
    });
  }
}

async function readWatermark(knex: Knex, table: string): Promise<Cursor | null> {
  const row = await knex('tinybird_syncs')
    .select('last_synced_updated_at', 'last_synced_id')
    .where({ table_name: table })
    .first();
  if (!row) {
    return null;
  }
  return { updatedAt: fromDatabaseDate(row.last_synced_updated_at), id: row.last_synced_id };
}

async function writeWatermark(
  knex: Knex,
  table: string,
  cursor: Cursor,
  now: Date,
  createId: () => string,
): Promise<void> {
  const timestamp = toDatabaseDate(now);
  const values = {
    last_synced_updated_at: toDatabaseDate(cursor.updatedAt),
    last_synced_id: cursor.id,
    updated_at: timestamp,
  };
  await knex('tinybird_syncs')
    .insert({
      id: createId(),
      table_name: table,
      ...values,
      created_at: timestamp,
    })
    .onConflict('table_name')
    .merge(values);
}

async function readBatch(
  { table, columns }: TinybirdSyncTarget,
  { knex, batchSize }: TinybirdSyncOptions,
  cursor: Cursor | null,
  cutoff: string,
): Promise<Row[]> {
  const query = knex(table)
    .select(columns)
    .where('updated_at', '<', cutoff)
    .orderBy([{ column: 'updated_at' }, { column: 'id' }])
    .limit(batchSize);

  if (cursor) {
    const updatedAt = toDatabaseDate(cursor.updatedAt);
    query.andWhere((builder) =>
      builder
        .where('updated_at', '>', updatedAt)
        .orWhere((tie) => tie.where('updated_at', updatedAt).andWhere('id', '>', cursor.id)),
    );
  }

  return await query;
}

export async function syncTableToTinybird(
  target: TinybirdSyncTarget,
  options: TinybirdSyncOptions,
): Promise<number> {
  const { knex, siteUuid, now, createId, batchSize, maxPayloadBytes } = options;
  const cutoff = toDatabaseDate(new Date(now().getTime() - SAFETY_LAG_MS));
  let cursor = await readWatermark(knex, target.table);
  let sent = 0;

  while (true) {
    const rows = await readBatch(target, options, cursor, cutoff);
    if (!rows.length) {
      return sent;
    }

    const lines = rows.map((row) => toEventLine(row, siteUuid, target.table));
    for (const chunk of chunkByBytes(lines, maxPayloadBytes)) {
      await postEvents(chunk, target, options);
    }

    const last = rows[rows.length - 1];
    cursor = { updatedAt: fromDatabaseDate(last.updated_at), id: last.id };
    await writeWatermark(knex, target.table, cursor, now(), createId);
    sent += rows.length;

    // This is a performance optimization to prevent one needless batch read.
    // It is not required for correctness.
    if (rows.length < batchSize) {
      return sent;
    }
  }
}
