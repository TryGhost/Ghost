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
  it('withholds partial totals, continues after the last consumed ID and retries without double counting', async () => {
    await seed(1, 33000);
    const tb = client();
    const first = await readMemberSearchCounts(db, tb, scope, 'anna', secret);
    assert.deepEqual(first.data, []);
    assert.equal(first.meta.pagination.state, 'scanning');
    const token = first.meta.pagination.next_cursor;
    const cursor = decodeCountCursor(token, scope, secret);
    assert.equal(cursor.after, id(32000));
    assert.equal(cursor.upper, id(33000));
    assert.equal(tb.fetch.mock.calls.length, 5);
    const next = await readMemberSearchCounts(db, tb, scope, 'anna', secret, cursor);
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
      in_progress_run_count: 8250,
      completed_run_count: 8250,
      exited_early_run_count: 8250,
      unclassified_run_count: 8250,
    });
  });
  it('keeps the upper fence and original expiry while later members change', async () => {
    await seed(1, 17000);
    const tb = client();
    vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValue(1501);
    const first = await readMemberSearchCounts(db, tb, scope, 'anna', secret);
    const cursor = decodeCountCursor(first.meta.pagination.next_cursor, scope, secret);
    await seed(17001, 10);
    await db('automation_runs').where('id', id(8001)).update({ member_id: null });
    const next = await readMemberSearchCounts(db, tb, scope, 'anna', secret, cursor);
    assert.equal(next.meta.pagination.state, 'exhausted');
    assert.equal(
      Object.values(next.data[0])
        .filter((v) => typeof v === 'number')
        .reduce((a, b) => a + Number(b), 0),
      16999,
    );
    assert.equal(cursor.upper, id(17000));
  });
  it('returns scanning progress through empty windows and zero only when exhausted', async () => {
    await seed(1, 33000, id(1), null);
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
    await seed(1, 9000);
    const tb = client();
    let calls = 0;
    const failing: TinybirdClient = {
      fetch: async (...args) => {
        calls += 1;
        return calls === 3 ? null : tb.fetch(...args);
      },
    };
    await assert.rejects(() => readMemberSearchCounts(db, failing, scope, 'anna', secret));
    const result = await readMemberSearchCounts(db, tb, scope, 'anna', secret);
    assert.equal(result.data[0].completed_run_count, 2250);
  });
});
