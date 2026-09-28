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
    },
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
  date: z.iso.date(),
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
): Promise<AutomationPerformanceStats | null> {
  try {
    const rows = await client.fetch('api_automation_performance_stats', {
      version: '',
      automationId,
    });
    const parsed = z.array(performanceRowSchema).safeParse(rows);
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
