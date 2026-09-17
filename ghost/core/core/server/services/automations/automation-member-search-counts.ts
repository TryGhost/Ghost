import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import { z } from 'zod';
import { memberSearchPattern, probeMemberSearch, SEARCH_LIMITS } from './automation-member-search';
import type { TinybirdClient } from './tinybird-automation-stats';
import type { AutomationStatusStats } from './automations-repository';

export const COUNT_LIMITS = {
  batch: 8000,
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
export function countCursorScope(automationId: string, site: string, query: string) {
  return {
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
): Promise<AutomationStatusStats> {
  if (ids.length > COUNT_LIMITS.batch || ids.some((id) => !idSchema.safeParse(id).success)) {
    throw new errors.InternalServerError({ message: 'Invalid member search count candidates.' });
  }
  const response = await client.fetch(
    'api_automation_search_counts',
    {
      version: '',
      automationId: scope.automation_id,
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
      }),
    )
    .length(1)
    .safeParse(response);
  if (!parsed.success || Object.values(parsed.data[0]).reduce((a, b) => a + b, 0) > ids.length) {
    throw new errors.InternalServerError({
      message: 'Could not load automation member-search counts.',
      code: 'AUTOMATION_SEARCH_COUNTS_UNAVAILABLE',
    });
  }
  return parsed.data[0];
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
  const result = (counts: AutomationStatusStats | null, next: CountCursor | null) => ({
    data: counts ? [{ automation_id: scope.automation_id, ...counts }] : [],
    meta: {
      search: { version: 1, query, matching: 'contains' },
      pagination: {
        next_cursor: next ? encodeCountCursor(next, secret) : null,
        state: next ? 'scanning' : 'exhausted',
      },
    },
  });
  if (!continuation) {
    const ids = await probeMemberSearch(knex, scope.automation_id, query);
    if (ids !== null) {
      ids.sort();
      return result(await aggregate(client, scope, ids, ids[0], ids.at(-1)), null);
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
          .orderBy('id', 'desc')
          .first<{ id: string }>('id'),
      )
    )?.id;
  const expires = continuation?.expires ?? Date.now() + COUNT_LIMITS.tokenMs;
  const totals = { ...(continuation?.counts ?? ZERO_COUNTS) };
  let after = continuation?.after ?? '';
  // Verify deployed capability even for empty SQL windows/automations. This
  // constant-size request returns zeros, not partial totals or a cache entry.
  await aggregate(client, scope, []);
  if (!upper) {
    return result(totals, null);
  }
  const pattern = memberSearchPattern(query);
  for (let batch = 0; batch < COUNT_LIMITS.batches; batch++) {
    const candidates = knex('automation_runs')
      .select('id', 'member_id')
      .where('automation_id', scope.automation_id)
      .where('id', '>', after)
      .where('id', '<=', upper)
      .orderBy('id', 'asc')
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
    const ids = window.filter((row) => row.matched).map((row) => row.id);
    if (ids.length) {
      const counts = await aggregate(client, scope, ids, window[0].id, window.at(-1)!.id);
      for (const key of Object.keys(totals) as (keyof AutomationStatusStats)[]) {
        totals[key] += counts[key];
      }
      if (!Number.isSafeInteger(Object.values(totals).reduce((a, b) => a + b, 0))) {
        throw new errors.InternalServerError({
          message: 'Member search counts exceed the supported integer range.',
        });
      }
    }
    if (rows.length <= COUNT_LIMITS.batch) {
      return result(totals, null);
    }
    after = window.at(-1)!.id;
    if (performance.now() - started >= COUNT_LIMITS.softMs) {
      break;
    }
  }
  return result(null, { scope, after, upper, counts: totals, expires });
}
