import {
  entryDateScopeSchema,
  entryDateParams,
  matchesEntryDateScope,
  type EntryDateScope,
} from './automation-entry-stats';
import { createHash } from 'node:crypto';
import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import { z } from 'zod';
import moment from 'moment-timezone';
import { toDatabaseDate } from '../../lib/db-types/date';
import type { RunCursorScope } from './automation-run-cursor';
import {
  automationRunRowSchema,
  isValidRunPage,
  type AutomationRunPosition,
  type AutomationRunRow,
  type TinybirdClient,
} from './tinybird-automation-stats';

// Internal work limits are independent of the public fifty-result page size.
export const SEARCH_LIMITS = {
  page: 50,
  smallSet: 2000,
  candidates: 5000,
  batches: 4,
  softMs: 1500,
  sqlMs: 2500,
  httpMs: 3000,
  queryBytes: 4096,
} as const;

export function normalizeMemberSearch(value: unknown): string {
  if (value === undefined) {
    return '';
  }
  if (typeof value !== 'string' || Buffer.byteLength(value) > SEARCH_LIMITS.queryBytes) {
    throw new errors.ValidationError({
      message: 'Member search must be a string of at most 4096 UTF-8 bytes.',
    });
  }
  return value.trim();
}
export function memberSearchPattern(query: string) {
  return `%${query.replace(/[!%_]/g, (character) => `!${character}`)}%`;
}
export function searchCursorScope(scope: RunCursorScope, site: string, query: string) {
  return {
    ...scope,
    site,
    version: 1 as const,
    matching: 'contains' as const,
    query: createHash('sha256').update(query).digest('hex'),
  };
}
type SearchScope = ReturnType<typeof searchCursorScope>;
const searchCursorSchema = z.strictObject({
  ...entryDateScopeSchema,
  automation_id: z.string().min(1),
  status: z.enum(['in_progress', 'completed', 'exited_early']).nullable(),
  direction: z.enum(['asc', 'desc']),
  site: z.string().min(1),
  version: z.literal(1),
  matching: z.literal('contains'),
  query: z.string().regex(/^[a-f0-9]{64}$/),
  id: z.string().regex(/^[a-f0-9]{24}$/),
  created_at: z.iso.datetime().transform((value) => new Date(value).toISOString()),
});
export function encodeSearchCursor(scope: SearchScope, position: AutomationRunPosition) {
  return Buffer.from(
    JSON.stringify({ ...scope, id: position.id, created_at: position.created_at }),
  ).toString('base64url');
}
export function decodeSearchCursor(value: unknown, scope: SearchScope): AutomationRunPosition {
  try {
    if (typeof value !== 'string' || value.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(value)) {
      throw new errors.ValidationError({ message: 'Invalid member search cursor.' });
    }
    const parsed = searchCursorSchema.parse(JSON.parse(Buffer.from(value, 'base64url').toString()));
    if (
      !matchesEntryDateScope(parsed, scope) ||
      Object.entries(scope).some(
        ([key, expected]) => parsed[key as keyof typeof parsed] !== expected,
      )
    ) {
      throw new errors.ValidationError({ message: 'Invalid member search cursor.' });
    }
    return { id: parsed.id, created_at: parsed.created_at };
  } catch {
    throw new errors.ValidationError({
      message: 'Member search cursor is invalid or does not match the requested query.',
    });
  }
}
type MemberRow = { run_id: string; id: string; name: string | null; email: string };
type SearchRun = AutomationRunRow & { member: Omit<MemberRow, 'run_id'> | null };
const predicate = "(members.name LIKE ? ESCAPE '!' OR members.email LIKE ? ESCAPE '!')";
function isMysql(knex: Knex) {
  return ['mysql', 'mysql2'].includes(knex.client.config.client);
}

async function readMembers(knex: Knex, automationId: string, ids: string[], query?: string) {
  const members = new Map<string, Omit<MemberRow, 'run_id'>>();
  // SQLite has a lower binding limit. Each lookup is bounded by primary-key IDs.
  const size = isMysql(knex) ? SEARCH_LIMITS.candidates : 500;
  for (let offset = 0; offset < ids.length; offset += size) {
    let lookup = knex('automation_runs as runs')
      .join('members', 'members.id', 'runs.member_id')
      .where('runs.automation_id', automationId)
      .whereIn('runs.id', ids.slice(offset, offset + size))
      .select<MemberRow[]>('runs.id as run_id', 'members.id', 'members.name', 'members.email');
    if (query !== undefined) {
      const pattern = memberSearchPattern(query);
      lookup = lookup.whereRaw(predicate, [pattern, pattern]);
    }
    if (isMysql(knex)) {
      lookup = lookup
        .hintComment('MAX_EXECUTION_TIME(2000)')
        .timeout(SEARCH_LIMITS.sqlMs, { cancel: true });
    }
    for (const { run_id: runId, ...member } of await lookup) {
      members.set(runId, member);
    }
  }
  return members;
}
async function fetchCandidates(
  client: TinybirdClient,
  scope: SearchScope,
  limit: number,
  after?: AutomationRunPosition,
  ids?: string[],
) {
  const rows = await client.fetch(
    'api_automation_run_search',
    {
      version: '',
      automationId: scope.automation_id,
      ...entryDateParams(scope),
      runStatus: scope.status ?? undefined,
      sortDirection: scope.direction,
      limit,
      ...(after ? { afterCreatedAt: after.created_at, afterId: after.id } : {}),
      ...(ids ? { runIds: ids.join(',') } : {}),
    },
    { method: 'POST', timeoutMs: SEARCH_LIMITS.httpMs },
  );
  const parsed = z.array(automationRunRowSchema).max(limit).safeParse(rows);
  const allowed = ids ? new Set(ids) : null;
  if (
    !parsed.success ||
    !isValidRunPage(parsed.data, {
      status: scope.status ?? undefined,
      direction: scope.direction,
      after,
    }) ||
    parsed.data.some((row) => !/^[a-f0-9]{24}$/.test(row.id) || (allowed && !allowed.has(row.id)))
  ) {
    throw new errors.InternalServerError({
      message: 'Could not load automation member search.',
      code: 'AUTOMATION_MEMBER_SEARCH_UNAVAILABLE',
    });
  }
  return parsed.data;
}
export function applyEntryDateFilter(
  builder: Knex.QueryBuilder,
  scope: EntryDateScope,
  column: string,
) {
  if (scope.date_from) {
    // Convert calendar midnights separately: a local day can be 23 or 25 hours.
    // Keep the column bare so MySQL can use the automation/created_at index.
    const timezone = scope.timezone ?? 'UTC';
    builder
      .where(column, '>=', toDatabaseDate(moment.tz(scope.date_from, timezone).toDate()))
      .where(column, '<', toDatabaseDate(moment.tz(scope.date_to!, timezone).toDate()));
  }
}

export async function browseMemberSearch(
  knex: Knex,
  client: TinybirdClient,
  scope: SearchScope,
  query: string,
  after?: AutomationRunPosition,
) {
  const started = performance.now();
  const result = (
    runs: SearchRun[],
    position: AutomationRunPosition | undefined,
    state: 'more' | 'scanning' | 'exhausted',
  ) => ({
    data: runs,
    meta: {
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
      order: `created_at ${scope.direction}`,
      pagination: {
        limit: SEARCH_LIMITS.page,
        next_cursor: position ? encodeSearchCursor(scope, position) : null,
        state,
      },
    },
  });
  // The probe is complete only if it does not overflow. This optimization needs
  // cancellable SQL; SQLite takes the bounded-ID candidate path below.
  if (isMysql(knex)) {
    const pattern = memberSearchPattern(query);
    const probe = await knex('members')
      .join('automation_runs as runs', 'runs.member_id', 'members.id')
      .where('runs.automation_id', scope.automation_id)
      .modify(applyEntryDateFilter, scope, 'runs.created_at')
      .whereRaw(predicate, [pattern, pattern])
      .select<{ id: string }[]>('runs.id')
      .limit(SEARCH_LIMITS.smallSet + 1)
      .hintComment('MAX_EXECUTION_TIME(2000)')
      .timeout(SEARCH_LIMITS.sqlMs, { cancel: true });
    if (probe.length <= SEARCH_LIMITS.smallSet) {
      // An empty set still checks availability of the new pipe, not only Core.
      const rows = await fetchCandidates(
        client,
        scope,
        SEARCH_LIMITS.page + 1,
        after,
        probe.map((row) => row.id),
      );
      const page = rows.slice(0, SEARCH_LIMITS.page);
      const members = await readMembers(
        knex,
        scope.automation_id,
        page.map((row) => row.id),
      );
      const more = rows.length > SEARCH_LIMITS.page;
      return result(
        page.map((row) => ({ ...row, member: members.get(row.id) ?? null })),
        more ? page.at(-1) : undefined,
        more ? 'more' : 'exhausted',
      );
    }
  }
  const runs: SearchRun[] = [];
  let position = after;
  for (let batch = 0; batch < SEARCH_LIMITS.batches; batch++) {
    const rows = await fetchCandidates(client, scope, SEARCH_LIMITS.candidates, position);
    const members = await readMembers(
      knex,
      scope.automation_id,
      rows.map((row) => row.id),
      query,
    );
    for (const row of rows) {
      const member = members.get(row.id);
      if (!member) {
        continue;
      }
      // Re-read the suffix next time; never advance over an unreturned match.
      if (runs.length === SEARCH_LIMITS.page) {
        return result(runs, runs.at(-1), 'more');
      }
      runs.push({ ...row, member });
    }
    if (rows.length < SEARCH_LIMITS.candidates) {
      return result(runs, undefined, 'exhausted');
    }
    position = rows.at(-1);
    if (runs.length === SEARCH_LIMITS.page || performance.now() - started >= SEARCH_LIMITS.softMs) {
      break;
    }
  }
  return result(runs, position, 'scanning');
}
