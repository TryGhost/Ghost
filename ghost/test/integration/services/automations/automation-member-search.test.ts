import { createDatabaseAutomationsRepository } from '../../../../core/server/services/automations/database-automations-repository';
import { decodeRunCursor } from '../../../../core/server/services/automations/automation-run-cursor';
import assert from 'node:assert/strict';
import createKnex, { type Knex } from 'knex';
import { vi } from 'vitest';
import {
  browseMemberSearch,
  searchCursorScope,
} from '../../../../core/server/services/automations/automation-member-search';
import {
  type AutomationRunRow,
  type TinybirdClient,
} from '../../../../core/server/services/automations/tinybird-automation-stats';
const id = (n: number) => n.toString(16).padStart(24, '0');
const time = '2026-01-01T00:00:00.000Z';
const scope = searchCursorScope(
  {
    automation_id: id(1),
    status: null,
    direction: 'asc',
    date_from: null,
    date_to: null,
    timezone: 'UTC',
  },
  'site-a',
  'anna',
);
const row = (n: number): AutomationRunRow => ({
  id: id(n),
  created_at: time,
  status: 'completed',
  failed: false,
});

describe('Bounded search traversal with SQLite', () => {
  let db: Knex;
  let repository: ReturnType<typeof createDatabaseAutomationsRepository>;
  beforeEach(async () => {
    vi.spyOn(performance, 'now').mockReturnValue(0);
    db = createKnex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    repository = createDatabaseAutomationsRepository({ knex: db, fakeWaitHoursMultiplier: null });
    await db.schema.createTable('members', (t) => {
      t.string('id').primary();
      t.string('name');
      t.string('email');
    });
    await db.schema.createTable('automation_runs', (t) => {
      t.string('id').primary();
      t.string('automation_id');
      t.string('member_id');
    });
    await db('members').insert({ id: id(1), name: 'Joanna', email: 'current@example.test' });
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await db.destroy();
  });
  async function seed(ids: number[], automationId = id(1), memberId: string | null = id(1)) {
    for (let i = 0; i < ids.length; i += 100) {
      await db('automation_runs').insert(
        ids
          .slice(i, i + 100)
          .map((n) => ({ id: id(n), automation_id: automationId, member_id: memberId })),
      );
    }
  }
  function client(rows: (Omit<AutomationRunRow, 'status'> & { status: string })[]) {
    return {
      fetch: vi.fn<TinybirdClient['fetch']>(async (_, options) => {
        // All fixtures share an entry timestamp; IDs determine their order.
        const ordered = [...rows].sort((a, b) => a.id.localeCompare(b.id));
        if (options.sortDirection === 'desc') {
          ordered.reverse();
        }
        const start = options.afterId
          ? ordered.findIndex((candidate) => candidate.id === options.afterId) + 1
          : 0;
        return ordered.slice(start, start + options.limit!);
      }),
    };
  }
  it.each(['asc', 'desc'] as const)(
    'traverses repeat entries in %s order with ties and missing members',
    async (direction) => {
      await seed(Array.from({ length: 123 }, (_, i) => i + 1));
      await seed([125], id(2));
      await seed([126], id(1), null);
      const tb = client(Array.from({ length: 128 }, (_, i) => row(i + 1)));
      const s = { ...scope, direction };
      let after;
      const ids: string[] = [];
      for (let i = 0; i < 5; i++) {
        const r = await browseMemberSearch(repository, tb, s, 'anna', after);
        ids.push(...r.data.map((item) => item.id));
        assert.ok(r.data.length <= 50);
        if (!r.meta.pagination.next_cursor) {
          assert.equal(r.meta.pagination.state, 'exhausted');
          break;
        }
        assert.equal(r.meta.pagination.state, 'more');
        after = decodeRunCursor(r.meta.pagination.next_cursor, s).position;
      }
      assert.deepEqual(
        ids,
        Array.from({ length: 123 }, (_, i) => id(direction === 'asc' ? i + 1 : 123 - i)),
      );
    },
  );
  it('skips invalid histories for nonmatching members but rejects a matching invalid history', async () => {
    await seed([2]);
    const tb = client([{ ...row(1), status: 'invalid' }, row(2)]);
    const result = await browseMemberSearch(repository, tb, scope, 'anna');
    assert.deepEqual(
      result.data.map((run) => run.id),
      [id(2)],
    );
    await seed([1]);
    await assert.rejects(() => browseMemberSearch(repository, tb, scope, 'anna'), {
      code: 'AUTOMATION_MEMBER_SEARCH_UNAVAILABLE',
    });
  });
  it('crosses candidate batches without skipping unreturned matches', async () => {
    await seed(Array.from({ length: 60 }, (_, i) => i + 5001));
    const tb = client(Array.from({ length: 5100 }, (_, i) => row(i + 1)));
    const r = await browseMemberSearch(repository, tb, scope, 'anna');
    assert.equal(r.data.length, 50);
    assert.equal(r.data[0].id, id(5001));
    assert.equal(tb.fetch.mock.calls.length, 2);
    const next = await browseMemberSearch(
      repository,
      tb,
      scope,
      'anna',
      decodeRunCursor(r.meta.pagination.next_cursor, scope).position,
    );
    assert.deepEqual(
      next.data.map((item) => item.id),
      Array.from({ length: 10 }, (_, i) => id(5051 + i)),
    );
  });
  it('returns empty scanning progress at the call budget, then finds late matches', async () => {
    await seed([20001]);
    const tb = client(Array.from({ length: 20001 }, (_, i) => row(i + 1)));
    const r = await browseMemberSearch(repository, tb, scope, 'anna');
    assert.deepEqual(r.data, []);
    assert.equal(r.meta.pagination.state, 'scanning');
    assert.equal(tb.fetch.mock.calls.length, 4);
    assert.equal(decodeRunCursor(r.meta.pagination.next_cursor, scope).position.id, id(20000));
    const next = await browseMemberSearch(
      repository,
      tb,
      scope,
      'anna',
      decodeRunCursor(r.meta.pagination.next_cursor, scope).position,
    );
    assert.deepEqual(
      next.data.map((item) => item.id),
      [id(20001)],
    );
    assert.equal(next.meta.pagination.next_cursor, null);
  });
  it('stops after validated progress at the soft time budget', async () => {
    const tb = client(Array.from({ length: 10000 }, (_, i) => row(i + 1)));
    vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValue(1501);
    const r = await browseMemberSearch(repository, tb, scope, 'anna');
    assert.equal(r.meta.pagination.state, 'scanning');
    assert.equal(tb.fetch.mock.calls.length, 1);
    assert.equal(decodeRunCursor(r.meta.pagination.next_cursor, scope).position.id, id(5000));
  });
  it('probes beyond an exactly full candidate batch before exhaustion', async () => {
    const tb = client(Array.from({ length: 5000 }, (_, i) => row(i + 1)));
    const r = await browseMemberSearch(repository, tb, scope, 'anna');
    assert.equal(r.meta.pagination.next_cursor, null);
    assert.equal(tb.fetch.mock.calls.length, 2);
  });
  it('re-evaluates later member/status changes without moving the boundary', async () => {
    await seed(Array.from({ length: 70 }, (_, i) => i + 1));
    await db('members').insert({ id: id(2), name: 'Bert', email: 'bert@example.test' });
    await db('automation_runs')
      .where('id', id(60))
      .update({ member_id: id(2) });
    const rows = Array.from({ length: 70 }, (_, i) => row(i + 1));
    rows[68].status = 'in_progress';
    const tb = client(rows);
    const first = await browseMemberSearch(repository, tb, scope, 'anna');
    await db('members').where('id', id(2)).update({ name: 'Anna' });
    await db('automation_runs').where('id', id(61)).update({ member_id: null });
    rows[68].status = 'completed';
    rows[69].status = 'in_progress';
    const next = await browseMemberSearch(
      repository,
      tb,
      scope,
      'anna',
      decodeRunCursor(first.meta.pagination.next_cursor, scope).position,
    );
    const ids = next.data.map((item) => item.id);
    assert.ok(ids.includes(id(60)));
    assert.ok(ids.includes(id(69)));
    assert.ok(!ids.includes(id(61)));
    assert.equal(next.data.find((run) => run.id === id(70))?.status, 'in_progress');
    assert.ok(ids.every((i) => i > id(50)));
  });
  it('treats SQL wildcard/escape characters literally', async () => {
    await seed([1]);
    for (const q of ['%', '_', '!', '\\']) {
      await db('members').update({ name: `name${q}here` });
      assert.equal(
        (await browseMemberSearch(repository, client([row(1)]), scope, q)).data.length,
        1,
      );
      assert.equal(
        (await browseMemberSearch(repository, client([row(1)]), scope, 'absent')).data.length,
        0,
      );
    }
  });
  it.each([
    { name: 'unavailable response', rows: null },
    { name: 'out-of-order rows', rows: [row(2), row(1)] },
    { name: 'duplicate runs', rows: [row(1), row(1)] },
  ])('rejects $name', async ({ rows }) => {
    await assert.rejects(() =>
      browseMemberSearch(repository, { fetch: async () => rows }, scope, 'anna'),
    );
  });
  it('does not publish partial progress when a later batch fails', async () => {
    await seed([1, 5001]);
    const rows = Array.from({ length: 5100 }, (_, i) => row(i + 1));
    const tb = client(rows);
    tb.fetch.mockResolvedValueOnce(rows.slice(0, 5000)).mockResolvedValueOnce(null);
    await assert.rejects(() => browseMemberSearch(repository, tb, scope, 'anna'), {
      code: 'AUTOMATION_MEMBER_SEARCH_UNAVAILABLE',
    });
    const retried = await browseMemberSearch(repository, client(rows), scope, 'anna');
    assert.deepEqual(
      retried.data.map((item) => item.id),
      [id(1), id(5001)],
    );
  });
});
