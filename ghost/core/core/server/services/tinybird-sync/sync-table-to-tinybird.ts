import ObjectId from 'bson-objectid';
import type { Knex } from 'knex';
import { toDatabaseDate, type DatabaseDate } from '../../lib/db-types/date';

const errors = require('@tryghost/errors');

export interface TinybirdSyncTarget {
  table: string;
  datasource: string;
  columns: string[];
}

export interface TinybirdSyncOptions {
  knex: Knex;
  endpoint: string;
  siteUuid: string;
  now?: () => Date;
  batchSize?: number;
  maxPayloadBytes?: number;
  requestTimeoutMs?: number;
}

// Only what the Tinybird materialized views read. Member identity and lock bookkeeping
// stay in MySQL.
export const AUTOMATION_SYNC_TARGETS: TinybirdSyncTarget[] = [
  {
    table: 'automation_runs',
    datasource: 'automation_run_events',
    columns: ['id', 'automation_id', 'created_at', 'updated_at'],
  },
  {
    table: 'automation_run_steps',
    datasource: 'automation_run_step_events',
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

const DEFAULT_BATCH_SIZE = 5000;
// Tinybird's Events API rejects request bodies over 10MB.
const DEFAULT_MAX_PAYLOAD_BYTES = 8 * 1024 * 1024;
const DEFAULT_REQUEST_TIMEOUT_MS = 60 * 1000;
// A row's updated_at is assigned before its transaction commits, so a row can become
// visible after rows with later timestamps. Holding back the newest rows keeps the
// watermark from moving past a row whose transaction is still open.
export const SAFETY_LAG_MS = 60 * 1000;

type Row = Record<string, unknown> & { id: string; updated_at: DatabaseDate };

interface Cursor {
  updatedAt: string;
  id: string;
}

const serializeValue = (value: unknown): unknown =>
  value instanceof Date ? toDatabaseDate(value) : value;

const toEventLine = (row: Row, siteUuid: string, type: string): string => {
  const payload = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, serializeValue(value)]),
  );
  return JSON.stringify({
    type,
    site_uuid: siteUuid,
    id: row.id,
    updated_at: toDatabaseDate(row.updated_at),
    payload: { ...payload, site_uuid: siteUuid },
  });
};

export function chunkByBytes(lines: string[], maxBytes: number): string[][] {
  const chunks: string[][] = [];
  let current: string[] = [];
  let currentBytes = 0;

  for (const line of lines) {
    const bytes = Buffer.byteLength(line) + '\n'.length;
    if (current.length && currentBytes + bytes > maxBytes) {
      chunks.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(line);
    currentBytes += bytes;
  }

  if (current.length) {
    chunks.push(current);
  }

  return chunks;
}

async function postEvents(
  lines: string[],
  { datasource }: TinybirdSyncTarget,
  { requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS }: TinybirdSyncOptions,
): Promise<void> {
  // wait=true makes Tinybird acknowledge only once the rows are committed.
  const url = `http://traffic-analytics-local:3000/api/v1/automations`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-ndjson',
    },
    body: lines.join('\n'),
    signal: AbortSignal.timeout(requestTimeoutMs),
  });

  if (!response.ok) {
    throw new errors.InternalServerError({
      message: `Tinybird Events API returned ${response.status} for ${datasource}: ${await response.text()}`,
    });
  }

  const body: { quarantined_rows?: unknown } = await response.json().catch(() => ({}));
  if (typeof body.quarantined_rows === 'number' && body.quarantined_rows > 0) {
    throw new errors.InternalServerError({
      message: `Tinybird quarantined ${body.quarantined_rows} ${datasource} rows`,
    });
  }
}

async function readWatermark(knex: Knex, table: string): Promise<string | null> {
  const row = await knex('tinybird_syncs')
    .select('last_synced_updated_at')
    .where({ table_name: table })
    .first();
  return row ? toDatabaseDate(row.last_synced_updated_at) : null;
}

async function writeWatermark(knex: Knex, table: string, value: string): Promise<void> {
  const now = toDatabaseDate(new Date());
  const updated = await knex('tinybird_syncs')
    .where({ table_name: table })
    .update({ last_synced_updated_at: value, updated_at: now });
  if (!updated) {
    await knex('tinybird_syncs').insert({
      id: ObjectId().toHexString(),
      table_name: table,
      last_synced_updated_at: value,
      created_at: now,
      updated_at: now,
    });
  }
}

async function readBatch(
  { table, columns }: TinybirdSyncTarget,
  { knex, batchSize = DEFAULT_BATCH_SIZE }: TinybirdSyncOptions,
  cursor: Cursor | null,
  cutoff: string,
): Promise<Row[]> {
  const query = knex(table)
    .select(columns)
    .where('updated_at', '<', cutoff)
    .orderBy([{ column: 'updated_at' }, { column: 'id' }])
    .limit(batchSize);

  if (cursor) {
    query.andWhere((builder) =>
      builder
        .where('updated_at', '>', cursor.updatedAt)
        .orWhere((tie) => tie.where('updated_at', cursor.updatedAt).andWhere('id', '>', cursor.id)),
    );
  }

  return await query;
}

export async function syncTableToTinybird(
  target: TinybirdSyncTarget,
  options: TinybirdSyncOptions,
): Promise<number> {
  const {
    knex,
    siteUuid,
    now = () => new Date(),
    batchSize = DEFAULT_BATCH_SIZE,
    maxPayloadBytes = DEFAULT_MAX_PAYLOAD_BYTES,
  } = options;
  const cutoff = toDatabaseDate(new Date(now().getTime() - SAFETY_LAG_MS));
  const watermark = await readWatermark(knex, target.table);
  // The empty id makes the first page inclusive of the watermark second, so rows that
  // landed in that second after the previous run are re-sent rather than skipped.
  let cursor: Cursor | null = watermark ? { updatedAt: watermark, id: '' } : null;
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
    cursor = { updatedAt: toDatabaseDate(last.updated_at), id: last.id };
    await writeWatermark(knex, target.table, cursor.updatedAt);
    sent += rows.length;

    if (rows.length < batchSize) {
      return sent;
    }
  }
}
