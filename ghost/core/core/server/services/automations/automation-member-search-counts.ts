import { createHmac, timingSafeEqual } from 'node:crypto';
import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import { z } from 'zod';
import {
  applyEntryDateFilter,
  memberSearchPattern,
  probeMemberSearch,
  SEARCH_LIMITS,
  withSearchTimeout,
  MEMBER_SEARCH_PREDICATE,
} from './automation-member-search';
import type { TinybirdClient } from './tinybird-automation-stats';
import { entryDate, type EntryStatsWindow } from './automation-entry-stats';
import {
  entryDateScopeSchema,
  memberSearchScopeSchema,
  memberSearchScope,
  matchesCursorScope,
  type RunCursorScope,
} from './automation-run-cursor';
type AutomationStatusStats = {
  in_progress_run_count: number;
  completed_run_count: number;
  exited_early_run_count: number;
};
type EntryDateScope = Pick<RunCursorScope, 'date_from' | 'date_to' | 'timezone'>;

export const COUNT_LIMITS = {
  // Keep in sync with api_automation_search_counts run_ids limits.
  batch: 30000,
  batches: 4,
  softMs: 1500,
} as const;
const ZERO_COUNTS: AutomationStatusStats = {
  in_progress_run_count: 0,
  completed_run_count: 0,
  exited_early_run_count: 0,
};
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const countsSchema = z.strictObject({
  in_progress_run_count: count,
  completed_run_count: count,
  exited_early_run_count: count,
});
const idSchema = z.string().regex(/^[a-f0-9]{24}$/);
const scopeSchema = z.strictObject({
  ...entryDateScopeSchema.shape,
  ...memberSearchScopeSchema.shape,
  kind: z.literal('automation-member-counts'),
  automation_id: z.string().min(1),
});
const cursorSchema = z.strictObject({
  scope: scopeSchema,
  after: idSchema,
  upper: idSchema,
  counts: countsSchema,
  window: z.object({
    date_from: z.iso.date(),
    date_to: z.iso.date(),
    timezone: z.string().min(1),
    bucket: z.enum(['hour', 'day']),
  }),
});
export type CountCursor = z.infer<typeof cursorSchema>;
export function countCursorScope(
  automationId: string,
  site: string,
  query: string,
  dates: EntryDateScope,
) {
  return {
    ...dates,
    kind: 'automation-member-counts' as const,
    automation_id: automationId,
    ...memberSearchScope(site, query),
  };
}
type CountScope = ReturnType<typeof countCursorScope>;
function signingKey(secret: unknown) {
  if (typeof secret !== 'string' || secret.length < 32) {
    throw new errors.InternalServerError({
      message: 'Member search count signing key is unavailable.',
    });
  }
  // Domain separation from the existing site-wide admin session secret. No
  // process-local state: all Core instances use the same persisted setting.
  return createHmac('sha256', secret).update('ghost:automation-member-counts:v1').digest();
}
export function encodeCountCursor(cursor: CountCursor, secret: unknown) {
  const payload = Buffer.from(JSON.stringify(cursor)).toString('base64url');
  return `${payload}.${createHmac('sha256', signingKey(secret)).update(payload).digest('base64url')}`;
}
export function decodeCountCursor(
  value: unknown,
  scope: CountScope,
  secret: unknown,
  { preserveEndDate = false } = {},
): CountCursor {
  const key = signingKey(secret);
  let decoded: CountCursor;
  try {
    if (
      typeof value !== 'string' ||
      value.length > 4096 ||
      !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(value)
    ) {
      throw new errors.ValidationError({ message: 'Invalid count cursor.' });
    }
    const [payload, signature] = value.split('.');
    const supplied = Buffer.from(signature, 'base64url');
    const expected = createHmac('sha256', key).update(payload).digest();
    if (
      supplied.length !== expected.length ||
      supplied.toString('base64url') !== signature ||
      !timingSafeEqual(supplied, expected)
    ) {
      throw new errors.ValidationError({ message: 'Invalid count cursor.' });
    }
    decoded = cursorSchema.parse(JSON.parse(Buffer.from(payload, 'base64url').toString()));
    if (
      !matchesCursorScope(decoded.scope, scope, preserveEndDate) ||
      decoded.after > decoded.upper ||
      !Number.isSafeInteger(Object.values(decoded.counts).reduce((a, b) => a + b, 0))
    ) {
      throw new errors.ValidationError({ message: 'Invalid count cursor.' });
    }
  } catch {
    throw new errors.ValidationError({
      message: 'Member search count cursor is invalid or does not match the requested query.',
      code: 'AUTOMATION_COUNT_CURSOR_INVALID',
    });
  }
  return decoded;
}

async function aggregate(
  client: TinybirdClient,
  scope: CountScope,
  ids: string[],
  window: EntryStatsWindow,
  first = '',
  last = '',
): Promise<{ counts: AutomationStatusStats; entries: [string, number][] }> {
  if (ids.length > COUNT_LIMITS.batch || ids.some((id) => !idSchema.safeParse(id).success)) {
    throw new errors.InternalServerError({ message: 'Invalid member search count candidates.' });
  }
  const response = await client.fetch(
    'api_automation_search_counts',
    {
      version: '',
      automationId: scope.automation_id,
      dateFrom: window.date_from,
      dateTo: window.date_to,
      timezone: window.timezone,
      hourly: window.bucket === 'hour',
      runIds: ids.join(','),
      firstId: first,
      lastId: last,
    },
    { method: 'POST', timeoutMs: SEARCH_LIMITS.httpMs },
  );
  const integer = z.union([count, z.string().regex(/^\d+$/).transform(Number).pipe(count)]);
  const parsed = z
    .array(
      z.object({
        in_progress_run_count: integer,
        completed_run_count: integer,
        exited_early_run_count: integer,
        invalid_run_count: integer.refine((value) => value === 0),
        entries: z
          .array(z.tuple([z.union([z.iso.date(), z.iso.datetime()]), integer]))
          .max(ids.length),
      }),
    )
    .length(1)
    .safeParse(response);
  const row = parsed.success ? parsed.data[0] : undefined;
  const entries = row?.entries ?? [];
  const counts = row
    ? {
        in_progress_run_count: row.in_progress_run_count,
        completed_run_count: row.completed_run_count,
        exited_early_run_count: row.exited_early_run_count,
      }
    : { ...ZERO_COUNTS };
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (
    !row ||
    total > ids.length ||
    entries.reduce((sum, [, value]) => sum + value, 0) !== total ||
    new Set(entries.map(([date]) => date)).size !== entries.length ||
    entries.some(([date]) => {
      const day = entryDate(date, window.timezone);
      return (
        day < window.date_from ||
        day >= window.date_to ||
        date.includes('T') !== (window.bucket === 'hour')
      );
    })
  ) {
    throw new errors.InternalServerError({
      message: 'Could not load automation member-search counts.',
      code: 'AUTOMATION_SEARCH_COUNTS_UNAVAILABLE',
    });
  }
  return { counts, entries };
}
export async function readMemberSearchCounts(
  knex: Knex,
  client: TinybirdClient,
  scope: CountScope,
  query: string,
  secret: unknown,
  window: EntryStatsWindow,
  continuation?: CountCursor,
) {
  signingKey(secret);
  const started = performance.now();
  // Only this response's buckets travel to Admin. The signed cursor stays small,
  // and retrying a page replaces its buckets rather than counting them twice.
  const buckets = new Map<string, number>();
  const collect = async (ids: string[], first = '', last = '') => {
    if (ids.length === 0) {
      return { ...ZERO_COUNTS };
    }
    const batch = await aggregate(client, scope, ids, window, first, last);
    for (const [date, value] of batch.entries) {
      buckets.set(date, (buckets.get(date) ?? 0) + value);
    }
    return batch.counts;
  };
  const result = (counts: AutomationStatusStats | null, next: CountCursor | null) => ({
    data: counts
      ? [
          {
            automation_id: scope.automation_id,
            ...counts,
            total_run_count: Object.values(counts).reduce((sum, value) => sum + value, 0),
          },
        ]
      : [],
    meta: {
      entry_window: window,
      // Buckets belong to this page only. Merge each cursor page once; retries
      // replace that page. Final totals cover the entire completed traversal.
      entry_buckets: [...buckets]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, value]) => ({ date, count: value })),
      search: { version: 1, query, matching: 'contains' },
      pagination: {
        next_cursor: next ? encodeCountCursor(next, secret) : null,
        state: next ? 'scanning' : 'exhausted',
      },
    },
  });
  if (!continuation) {
    const ids = await probeMemberSearch(knex, scope.automation_id, query, scope);
    if (ids !== null) {
      ids.sort();
      return result(await collect(ids, ids[0], ids.at(-1)), null);
    }
  }
  // Capture a finite upper fence once. Higher IDs inserted between requests
  // cannot extend the traversal; lower inserts and member/status edits are live.
  const upper =
    continuation?.upper ??
    (
      await withSearchTimeout(
        knex,
        knex('automation_runs')
          .where('automation_id', scope.automation_id)
          .modify(applyEntryDateFilter, scope, 'created_at')
          .orderBy('id', 'desc')
          .first<{ id: string }>('id'),
      )
    )?.id;
  const totals = { ...(continuation?.counts ?? ZERO_COUNTS) };
  let after = continuation?.after ?? '';
  const finish = (next: CountCursor | null) => result(next ? null : totals, next);
  if (!upper) {
    return finish(null);
  }
  const pattern = memberSearchPattern(query);
  const readWindow = async () => {
    const candidates = knex('automation_runs')
      .select('id', 'member_id')
      .where('automation_id', scope.automation_id)
      .modify(applyEntryDateFilter, scope, 'created_at')
      .where('id', '>', after)
      .where('id', '<=', upper)
      .orderBy('id')
      .limit(COUNT_LIMITS.batch + 1)
      .as('runs');
    const rows = await withSearchTimeout(
      knex,
      knex
        .from(candidates)
        .leftJoin('members', 'members.id', 'runs.member_id')
        .select<{ id: string; matched: number | null }[]>(
          'runs.id',
          knex.raw(`${MEMBER_SEARCH_PREDICATE} AS matched`, [pattern, pattern]),
        ),
    );
    // Outer joins do not guarantee derived-table ordering.
    rows.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const batchRows = rows.slice(0, COUNT_LIMITS.batch);
    return {
      ids: batchRows.filter((row) => row.matched).map((row) => row.id),
      first: batchRows[0]?.id ?? '',
      last: batchRows.at(-1)?.id ?? '',
      exhausted: rows.length <= COUNT_LIMITS.batch,
    };
  };
  for (let scanned = 0; scanned < COUNT_LIMITS.batches; scanned += 1) {
    const batch = await readWindow();
    // Finish each bounded query before starting the next. Larger windows reduce
    // request overhead without increasing concurrent Tinybird request pressure.
    if (batch.ids.length) {
      const counts = await collect(batch.ids, batch.first, batch.last);
      for (const key of Object.keys(totals) as (keyof AutomationStatusStats)[]) {
        totals[key] += counts[key];
      }
    }
    after = batch.last || after;
    if (!Number.isSafeInteger(Object.values(totals).reduce((a, b) => a + b, 0))) {
      throw new errors.InternalServerError({
        message: 'Member search counts exceed the supported integer range.',
      });
    }
    if (batch.exhausted) {
      return finish(null);
    }
    if (performance.now() - started >= COUNT_LIMITS.softMs) {
      break;
    }
  }
  return finish({ scope, after, upper, counts: totals, window });
}
