import { z } from 'zod';
import { fromDatabaseDate } from '../../lib/db-types/date';

const logging = require('@tryghost/logging');

export interface TinybirdClient {
  fetch(pipeName: string): Promise<unknown>;
}

export interface AutomationStats {
  last_run_created_at: Date | null;
  total_run_count: number;
  in_progress_run_count: number;
}

export const EMPTY_AUTOMATION_STATS: AutomationStats = {
  last_run_created_at: null,
  total_run_count: 0,
  in_progress_run_count: 0,
};

const statsRowSchema = z.object({
  automation_id: z.string(),
  last_run_created_at: z.string().nullable(),
  total_run_count: z.coerce.number(),
  in_progress_run_count: z.coerce.number(),
});

// Resolves to null when Tinybird is unreachable or returns something unexpected; the
// client logs transport errors itself. Callers then omit stats and Admin hides the columns.
export async function fetchAutomationStats(
  client: TinybirdClient,
): Promise<Map<string, AutomationStats> | null> {
  const rows = await client.fetch('api_automation_browse_stats');
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
        last_run_created_at: row.last_run_created_at
          ? fromDatabaseDate(row.last_run_created_at)
          : null,
        total_run_count: row.total_run_count,
        in_progress_run_count: row.in_progress_run_count,
      },
    ]),
  );
}
