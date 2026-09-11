import logging from '@tryghost/logging';
import { z } from 'zod';
import type { AutomationBrowseResult } from './automations-repository';

export type TinybirdClient = {
  fetch(pipeName: string, options: { version: string }): Promise<unknown>;
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
    rows = await client.fetch('api_automation_browse_stats', { version: '' });
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
