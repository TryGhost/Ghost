import assert from 'node:assert/strict';
import createKnex, { type Knex } from 'knex';
import { vi } from 'vitest';
import {
  countCursorScope,
  decodeCountCursor,
  readMemberSearchCounts,
  type CountCursor,
  COUNT_LIMITS,
} from '../../../../core/server/services/automations/automation-member-search-counts';
import type { TinybirdClient } from '../../../../core/server/services/automations/tinybird-automation-stats';
import type { EntryStatsWindow } from '../../../../core/server/services/automations/automation-entry-stats';

const id = (n: number) => n.toString(16).padStart(24, '0');
const secret = 'test-count-signing-key-'.repeat(3);
const scope = countCursorScope(id(1), 'site-a', 'anna', {
  date_from: null,
  date_to: null,
  timezone: 'UTC',
});
const window: EntryStatsWindow = {
  date_from: '2026-09-01',
  date_to: '2026-09-03',
  timezone: 'UTC',
  bucket: 'day',
};
const zero = { in_progress_run_count: 0, completed_run_count: 0, exited_early_run_count: 0 };
describe('Bounded search-stat traversal', () => {
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
  async function seed(count: number, start = 1, owner = id(1), member: string | null = id(1)) {
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
          const key = (Object.keys(counts) as (keyof typeof counts)[])[parseInt(run, 16) % 3];
          counts[key] += 1;
        }
        return [
          {
            ...counts,
            invalid_run_count: 0,
            entries: ids.length ? [['2026-09-01', ids.length]] : [],
          },
        ];
      }),
    };
  }
  const read = (tb: TinybirdClient, continuation?: CountCursor) =>
    readMemberSearchCounts(db, tb, scope, 'anna', secret, window, continuation);

  it('counts repeated entries across all statuses, excluding deleted members and other automations', async () => {
    await seed(120);
    await seed(10, 121, id(2));
    await seed(10, 131, id(1), null);
    const result = await read(client());
    assert.deepEqual(result.data, [
      {
        automation_id: id(1),
        in_progress_run_count: 40,
        completed_run_count: 40,
        exited_early_run_count: 40,
        total_run_count: 120,
      },
    ]);
    assert.deepEqual(result.meta.entry_buckets, [{ date: '2026-09-01', count: 120 }]);
    assert.equal(result.meta.pagination.next_cursor, null);
  });
  it('withholds partial totals, emits page-local buckets, and retries without double counting', async () => {
    await seed(COUNT_LIMITS.batch + 3);
    vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValue(1501);
    const tb = client();
    const first = await read(tb);
    assert.deepEqual(first.data, []);
    assert.equal(first.meta.pagination.state, 'scanning');
    assert.deepEqual(first.meta.entry_buckets, [{ date: '2026-09-01', count: COUNT_LIMITS.batch }]);
    const token = first.meta.pagination.next_cursor!;
    const cursor = decodeCountCursor(token, scope, secret);
    assert.equal(cursor.after, id(COUNT_LIMITS.batch));
    assert.ok(token.length < 1500);
    await seed(1, COUNT_LIMITS.batch + 4); // Outside the original upper fence.
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 24 * 60 * 60 * 1000);
    assert.deepEqual(decodeCountCursor(token, scope, secret), cursor);
    const next = await read(tb, cursor);
    assert.equal(next.meta.pagination.state, 'exhausted');
    assert.equal(next.data[0].total_run_count, COUNT_LIMITS.batch + 3);
    assert.deepEqual(next.meta.entry_buckets, [{ date: '2026-09-01', count: 3 }]);
    assert.deepEqual(await read(tb, cursor), next);
    assert.equal(tb.fetch.mock.calls[0][2]?.method, 'POST');
  });
  it('returns scanning for empty windows and zero only after the traversal finishes', async () => {
    await seed(COUNT_LIMITS.batch * COUNT_LIMITS.batches + 1, 1, id(1), null);
    const tb = client();
    const first = await read(tb);
    assert.deepEqual(first.data, []);
    assert.equal(first.meta.pagination.state, 'scanning');
    const final = await read(
      tb,
      decodeCountCursor(first.meta.pagination.next_cursor, scope, secret),
    );
    assert.deepEqual(final.data, [{ automation_id: id(1), ...zero, total_run_count: 0 }]);
    assert.deepEqual(final.meta.entry_buckets, []);
    assert.equal(tb.fetch.mock.calls.length, 0);
  });
  it('discards progress after a later batch fails and permits retry from the same input', async () => {
    await seed(COUNT_LIMITS.batch + 1);
    const tb = client();
    let calls = 0;
    await assert.rejects(
      () =>
        read({
          fetch: async (...args) => {
            calls += 1;
            return calls === 2 ? null : tb.fetch(...args);
          },
        }),
      { code: 'AUTOMATION_SEARCH_COUNTS_UNAVAILABLE' },
    );
    assert.equal((await read(client())).data[0].total_run_count, COUNT_LIMITS.batch + 1);
  });
  it.each([
    { response: null },
    { response: [] },
    { response: [{ ...zero, invalid_run_count: 1, entries: [] }] },
    {
      response: [
        { ...zero, completed_run_count: 2, invalid_run_count: 0, entries: [['2026-09-01', 2]] },
      ],
    },
    { response: [{ ...zero, completed_run_count: 1, invalid_run_count: 0, entries: [] }] },
    {
      response: [
        { ...zero, completed_run_count: 1, invalid_run_count: 0, entries: [['2026-08-31', 1]] },
      ],
    },
    {
      response: [
        {
          ...zero,
          completed_run_count: 1,
          invalid_run_count: 0,
          entries: [
            ['2026-09-01', 1],
            ['2026-09-01', 0],
          ],
        },
      ],
    },
  ])('rejects failed, invalid, or inconsistent aggregates: %j', async ({ response }) => {
    await seed(1);
    await assert.rejects(() => read({ fetch: async () => response }), {
      code: 'AUTOMATION_SEARCH_COUNTS_UNAVAILABLE',
    });
  });
  it('keeps hourly timestamps intact across the repeated DST hour', async () => {
    await seed(2);
    await db('automation_runs').update({ created_at: '2024-11-03 05:30:00' });
    const hourly: EntryStatsWindow = {
      date_from: '2024-11-03',
      date_to: '2024-11-04',
      timezone: 'America/New_York',
      bucket: 'hour',
    };
    const dates = {
      date_from: hourly.date_from,
      date_to: hourly.date_to,
      timezone: hourly.timezone,
    };
    const tb: TinybirdClient = {
      fetch: async (_, options) => {
        assert.equal(options.hourly, true);
        assert.equal(options.timezone, hourly.timezone);
        return [
          {
            ...zero,
            completed_run_count: 2,
            invalid_run_count: 0,
            entries: [
              ['2024-11-03T05:00:00Z', 1],
              ['2024-11-03T06:00:00Z', 1],
            ],
          },
        ];
      },
    };
    const result = await readMemberSearchCounts(
      db,
      tb,
      countCursorScope(id(1), 'site-a', 'anna', dates),
      'anna',
      secret,
      hourly,
    );
    assert.equal(result.meta.entry_buckets.length, 2);
    assert.equal(result.data[0].total_run_count, 2);
  });
});
