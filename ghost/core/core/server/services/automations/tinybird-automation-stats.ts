import { entryDateParams, type EntryDateScope } from './automation-entry-stats';
import logging from '@tryghost/logging';
import { z } from 'zod';
import type { AutomationBrowseResult, AutomationStatusStats } from './automations-repository';
import type { EntryStatsData } from './automation-entry-stats';

export type TinybirdClient = {
  fetch(
    pipeName: string,
    options: {
      version: string;
      automationId?: string;
      dateFrom?: string;
      dateTo?: string;
      timezone?: string;
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

export async function fetchAutomationEntryStats(
  client: TinybirdClient,
  automationId: string,
  options: { dateFrom?: string; dateTo?: string; timezone?: string } = {},
): Promise<EntryStatsData | null> {
  try {
    const rows = await client.fetch('api_automation_entry_stats', {
      version: '',
      automationId,
      ...options,
    });
    const parsed = z.array(z.object({ date: z.iso.date(), count: runCountSchema })).safeParse(rows);
    if (
      !parsed.success ||
      new Set(parsed.data.map((row) => row.date)).size !== parsed.data.length
    ) {
      logging.error('Unexpected response from the Tinybird automation entry stats pipe');
      return null;
    }
    // Derive the total from the same query result so concurrent entries cannot skew it.
    const total = parsed.data.reduce((sum, row) => sum + row.count, 0);
    if (!Number.isSafeInteger(total)) {
      logging.error('Automation entry total exceeds the supported integer range');
      return null;
    }
    return {
      total_run_count: total,
      entries: parsed.data.sort((a, b) => a.date.localeCompare(b.date)),
    };
  } catch (error) {
    logging.error('Error fetching Tinybird automation entry stats:', error);
    return null;
  }
}

export async function fetchAutomationStatusStats(
  client: TinybirdClient,
  automationId: string,
  dates: EntryDateScope = {},
): Promise<AutomationStatusStats | null> {
  try {
    const rows = await client.fetch('api_automation_status_stats', {
      version: '',
      automationId,
      ...entryDateParams(dates),
    });
    const parsed = z
      .array(
        z.object({
          in_progress_run_count: runCountSchema,
          completed_run_count: runCountSchema,
          exited_early_run_count: runCountSchema,
          unclassified_run_count: runCountSchema,
        }),
      )
      .length(1)
      .safeParse(rows);
    if (!parsed.success) {
      logging.error('Unexpected response from the Tinybird automation status stats pipe');
      return null;
    }
    return parsed.data[0];
  } catch (error) {
    logging.error('Error fetching Tinybird automation status stats:', error);
    return null;
  }
}

export async function fetchAutomationRuns(client: TinybirdClient, automationId: string) {
  try {
    const rows = await client.fetch('api_automation_runs', { version: '', automationId });
    const parsed = z
      .array(
        z
          .object({
            id: z.string().min(1),
            created_at: z.iso.datetime().transform((value) => new Date(value).toISOString()),
            status: z.enum(['in_progress', 'completed', 'exited_early', 'unclassified']),
            failed: z.boolean(),
          })
          .refine((run) => !run.failed || run.status === 'exited_early', {
            message: 'Only exited-early runs can have a failure flag.',
          }),
      )
      .max(10)
      .safeParse(rows);
    if (!parsed.success || new Set(parsed.data.map((row) => row.id)).size !== parsed.data.length) {
      logging.error('Unexpected response from the Tinybird automation runs pipe');
      return null;
    }
    return parsed.data;
  } catch (error) {
    logging.error('Error fetching Tinybird automation runs:', error);
    return null;
  }
}
