import assert from 'node:assert/strict';
import createKnex, { type Knex } from 'knex';
import ObjectId from 'bson-objectid';
import nock from 'nock';
import { afterEach, beforeEach, describe, it } from 'vitest';
// @ts-expect-error This module lacks type definitions.
import externalRequest from '../../../../../core/server/lib/request-external';
// @ts-expect-error This module lacks type definitions.
import configUtils from '../../../../utils/config-utils';
import {
  AUTOMATION_SYNC_TARGETS,
  SAFETY_LAG_MS,
  syncTableToTinybird,
  type TinybirdSyncOptions,
} from '../../../../../core/server/services/tinybird-sync/sync-table-to-tinybird';
import { toDatabaseDate } from '../../../../../core/server/lib/db-types/date';

const SITE_UUID = 'bd05ceed-1df9-4af7-832a-d3b5faa7ca1d';
const TRAFFIC_ANALYTICS_AUTH = 'sync-secret';
const ENDPOINT = new URL('https://analytics.example.com/api/v1/tinybird-sync');
const NOW = new Date('2026-03-01T12:00:00.000Z');
const BATCH_SIZE = 5000;
const MAX_PAYLOAD_BYTES = 8 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 60 * 1000;
const TARGET = AUTOMATION_SYNC_TARGETS.find((target) => target.table === 'automation_runs')!;
const STEP_TARGET = AUTOMATION_SYNC_TARGETS.find(
  (target) => target.table === 'automation_run_steps',
)!;

type EventLine = {
  type: string;
  site_uuid: string;
  id: string;
  updated_at: string;
  payload: Record<string, unknown>;
};

type Request = {
  url: string;
  authorization: string | null;
  contentType: string | null;
  siteUuid: string | null;
  lines: EventLine[];
};

describe('syncTableToTinybird', () => {
  let knex: Knex;
  let requests: Request[];
  let responseStatus: number;
  let responseText: string;

  const createDatabase = async (): Promise<Knex> => {
    const database = createKnex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      pool: { min: 1, max: 1 },
      useNullAsDefault: true,
    });

    await database.schema.createTable('automation_runs', (table) => {
      table.text('id').primary();
      table.text('automation_id').notNullable();
      table.text('member_id');
      table.text('member_email').notNullable();
      table.text('created_at').notNullable();
      table.text('updated_at').notNullable();
    });
    await database.schema.createTable('automation_run_steps', (table) => {
      table.text('id').primary();
      table.text('automation_run_id').notNullable();
      table.text('automation_action_revision_id').notNullable();
      table.text('status').notNullable();
      table.integer('step_attempts').notNullable();
      table.text('ready_at').notNullable();
      table.text('started_at');
      table.text('finished_at');
      table.text('created_at').notNullable();
      table.text('updated_at').notNullable();
    });
    await database.schema.createTable('tinybird_syncs', (table) => {
      table.text('id').primary();
      table.text('table_name').notNullable().unique();
      table.text('last_synced_updated_at').notNullable();
      table.text('last_synced_id').notNullable();
      table.text('created_at').notNullable();
      table.text('updated_at');
    });

    return database;
  };

  const request: TinybirdSyncOptions['request'] = async (input, init) => {
    const headers = new Headers(init.headers as HeadersInit);
    requests.push({
      url: String(input),
      authorization: headers.get('authorization'),
      contentType: headers.get('content-type'),
      siteUuid: headers.get('x-site-uuid'),
      lines: String(init?.body)
        .split('\n')
        .map((line) => JSON.parse(line) as EventLine),
    });
    return { statusCode: responseStatus, body: responseText };
  };

  const insertRun = async (updatedAt: Date, overrides: Record<string, unknown> = {}) => {
    const id = ObjectId().toHexString();
    await knex('automation_runs').insert({
      id,
      automation_id: ObjectId().toHexString(),
      member_id: ObjectId().toHexString(),
      member_email: 'member@example.com',
      created_at: toDatabaseDate(updatedAt),
      updated_at: toDatabaseDate(updatedAt),
      ...overrides,
    });
    return id;
  };

  const minutesBeforeNow = (minutes: number) => new Date(NOW.getTime() - minutes * 60 * 1000);

  const sync = (options: Partial<Parameters<typeof syncTableToTinybird>[1]> = {}) =>
    syncTableToTinybird(TARGET, {
      knex,
      endpoint: ENDPOINT,
      trafficAnalyticsAuth: TRAFFIC_ANALYTICS_AUTH,
      siteUuid: SITE_UUID,
      now: () => NOW,
      request,
      createId: () => ObjectId().toHexString(),
      batchSize: BATCH_SIZE,
      maxPayloadBytes: MAX_PAYLOAD_BYTES,
      maxPayloadMessages: 1000,
      requestTimeoutMs: REQUEST_TIMEOUT_MS,
      ...options,
    });

  const receivedIds = () => requests.flatMap(({ lines }) => lines.map(({ id }) => id));

  const getWatermark = async () =>
    knex('tinybird_syncs').where({ table_name: TARGET.table }).first();

  beforeEach(async () => {
    knex = await createDatabase();
    requests = [];
    responseStatus = 202;
    responseText = '';
  });

  afterEach(async () => {
    await knex.destroy();
    nock.cleanAll();
    await configUtils.restore();
  });

  it('inherits the shared client user-agent for sync requests [NY-1641]', async () => {
    configUtils.set('url', ENDPOINT.origin);
    await insertRun(minutesBeforeNow(10));
    const scope = nock(ENDPOINT.origin)
      .post(ENDPOINT.pathname)
      .matchHeader('user-agent', 'Ghost(https://github.com/TryGhost/Ghost)')
      .matchHeader('authorization', `Bearer ${TRAFFIC_ANALYTICS_AUTH}`)
      .matchHeader('content-type', 'application/x-ndjson')
      .matchHeader('x-site-uuid', SITE_UUID)
      .reply(202);

    assert.equal(await sync({ request: externalRequest }), 1);
    scope.done();
    assert.ok(await getWatermark());
  });

  it('preserves HTTP error details and the watermark with the shared client', async () => {
    configUtils.set('url', ENDPOINT.origin);
    await insertRun(minutesBeforeNow(10));
    const scope = nock(ENDPOINT.origin).post(ENDPOINT.pathname).reply(406, 'blocked');

    await assert.rejects(
      sync({ request: externalRequest }),
      /Traffic Analytics returned 406 while syncing automation_runs: blocked/,
    );
    scope.done();
    assert.equal(await getWatermark(), undefined);
  });

  it('aborts a slow shared-client request without advancing the watermark', async () => {
    configUtils.set('url', ENDPOINT.origin);
    await insertRun(minutesBeforeNow(10));
    nock(ENDPOINT.origin).post(ENDPOINT.pathname).delay(200).reply(202);

    await assert.rejects(sync({ request: externalRequest, requestTimeoutMs: 20 }), {
      name: 'TimeoutError',
    });
    assert.equal(await getWatermark(), undefined);
  });

  it.each([
    [302, 'GET'],
    [307, 'POST'],
  ] as const)('preserves the request method behavior for %s redirects', async (status, method) => {
    configUtils.set('url', ENDPOINT.origin);
    await insertRun(minutesBeforeNow(10));
    const scope = nock(ENDPOINT.origin)
      .post(ENDPOINT.pathname)
      .reply(status, '', { location: '/redirected' })
      .intercept('/redirected', method)
      .reply(202);

    assert.equal(await sync({ request: externalRequest }), 1);
    scope.done();
  });

  it('sends allowlisted rows to Traffic Analytics as authenticated NDJSON', async () => {
    const updatedAt = minutesBeforeNow(10);
    const id = await insertRun(updatedAt, { automation_id: 'automation-id' });

    assert.equal(await sync(), 1);

    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, 'https://analytics.example.com/api/v1/tinybird-sync');
    assert.equal(requests[0].authorization, `Bearer ${TRAFFIC_ANALYTICS_AUTH}`);
    assert.equal(requests[0].contentType, 'application/x-ndjson');
    assert.equal(requests[0].siteUuid, SITE_UUID);
    assert.deepEqual(requests[0].lines, [
      {
        type: 'automation_runs',
        site_uuid: SITE_UUID,
        id,
        updated_at: updatedAt.toISOString(),
        payload: {
          id,
          automation_id: 'automation-id',
          created_at: updatedAt.toISOString(),
          updated_at: updatedAt.toISOString(),
          site_uuid: SITE_UUID,
        },
      },
    ]);
    assert.ok(!('member_id' in requests[0].lines[0].payload));
    assert.ok(!('member_email' in requests[0].lines[0].payload));
  });

  it('serializes automation run step dates and nullable dates', async () => {
    const updatedAt = minutesBeforeNow(10);
    const readyAt = minutesBeforeNow(9);
    const id = ObjectId().toHexString();
    await knex('automation_run_steps').insert({
      id,
      automation_run_id: ObjectId().toHexString(),
      automation_action_revision_id: ObjectId().toHexString(),
      status: 'pending',
      step_attempts: 0,
      ready_at: toDatabaseDate(readyAt),
      started_at: null,
      finished_at: null,
      created_at: toDatabaseDate(updatedAt),
      updated_at: toDatabaseDate(updatedAt),
    });

    await syncTableToTinybird(STEP_TARGET, {
      knex,
      endpoint: ENDPOINT,
      trafficAnalyticsAuth: TRAFFIC_ANALYTICS_AUTH,
      siteUuid: SITE_UUID,
      now: () => NOW,
      request,
      createId: () => ObjectId().toHexString(),
      batchSize: BATCH_SIZE,
      maxPayloadBytes: MAX_PAYLOAD_BYTES,
      maxPayloadMessages: 1000,
      requestTimeoutMs: REQUEST_TIMEOUT_MS,
    });

    const event = requests[0].lines[0];
    assert.equal(event.type, 'automation_run_steps');
    assert.equal(event.payload.ready_at, readyAt.toISOString());
    assert.equal(event.payload.started_at, null);
    assert.equal(event.payload.finished_at, null);
  });

  it('uses updated_at and id as a stable cursor across batches and later runs', async () => {
    await insertRun(minutesBeforeNow(20), { id: 'run-a' });
    await insertRun(minutesBeforeNow(20), { id: 'run-b' });
    assert.equal(await sync({ batchSize: 1 }), 2);
    assert.deepEqual(receivedIds(), ['run-a', 'run-b']);

    requests = [];
    await insertRun(minutesBeforeNow(20), { id: 'run-c' });
    assert.equal(await sync(), 1);
    assert.deepEqual(receivedIds(), ['run-c']);
  });

  it('holds back rows inside safety lag', async () => {
    const oldId = await insertRun(new Date(NOW.getTime() - SAFETY_LAG_MS - 1));
    await insertRun(new Date(NOW.getTime() - SAFETY_LAG_MS + 1));

    await sync();

    assert.deepEqual(receivedIds(), [oldId]);
  });

  it('splits requests by UTF-8 payload size without splitting events', async () => {
    const twoByteCharacters = 'ü'.repeat(1000);
    for (let index = 0; index < 3; index += 1) {
      await insertRun(minutesBeforeNow(10), {
        id: `run-${index}`,
        automation_id: twoByteCharacters,
      });
    }

    await sync({ maxPayloadBytes: 5000 });

    assert.deepEqual(
      requests.map(({ lines }) => lines.length),
      [2, 1],
    );
    assert.ok(
      requests.every(({ lines }) =>
        lines.every(({ payload }) => payload.automation_id === twoByteCharacters),
      ),
    );
  });

  it('splits requests by maximum message count without splitting events', async () => {
    for (let index = 0; index < 5; index += 1) {
      await insertRun(minutesBeforeNow(10), { id: `run-${index}` });
    }

    await sync({ maxPayloadMessages: 2 });

    assert.deepEqual(
      requests.map(({ lines }) => lines.length),
      [2, 2, 1],
    );
  });

  it('writes injected watermark metadata only after successful delivery', async () => {
    const id = await insertRun(minutesBeforeNow(10));
    await sync({ createId: () => 'watermark-id' });

    assert.deepEqual(await getWatermark(), {
      id: 'watermark-id',
      table_name: TARGET.table,
      last_synced_updated_at: '2026-03-01 11:50:00',
      last_synced_id: id,
      created_at: '2026-03-01 12:00:00',
      updated_at: '2026-03-01 12:00:00',
    });

    responseStatus = 503;
    responseText = 'service unavailable';
    await insertRun(minutesBeforeNow(5));
    await assert.rejects(
      sync(),
      /Traffic Analytics returned 503 while syncing automation_runs: service unavailable/,
    );
    assert.equal((await getWatermark()).last_synced_id, id);
  });
});
