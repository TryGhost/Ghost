import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import { z } from 'zod';
import {
  encodeRunCursor,
  memberSearchScope,
  type AutomationRunPosition,
  type RunCursorScope,
} from './automation-run-cursor';
import {
  automationRunRowSchema,
  isValidRunPage,
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
  return { ...scope, ...memberSearchScope(site, query) };
}
type SearchScope = ReturnType<typeof searchCursorScope>;
type MemberRow = { run_id: string; id: string; name: string | null; email: string };
type SearchRun = AutomationRunRow & { member: Omit<MemberRow, 'run_id'> | null };
export const MEMBER_SEARCH_PREDICATE =
  "(members.name LIKE ? ESCAPE '!' OR members.email LIKE ? ESCAPE '!')";
function isMysql(knex: Knex) {
  return ['mysql', 'mysql2'].includes(knex.client.config.client);
}

export function withSearchTimeout<T extends Knex.QueryBuilder>(knex: Knex, query: T): T {
  if (isMysql(knex)) {
    query.hintComment('MAX_EXECUTION_TIME(2000)').timeout(SEARCH_LIMITS.sqlMs, { cancel: true });
  }
  return query;
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
      lookup = lookup.whereRaw(MEMBER_SEARCH_PREDICATE, [pattern, pattern]);
    }
    for (const { run_id: runId, ...member } of await withSearchTimeout(knex, lookup)) {
      members.set(runId, member);
    }
  }
  return members;
}
const candidateSchema = z.union([
  automationRunRowSchema,
  z.object({
    ...automationRunRowSchema.shape,
    status: z.literal('invalid'),
    failed: z.literal(false),
  }),
]);
type CandidateRun = z.infer<typeof candidateSchema>;
function requireValidRun(row: CandidateRun): AutomationRunRow {
  if (row.status === 'invalid') {
    throw new errors.InternalServerError({
      message: 'Could not load automation member search.',
      code: 'AUTOMATION_MEMBER_SEARCH_UNAVAILABLE',
    });
  }
  return row;
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
      sortDirection: scope.direction,
      limit,
      ...(after ? { afterCreatedAt: after.created_at, afterId: after.id } : {}),
      ...(ids ? { runIds: ids.join(',') } : {}),
    },
    { method: 'POST', timeoutMs: SEARCH_LIMITS.httpMs },
  );
  const parsed = z.array(candidateSchema).max(limit).safeParse(rows);
  const allowed = ids ? new Set(ids) : null;
  if (
    !parsed.success ||
    !isValidRunPage(parsed.data, {
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
// Null means the probe overflowed, not that the search is exhausted.
export async function probeMemberSearch(knex: Knex, automationId: string, query: string) {
  if (!isMysql(knex)) {
    return null;
  }
  const pattern = memberSearchPattern(query);
  const rows = await withSearchTimeout(
    knex,
    knex('members')
      .join('automation_runs as runs', 'runs.member_id', 'members.id')
      .where('runs.automation_id', automationId)
      .whereRaw(MEMBER_SEARCH_PREDICATE, [pattern, pattern])
      .select<{ id: string }[]>('runs.id')
      .limit(SEARCH_LIMITS.smallSet + 1),
  );
  return rows.length <= SEARCH_LIMITS.smallSet ? rows.map((row) => row.id) : null;
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
      search: { version: 1, query, matching: 'contains' },
      order: `created_at ${scope.direction}`,
      pagination: {
        limit: SEARCH_LIMITS.page,
        next_cursor: position ? encodeRunCursor(scope, position) : null,
        state,
      },
    },
  });
  const probe = await probeMemberSearch(knex, scope.automation_id, query);
  if (probe !== null) {
    if (probe.length === 0) {
      return result([], undefined, 'exhausted');
    }
    const rows = (await fetchCandidates(client, scope, SEARCH_LIMITS.page + 1, after, probe)).map(
      requireValidRun,
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
      const validRun = requireValidRun(row);
      // Re-read the suffix next time; never advance over an unreturned match.
      if (runs.length === SEARCH_LIMITS.page) {
        return result(runs, runs.at(-1), 'more');
      }
      runs.push({ ...validRun, member });
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
