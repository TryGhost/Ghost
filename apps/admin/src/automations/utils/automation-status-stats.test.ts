import { describe, expect, it } from 'vitest';
import { AutomationStatusStatsSchema } from '@tryghost/admin-x-framework/api/automations';

describe('automation status response validation', () => {
  it.each([-1, null, 1.5, '4'])('rejects invalid status counts (%s)', (count) => {
    expect(
      AutomationStatusStatsSchema.safeParse({
        automation_id: 'one',
        in_progress_run_count: 0,
        completed_run_count: count,
        exited_early_run_count: 0,
        unclassified_run_count: 0,
      }).success,
    ).toBe(false);
  });
});
