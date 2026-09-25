import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import createKnex, { type Knex } from 'knex';
import { vi } from 'vitest';
import {
  countCursorScope,
  decodeCountCursor,
  encodeCountCursor,
  readMemberSearchCounts,
  type CountCursor,
} from '../../../../../core/server/services/automations/automation-member-search-counts';
import type { TinybirdClient } from '../../../../../core/server/services/automations/tinybird-automation-stats';
import { probeMemberSearch } from '../../../../../core/server/services/automations/automation-member-search';
const id = (n: number) => n.toString(16).padStart(24, '0');
const secret = 'test-count-signing-key-'.repeat(3);
const scope = countCursorScope(id(1), 'site-a', 'anna');
const zero = {
  in_progress_run_count: 0,
  completed_run_count: 0,
  exited_early_run_count: 0,
  unclassified_run_count: 0,
};
const now = Date.UTC(2026, 8, 16);
const state: CountCursor = {
  scope,
  after: id(10),
  upper: id(99),
  counts: { ...zero, completed_run_count: 10 },
  expires: now + 900000,
};

describe('Authenticated count continuation', () => {
  it('roundtrips across instances using the same site secret without raw query text', () => {
    const token = encodeCountCursor(state, secret);
    assert.deepEqual(decodeCountCursor(token, scope, secret, now), state);
    assert.ok(!Buffer.from(token.split('.')[0], 'base64url').toString().includes('anna'));
  });
  it.each(['after', 'upper', 'counts', 'expires', 'scope'])(
    'rejects a tampered %s without a valid signature',
    (field) => {
      const token = encodeCountCursor(state, secret);
      const [payload, signature] = token.split('.');
      const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
      data[field] = null;
      assert.throws(() =>
        decodeCountCursor(
          `${Buffer.from(JSON.stringify(data)).toString('base64url')}.${signature}`,
          scope,
          secret,
          now,
        ),
      );
    },
  );
  it.each([
    { date_from: '2026-09-01', date_to: '2026-10-01', timezone: 'UTC' },
    { site: 'site-b' },
    { automation_id: id(2) },
    { query: 'f'.repeat(64) },
    { kind: 'list' },
    { matching: 'prefix' },
    { version: 2 },
  ])('rejects changed scope', (change) => {
    const modified = { ...state, scope: { ...scope, ...change } } as CountCursor;
    assert.throws(() => decodeCountCursor(encodeCountCursor(modified, secret), scope, secret, now));
  });
  it('expires at the original deadline and invalidates after secret rotation', () => {
    const token = encodeCountCursor(state, secret);
    assert.throws(() => decodeCountCursor(token, scope, secret, state.expires), {
      code: 'AUTOMATION_COUNT_CURSOR_EXPIRED',
    });
    assert.throws(() => decodeCountCursor(token, scope, secret + 'rotated', now));
  });
  it.each([null, {}, '', 'a'.repeat(4097), 'unsigned'])('rejects malformed tokens', (value) =>
    assert.throws(() => decodeCountCursor(value, scope, secret, now)),
  );
  it.each([
    { after: id(100) },
    { counts: { ...zero, completed_run_count: -1 } },
    { counts: { ...zero, completed_run_count: Number.MAX_SAFE_INTEGER, in_progress_run_count: 1 } },
    { expires: 1.5 },
    { extra: true },
  ])('rejects signed but invalid data', (change) => {
    const payload = Buffer.from(JSON.stringify({ ...state, ...change })).toString('base64url');
    const key = createHmac('sha256', secret).update('ghost:automation-member-counts:v1').digest();
    const token = `${payload}.${createHmac('sha256', key).update(payload).digest('base64url')}`;
    assert.throws(() => decodeCountCursor(token, scope, secret, now));
  });
  it('requires a persisted signing secret', () =>
    assert.throws(() => encodeCountCursor(state, '')));
});

describe('Complete count traversal', () => {
  let db: Knex;
  beforeEach(async () => {
    db = createKnex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await db.schema.createTable('members', (t) => {
      t.string('id').primary();
      t.string('name');
      t.string('email');
    });
    await db.schema.createTable('automation_runs', (t) => {
      t.string('id').primary();
      t.string('automation_id');
      t.string('member_id');
      t.dateTime('created_at').defaultTo('2026-09-01 12:00:00');
    });
    await db('members').insert({ id: id(1), name: 'Joanna', email: 'current@example.test' });
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await db.destroy();
  });
  async function seed(start: number, count: number, owner = id(1), member: string | null = id(1)) {
    for (let i = 0; i < count; i += 100) {
      await db('automation_runs').insert(
        Array.from({ length: Math.min(100, count - i) }, (_, j) => ({
          id: id(start + i + j),
          automation_id: owner,
          member_id: member,
        })),
      );
    }
  }
  function client() {
    return {
      fetch: vi.fn<TinybirdClient['fetch']>(async (_, options) => {
        const counts = { ...zero };
        const ids = options.runIds?.split(',').filter(Boolean) ?? [];
        for (const run of ids) {
          const key = (Object.keys(counts) as (keyof typeof counts)[])[parseInt(run, 16) % 4];
          counts[key] += 1;
        }
        return [counts];
      }),
    };
  }
  it('returns only each response’s buckets while keeping exact cumulative counts and small cursors', async () => {
    await seed(1, 121000);
    const chartScope = countCursorScope(id(1), 'site-a', 'anna', {}, 'America/New_York');
    const tb: TinybirdClient = {
      fetch: async (_, options) => {
        assert.equal(options.timezone, 'America/New_York');
        assert.equal(options.includeEntries, 'true');
        const size = options.runIds?.split(',').filter(Boolean).length ?? 0;
        return [
          { ...zero, completed_run_count: size, entries: size ? [['2026-09-01', size]] : [] },
        ];
      },
    };
    const first = await readMemberSearchCounts(db, tb, chartScope, 'anna', secret);
    assert.deepEqual(first.data, []);
    assert.deepEqual(first.meta.entry_buckets?.entries, [{ date: '2026-09-01', count: 120000 }]);
    const token = first.meta.pagination.next_cursor!;
    assert.ok(token.length < 1000);
    const cursor = decodeCountCursor(token, chartScope, secret);
    assert.throws(() =>
      decodeCountCursor(token, countCursorScope(id(1), 'site-a', 'anna', {}, 'UTC'), secret),
    );
    assert.throws(() => decodeCountCursor(token, scope, secret));
    const next = await readMemberSearchCounts(db, tb, chartScope, 'anna', secret, cursor);
    assert.deepEqual(next.meta.entry_buckets?.entries, [{ date: '2026-09-01', count: 1000 }]);
    assert.equal(next.data[0].completed_run_count, 121000);
    assert.deepEqual(
      await readMemberSearchCounts(db, tb, chartScope, 'anna', secret, cursor),
      next,
    );
  });
  it.each([
    undefined,
    [['2026-09-01', 2]],
    [
      ['2026-09-01', 0],
      ['2026-09-01', 1],
    ],
    [['2026-08-31', 1]],
  ])(
    'rejects unsupported, inconsistent, duplicate or out-of-range chart buckets',
    async (entries) => {
      await seed(1, 1);
      const chartScope = countCursorScope(
        id(1),
        'site-a',
        'anna',
        { date_from: '2026-09-01', date_to: '2026-09-02', timezone: 'UTC' },
        'UTC',
      );
      await assert.rejects(() =>
        readMemberSearchCounts(
          db,
          { fetch: async () => [{ ...zero, completed_run_count: 1, entries }] },
          chartScope,
          'anna',
          secret,
        ),
      );
    },
  );
  it('counts >50 repeat entries across all four statuses, excluding missing members and other automations', async () => {
    await seed(1, 120);
    await seed(121, 10, id(2));
    await seed(131, 10, id(1), null);
    const result = await readMemberSearchCounts(db, client(), scope, 'anna', secret);
    assert.deepEqual(result.data, [
      {
        automation_id: id(1),
        in_progress_run_count: 30,
        completed_run_count: 30,
        exited_early_run_count: 30,
        unclassified_run_count: 30,
      },
    ]);
    assert.equal(result.meta.pagination.next_cursor, null);
  });
  it.each([
    {
      from: '2026-03-08',
      to: '2026-03-09',
      start: '2026-03-08 05:00:00',
      end: '2026-03-09 04:00:00',
    },
    {
      from: '2026-11-01',
      to: '2026-11-02',
      start: '2026-11-01 04:00:00',
      end: '2026-11-02 05:00:00',
    },
  ])(
    'filters SQL candidates at local midnight across DST: $from',
    async ({ from, to, start, end }) => {
      await seed(1, 4);
      const before = new Date(start.replace(' ', 'T') + 'Z');
      before.setUTCMilliseconds(-1);
      const last = new Date(end.replace(' ', 'T') + 'Z');
      last.setUTCMilliseconds(-1);
      for (const [i, date] of [
        before.toISOString().replace('T', ' ').replace('Z', ''),
        start,
        last.toISOString().replace('T', ' ').replace('Z', ''),
        end,
      ].entries()) {
        await db('automation_runs')
          .where('id', id(i + 1))
          .update({ created_at: date });
      }
      const dated = countCursorScope(id(1), 'site-a', 'anna', {
        date_from: from,
        date_to: to,
        timezone: 'America/New_York',
      });
      const tb = client();
      const result = await readMemberSearchCounts(db, tb, dated, 'anna', secret);
      assert.equal(tb.fetch.mock.calls.length, 1);
      assert.equal(tb.fetch.mock.calls[0][1].runIds, [id(2), id(3)].join(','));
      assert.deepEqual(result.data, [
        { automation_id: id(1), ...zero, exited_early_run_count: 1, unclassified_run_count: 1 },
      ]);
    },
  );
  it('keeps date bounds through continuation and retries without scanning outside the cohort', async () => {
    await seed(1, 121001);
    await db('automation_runs')
      .where('id', id(121001))
      .update({ created_at: '2026-10-01 00:00:00' });
    const dated = countCursorScope(id(1), 'site-a', 'anna', {
      date_from: '2026-09-01',
      date_to: '2026-10-01',
      timezone: 'UTC',
    });
    const tb = client();
    const first = await readMemberSearchCounts(db, tb, dated, 'anna', secret);
    const cursor = decodeCountCursor(first.meta.pagination.next_cursor, dated, secret);
    assert.equal(cursor.upper, id(121000));
    assert.equal(cursor.after, id(120000));
    const next = await readMemberSearchCounts(db, tb, dated, 'anna', secret, cursor);
    const retry = await readMemberSearchCounts(db, tb, dated, 'anna', secret, cursor);
    assert.deepEqual(next, retry);
    assert.equal(next.meta.pagination.state, 'exhausted');
    assert.deepEqual(next.data, [
      {
        automation_id: id(1),
        in_progress_run_count: 30250,
        completed_run_count: 30250,
        exited_early_run_count: 30250,
        unclassified_run_count: 30250,
      },
    ]);
    assert.ok(
      tb.fetch.mock.calls.every(([, options]) => !options.runIds?.split(',').includes(id(121001))),
    );
  });
  it('withholds partial totals, continues after the last consumed ID and retries without double counting', async () => {
    await seed(1, 121000);
    const tb = client();
    const first = await readMemberSearchCounts(db, tb, scope, 'anna', secret);
    assert.deepEqual(first.data, []);
    assert.equal(first.meta.pagination.state, 'scanning');
    const token = first.meta.pagination.next_cursor;
    const cursor = decodeCountCursor(token, scope, secret);
    assert.equal(cursor.after, id(120000));
    assert.equal(cursor.upper, id(121000));
    assert.equal(tb.fetch.mock.calls.length, 4);
    await assert.rejects(
      () => readMemberSearchCounts(db, { fetch: async () => null }, scope, 'anna', secret, cursor),
      { code: 'AUTOMATION_SEARCH_COUNTS_UNAVAILABLE' },
    );
    const next = await readMemberSearchCounts(db, tb, scope, 'anna', secret, cursor);
    assert.equal(tb.fetch.mock.calls.length, 5);
    assert.ok(tb.fetch.mock.calls.every(([, options]) => options.runIds));
    const retry = await readMemberSearchCounts(
      db,
      tb,
      scope,
      'anna',
      secret,
      decodeCountCursor(token, scope, secret),
    );
    assert.deepEqual(next, retry);
    assert.equal(next.meta.pagination.state, 'exhausted');
    assert.deepEqual(next.data[0], {
      automation_id: id(1),
      in_progress_run_count: 30250,
      completed_run_count: 30250,
      exited_early_run_count: 30250,
      unclassified_run_count: 30250,
    });
  });
  it('keeps the upper fence and original expiry while later members change', async () => {
    await seed(1, 31000);
    const tb = client();
    vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValue(1501);
    const first = await readMemberSearchCounts(db, tb, scope, 'anna', secret);
    const cursor = decodeCountCursor(first.meta.pagination.next_cursor, scope, secret);
    await seed(31001, 10);
    await db('automation_runs').where('id', id(30001)).update({ member_id: null });
    const next = await readMemberSearchCounts(db, tb, scope, 'anna', secret, cursor);
    assert.equal(next.meta.pagination.state, 'exhausted');
    assert.equal(
      Object.values(next.data[0])
        .filter((v) => typeof v === 'number')
        .reduce((a, b) => a + Number(b), 0),
      30999,
    );
    assert.equal(cursor.upper, id(31000));
  });
  it('returns scanning progress through empty windows and zero only when exhausted', async () => {
    await seed(1, 121000, id(1), null);
    await assert.rejects(
      () => readMemberSearchCounts(db, { fetch: async () => null }, scope, 'anna', secret),
      { code: 'AUTOMATION_SEARCH_COUNTS_UNAVAILABLE' },
    );
    const tb = client();
    const first = await readMemberSearchCounts(db, tb, scope, 'anna', secret);
    assert.deepEqual(first.data, []);
    assert.equal(tb.fetch.mock.calls.length, 1);
    const next = await readMemberSearchCounts(
      db,
      tb,
      scope,
      'anna',
      secret,
      decodeCountCursor(first.meta.pagination.next_cursor, scope, secret),
    );
    assert.deepEqual(next.data, [{ automation_id: id(1), ...zero }]);
    assert.equal(tb.fetch.mock.calls.length, 1);
  });
  it('requires count capability even for empty history', async () => {
    await assert.rejects(() =>
      readMemberSearchCounts(db, { fetch: async () => null }, scope, 'anna', secret),
    );
  });
  it.each(
    [
      [],
      null,
      [{ ...zero, completed_run_count: 1 }],
      [{ ...zero, in_progress_run_count: -1 }],
      [{ ...zero, completed_run_count: '1.2' }],
    ].map((response) => ({ response })),
  )('rejects malformed/impossible aggregates', async ({ response }) => {
    await assert.rejects(() =>
      readMemberSearchCounts(db, { fetch: async () => response }, scope, 'anna', secret),
    );
  });
  it('discards partial work after an aggregate error and permits retry from the input', async () => {
    await seed(1, 31000);
    const tb = client();
    let calls = 0;
    const failing: TinybirdClient = {
      fetch: async (...args) => {
        calls += 1;
        return calls === 2 ? null : tb.fetch(...args);
      },
    };
    await assert.rejects(() => readMemberSearchCounts(db, failing, scope, 'anna', secret));
    const result = await readMemberSearchCounts(db, tb, scope, 'anna', secret);
    assert.equal(result.data[0].completed_run_count, 7750);
  });
  it('waits for each full 30,000-ID POST before starting another batch', async () => {
    await seed(1, 30004);
    const tb = client();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    const sequential: TinybirdClient = {
      fetch: async (...args) => {
        calls += 1;
        if (calls === 1) {
          assert.equal(args[1].runIds!.split(',').length, 30000);
          assert.equal(args[1].runIds!.length, 749999);
          assert.equal(args[2]?.method, 'POST');
          await gate;
        }
        return tb.fetch(...args);
      },
    };
    const reading = readMemberSearchCounts(db, sequential, scope, 'anna', secret);
    try {
      await vi.waitFor(() => assert.equal(calls, 1));
      assert.equal(tb.fetch.mock.calls.length, 0);
    } finally {
      release();
    }
    const result = await reading;
    assert.equal(calls, 2);
    assert.deepEqual(result.data, [
      {
        automation_id: id(1),
        in_progress_run_count: 7501,
        completed_run_count: 7501,
        exited_early_run_count: 7501,
        unclassified_run_count: 7501,
      },
    ]);
  });
  it.each(['rate limited', 'request timed out'])(
    'stops after %s and allows retry without partial progress',
    async (message) => {
      await seed(1, 30004);
      const tb = client();
      const failing = {
        fetch: vi.fn(async () => {
          throw new Error(message);
        }),
      };
      await assert.rejects(() => readMemberSearchCounts(db, failing, scope, 'anna', secret), {
        message,
      });
      assert.equal(failing.fetch.mock.calls.length, 1);
      const retry = await readMemberSearchCounts(db, tb, scope, 'anna', secret);
      assert.equal(retry.meta.pagination.state, 'exhausted');
      assert.equal(retry.data[0].completed_run_count, 7501);
    },
  );
});

describe('MySQL count window access path', () => {
  it('applies UTC date bounds to the shared member search probe', async () => {
    const db = createKnex({ client: 'mysql2' });
    const queries: { sql: string; bindings: unknown[] }[] = [];
    vi.spyOn(db.client, 'acquireConnection').mockResolvedValue({});
    vi.spyOn(db.client, 'releaseConnection').mockResolvedValue(undefined);
    vi.spyOn(db.client, 'query').mockImplementation(async (_connection, value) => {
      const query = value as { sql: string; bindings: unknown[] };
      queries.push(query);
      return { ...query, response: [[{ id: id(2) }], []] };
    });
    try {
      const ids = await probeMemberSearch(db, id(1), 'anna', {
        date_from: '2026-03-08',
        date_to: '2026-03-09',
        timezone: 'America/New_York',
      });
      assert.deepEqual(ids, [id(2)]);
      assert.match(queries[0].sql, /`runs`.`created_at` >= \? and `runs`.`created_at` < \?/);
      assert.deepEqual(queries[0].bindings, [
        id(1),
        '2026-03-08 05:00:00',
        '2026-03-09 04:00:00',
        '%anna%',
        '%anna%',
        2001,
      ]);
    } finally {
      vi.restoreAllMocks();
      await db.destroy();
    }
  });
  it('matches the covering index order inside the bounded window without forcing a plan', async () => {
    const db = createKnex({ client: 'mysql2' });
    const queries: { sql: string; bindings: unknown[] }[] = [];
    vi.spyOn(db.client, 'acquireConnection').mockResolvedValue({});
    vi.spyOn(db.client, 'releaseConnection').mockResolvedValue(undefined);
    vi.spyOn(db.client, 'query').mockImplementation(async (_connection, value) => {
      const query = value as { sql: string; bindings: unknown[] };
      queries.push({ sql: query.sql, bindings: query.bindings });
      return { ...query, response: [[{ id: id(11), matched: 1 }], []] };
    });
    const tb: TinybirdClient = {
      fetch: async (_, options) => [{ ...zero, completed_run_count: options.runIds ? 1 : 0 }],
    };
    try {
      const result = await readMemberSearchCounts(db, tb, scope, 'anna', secret, state);
      assert.equal(queries.length, 1);
      assert.doesNotMatch(queries[0].sql, /FORCE INDEX|USE INDEX|IGNORE INDEX/i);
      assert.match(
        queries[0].sql,
        /order by `automation_id` asc, `id` asc, `member_id` asc limit \?\) as `runs` left join `members`/,
      );
      assert.deepEqual(queries[0].bindings, ['%anna%', '%anna%', id(1), id(10), id(99), 30001]);
      assert.equal(result.meta.pagination.state, 'exhausted');
      assert.equal(result.data[0].completed_run_count, 11);
    } finally {
      vi.restoreAllMocks();
      await db.destroy();
    }
  });
});
