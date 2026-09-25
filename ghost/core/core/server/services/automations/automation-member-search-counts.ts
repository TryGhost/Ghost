import {
  entryDateScopeSchema,
  entryDateParams,
  matchesEntryDateScope,
  type EntryDateScope,
} from './automation-entry-stats';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import { z } from 'zod';
import {
  applyEntryDateFilter,
  memberSearchPattern,
  probeMemberSearch,
  SEARCH_LIMITS,
} from './automation-member-search';
import type { TinybirdClient } from './tinybird-automation-stats';
import type { AutomationStatusStats } from './automations-repository';

export const COUNT_LIMITS = {
  // Keep in sync with api_automation_search_counts run_ids limits.
  batch: 30000,
  batches: 4,
  softMs: 1500,
  tokenMs: 15 * 60 * 1000,
} as const;
const ZERO_COUNTS: AutomationStatusStats = {
  in_progress_run_count: 0,
  completed_run_count: 0,
  exited_early_run_count: 0,
  unclassified_run_count: 0,
};
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const countsSchema = z.strictObject({
  in_progress_run_count: count,
  completed_run_count: count,
  exited_early_run_count: count,
  unclassified_run_count: count,
});
const idSchema = z.string().regex(/^[a-f0-9]{24}$/);
const scopeSchema = z.strictObject({
  ...entryDateScopeSchema,
  include_entries: z.literal(true).optional(),
  kind: z.literal('automation-member-counts'),
  version: z.literal(1),
  matching: z.literal('contains'),
  automation_id: z.string().min(1),
  site: z.string().min(1),
  query: z.string().regex(/^[a-f0-9]{64}$/),
});
const cursorSchema = z.strictObject({
  scope: scopeSchema,
  after: idSchema,
  upper: idSchema,
  counts: countsSchema,
  expires: count,
});
export type CountCursor = z.infer<typeof cursorSchema>;
export function countCursorScope(
  automationId: string,
  site: string,
  query: string,
  dates: EntryDateScope = {},
  chartTimezone?: string,
) {
  return {
    ...dates,
    ...(chartTimezone ? { include_entries: true as const, timezone: chartTimezone } : {}),
    kind: 'automation-member-counts' as const,
    version: 1 as const,
    matching: 'contains' as const,
    automation_id: automationId,
    site,
    query: createHash('sha256').update(query).digest('hex'),
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
  now = Date.now(),
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
      decoded.scope.include_entries !== scope.include_entries ||
      !matchesEntryDateScope(decoded.scope, scope) ||
      Object.entries(scope).some(
        ([scopeKey, scopeValue]) => decoded.scope[scopeKey as keyof CountScope] !== scopeValue,
      ) ||
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
  if (decoded.expires <= now) {
    throw new errors.ValidationError({
      message: 'Member search count cursor has expired. Start a fresh count.',
      code: 'AUTOMATION_COUNT_CURSOR_EXPIRED',
    });
  }
  return decoded;
}

async function aggregate(
  client: TinybirdClient,
  scope: CountScope,
  ids: string[],
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
      ...entryDateParams(scope),
      ...(scope.include_entries ? { includeEntries: 'true', timezone: scope.timezone } : {}),
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
        unclassified_run_count: integer,
        entries: z
          .array(z.tuple([z.iso.date(), integer]))
          .max(ids.length)
          .optional(),
      }),
    )
    .length(1)
    .safeParse(response);
  const row = parsed.success ? parsed.data[0] : undefined;
  const { entries = [], ...counts } = row ?? { ...ZERO_COUNTS };
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (
    !row ||
    total > ids.length ||
    (scope.include_entries &&
      (!row.entries ||
        entries.reduce((sum, [, value]) => sum + value, 0) !== total ||
        new Set(entries.map(([date]) => date)).size !== entries.length ||
        entries.some(
          ([date]) => scope.date_from && (date < scope.date_from || date >= scope.date_to!),
        )))
  ) {
    throw new errors.InternalServerError({
      message: 'Could not load automation member-search counts.',
      code: 'AUTOMATION_SEARCH_COUNTS_UNAVAILABLE',
    });
  }
  return { counts, entries };
}
function bounded<T extends Knex.QueryBuilder>(knex: Knex, query: T): T {
  if (['mysql', 'mysql2'].includes(knex.client.config.client)) {
    query.hintComment('MAX_EXECUTION_TIME(2000)').timeout(SEARCH_LIMITS.sqlMs, { cancel: true });
  }
  return query;
}

export async function readMemberSearchCounts(
  knex: Knex,
  client: TinybirdClient,
  scope: CountScope,
  query: string,
  secret: unknown,
  continuation?: CountCursor,
) {
  signingKey(secret);
  const started = performance.now();
  // Only this response's buckets travel to Admin. The signed cursor stays small,
  // and retrying a page replaces its buckets rather than counting them twice.
  const buckets = new Map<string, number>();
  let aggregated = false;
  const collect = async (ids: string[], first = '', last = '') => {
    const batch = await aggregate(client, scope, ids, first, last);
    aggregated = true;
    for (const [date, value] of batch.entries) {
      buckets.set(date, (buckets.get(date) ?? 0) + value);
    }
    return batch.counts;
  };
  const result = (counts: AutomationStatusStats | null, next: CountCursor | null) => ({
    data: counts ? [{ automation_id: scope.automation_id, ...counts }] : [],
    meta: {
      ...(scope.include_entries
        ? {
            entry_buckets: {
              version: 1,
              timezone: scope.timezone!,
              entries: [...buckets]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, value]) => ({ date, count: value })),
            },
          }
        : {}),
      ...(scope.date_from
        ? {
            entry_window: {
              date_from: scope.date_from,
              date_to: scope.date_to,
              timezone: scope.timezone,
              bucket: 'day',
            },
          }
        : {}),
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
      await bounded(
        knex,
        knex('automation_runs')
          .where('automation_id', scope.automation_id)
          .modify(applyEntryDateFilter, scope, 'created_at')
          .orderBy('id', 'desc')
          .first<{ id: string }>('id'),
      )
    )?.id;
  const expires = continuation?.expires ?? Date.now() + COUNT_LIMITS.tokenMs;
  const totals = { ...(continuation?.counts ?? ZERO_COUNTS) };
  let after = continuation?.after ?? '';
  const finish = async (next: CountCursor | null) => {
    // Real aggregates already validate support. Only probe if the first page
    // made no aggregate request; signed continuations inherit that check.
    if (!continuation && !aggregated) {
      await collect([]);
    }
    return result(next ? null : totals, next);
  };
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
      // Match the covering index's order so MySQL can stop at the window limit
      // without an index hint. This is still run-ID order: automation_id is
      // fixed and id is unique, so member_id cannot change the ordering.
      .orderBy(['automation_id', 'id', 'member_id'])
      .limit(COUNT_LIMITS.batch + 1)
      .as('runs');
    const rows = await bounded(
      knex,
      knex
        .from(candidates)
        .leftJoin('members', 'members.id', 'runs.member_id')
        .select<{ id: string; matched: number | null }[]>(
          'runs.id',
          knex.raw(
            "(members.name LIKE ? ESCAPE '!' OR members.email LIKE ? ESCAPE '!') AS matched",
            [pattern, pattern],
          ),
        ),
    );
    // Outer joins do not guarantee derived-table ordering.
    rows.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const window = rows.slice(0, COUNT_LIMITS.batch);
    return {
      ids: window.filter((row) => row.matched).map((row) => row.id),
      first: window[0]?.id ?? '',
      last: window.at(-1)?.id ?? '',
      exhausted: rows.length <= COUNT_LIMITS.batch,
    };
  };
  for (let scanned = 0; scanned < COUNT_LIMITS.batches; scanned += 1) {
    const window = await readWindow();
    // Finish each bounded query before starting the next. Larger windows reduce
    // request overhead without increasing concurrent Tinybird request pressure.
    if (window.ids.length) {
      const counts = await collect(window.ids, window.first, window.last);
      for (const key of Object.keys(totals) as (keyof AutomationStatusStats)[]) {
        totals[key] += counts[key];
      }
    }
    after = window.last || after;
    if (!Number.isSafeInteger(Object.values(totals).reduce((a, b) => a + b, 0))) {
      throw new errors.InternalServerError({
        message: 'Member search counts exceed the supported integer range.',
      });
    }
    if (window.exhausted) {
      return finish(null);
    }
    if (performance.now() - started >= COUNT_LIMITS.softMs) {
      break;
    }
  }
  return finish({ scope, after, upper, counts: totals, expires });
}
