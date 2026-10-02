import type { AutomationRunSortDirection, AutomationRunPosition } from './automation-run-cursor';
import logging from '@tryghost/logging';
import { z } from 'zod';
import type { AutomationBrowseResult } from './automations-repository';
import type { EntryStatsData } from './automation-entry-stats';

export type TinybirdClient = {
  fetch(
    pipeName: string,
    options: {
      version: string;
      automationId?: string;
      timezone?: string;
      dateFrom?: string;
      dateTo?: string;
      runStatus?: string;
      sortDirection?: AutomationRunSortDirection;
      limit?: number;
      afterCreatedAt?: string;
      afterId?: string;
      runIds?: string;
    },
    transport?: { method?: 'POST'; timeoutMs?: number },
  ): Promise<unknown>;
};

export type AutomationStats = NonNullable<AutomationBrowseResult['stats']>;

export const EMPTY_AUTOMATION_STATS: AutomationStats = {
  last_run_created_at: null,
  total_run_count: 0,
  in_progress_run_count: 0,
};

const runCountSchema = z
  .union([z.number(), z.string().regex(/^\d+$/)])
  .pipe(z.coerce.number<string | number>().int().nonnegative());

const statsRowSchema = z.object({
  automation_id: z.string(),
  last_run_created_at: z.iso
    .datetime()
    .transform((value) => new Date(value))
    .nullable(),
  total_run_count: runCountSchema,
  in_progress_run_count: runCountSchema,
});

export async function fetchAutomationStats(
  client: TinybirdClient,
): Promise<Map<string, AutomationStats> | null> {
  let rows: unknown;
  try {
    // Override the traffic analytics version: this pipe has no version suffix.
    rows = await client.fetch('api_automation_browse_stats', {
      version: '',
    });
  } catch (error) {
    logging.error('Error fetching Tinybird automation stats:', error);
    return null;
  }
  if (rows === null) {
    return null;
  }

  const parsed = z.array(statsRowSchema).safeParse(rows);
  if (!parsed.success) {
    logging.error(
      {
        system: { event: 'automations.stats.invalid_tinybird_response' },
        issues: parsed.error.issues,
      },
      'Unexpected response from the Tinybird automation stats pipe',
    );
    return null;
  }

  return new Map(
    parsed.data.map((row) => [
      row.automation_id,
      {
        last_run_created_at: row.last_run_created_at,
        total_run_count: row.total_run_count,
        in_progress_run_count: row.in_progress_run_count,
      },
    ]),
  );
}

export type AutomationPerformanceStats = EntryStatsData & {
  in_progress_run_count: number;
  completed_run_count: number;
  exited_early_run_count: number;
};

const performanceRowSchema = z.object({
  date: z.union([z.iso.date(), z.iso.datetime()]),
  in_progress_run_count: runCountSchema,
  completed_run_count: runCountSchema,
  exited_early_run_count: runCountSchema,
  invalid_run_count: runCountSchema.refine((count) => count === 0, {
    message: 'Automation runs contain an unexpected step status.',
  }),
});

export async function fetchAutomationPerformanceStats(
  client: TinybirdClient,
  automationId: string,
  options: { dateFrom?: string; dateTo?: string; timezone?: string } = {},
): Promise<AutomationPerformanceStats | null> {
  try {
    const rows = await client.fetch('api_automation_performance_stats', {
      version: '',
      automationId,
      timezone: 'UTC',
      ...options,
    });
    const parsed = z.array(performanceRowSchema).min(1).safeParse(rows);
    if (
      !parsed.success ||
      new Set(parsed.data.map((row) => row.date)).size !== parsed.data.length
    ) {
      logging.error('Unexpected response from the Tinybird automation performance stats pipe');
      return null;
    }
    const stats: AutomationPerformanceStats = {
      total_run_count: 0,
      in_progress_run_count: 0,
      completed_run_count: 0,
      exited_early_run_count: 0,
      entries: [],
    };
    for (const row of parsed.data) {
      const count =
        row.in_progress_run_count + row.completed_run_count + row.exited_early_run_count;
      stats.total_run_count += count;
      stats.in_progress_run_count += row.in_progress_run_count;
      stats.completed_run_count += row.completed_run_count;
      stats.exited_early_run_count += row.exited_early_run_count;
      stats.entries.push({ date: row.date, count });
    }
    if (!Number.isSafeInteger(stats.total_run_count)) {
      logging.error('Automation entry total exceeds the supported integer range');
      return null;
    }
    stats.entries.sort((a, b) => a.date.localeCompare(b.date));
    return stats;
  } catch (error) {
    logging.error('Error fetching Tinybird automation performance stats:', error);
    return null;
  }
}

// Entry time then run ID; both sides must hold normalised ISO timestamps.
export function compareRuns(a: AutomationRunPosition, b: AutomationRunPosition) {
  if (a.created_at !== b.created_at) {
    return a.created_at < b.created_at ? -1 : 1;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export const automationRunRowSchema = z
  .object({
    id: z.string().min(1),
    created_at: z.iso.datetime().transform((value) => new Date(value).toISOString()),
    status: z.enum(['in_progress', 'completed', 'exited_early']),
    failed: z.boolean(),
  })
  .refine((run) => !run.failed || run.status === 'exited_early');

export type AutomationRunRow = z.infer<typeof automationRunRowSchema>;

export function isValidRunPage(
  rows: (AutomationRunPosition & { status: string })[],
  options: {
    status?: string;
    direction: AutomationRunSortDirection;
    after?: AutomationRunPosition;
  },
) {
  const expectedSign = options.direction === 'asc' ? -1 : 1;
  const uniqueIds = new Set(rows.map((row) => row.id)).size === rows.length;
  const matchesFilter = !options.status || rows.every((row) => row.status === options.status);
  const continuesCursor =
    !options.after || rows.length === 0 || compareRuns(options.after, rows[0]) === expectedSign;
  const inOrder = rows.every(
    (row, index) => index === 0 || compareRuns(rows[index - 1], row) === expectedSign,
  );
  return uniqueIds && matchesFilter && continuesCursor && inOrder;
}

export async function fetchAutomationRuns(
  client: TinybirdClient,
  automationId: string,
  options: {
    status?: 'in_progress' | 'completed' | 'exited_early';
    direction: AutomationRunSortDirection;
    limit: number;
    timezone?: string;
    dateFrom?: string;
    dateTo?: string;
    after?: AutomationRunPosition;
  } = { direction: 'desc', limit: 50 },
) {
  const { status, direction, limit, after, ...dates } = options;
  try {
    const rows = await client.fetch('api_automation_runs', {
      version: '',
      automationId,
      runStatus: status,
      ...dates,
      sortDirection: direction,
      limit,
      ...(after ? { afterCreatedAt: after.created_at, afterId: after.id } : {}),
    });
    const parsed = z.array(automationRunRowSchema).max(limit).safeParse(rows);
    if (!parsed.success || !isValidRunPage(parsed.data, { status, direction, after })) {
      logging.error('Unexpected response from the Tinybird automation runs pipe');
      return null;
    }
    return parsed.data;
  } catch (error) {
    logging.error('Error fetching Tinybird automation runs:', error);
    return null;
  }
}
