import { AutomationPerformanceStatsSchema } from '../../../src/api/automations';

const stats = {
  automation_id: 'one',
  total_run_count: 1,
  in_progress_run_count: 0,
  completed_run_count: 1,
  exited_early_run_count: 0,
  entries: [{ date: '2026-01-01', count: 1 }],
  entry_window: {
    date_from: '2026-01-01',
    date_to: '2026-01-02',
    bucket: 'day',
    timezone: 'UTC',
  },
};

describe('AutomationPerformanceStatsSchema', () => {
  it('accepts a valid response', () => {
    expect(AutomationPerformanceStatsSchema.parse(stats)).toEqual(stats);
  });

  it('accepts statistics grouped in a non-UTC timezone', () => {
    const localized = {
      ...stats,
      entry_window: { ...stats.entry_window, timezone: 'America/New_York' },
    };
    expect(AutomationPerformanceStatsSchema.parse(localized)).toEqual(localized);
  });

  it('accepts hourly timestamps from an automatic-bucketing response', () => {
    const hourly = {
      ...stats,
      entries: [{ date: '2026-01-01T03:00:00Z', count: 1 }],
      entry_window: { ...stats.entry_window, bucket: 'hour' },
    };
    expect(AutomationPerformanceStatsSchema.parse(hourly)).toEqual(hourly);
  });

  it.each([
    { name: 'empty series', overrides: { entries: [] } },
    { name: 'invalid date', overrides: { entries: [{ date: '2026-02-30', count: 1 }] } },
    { name: 'negative total', overrides: { total_run_count: -1 } },
    {
      name: 'fractional entry count',
      overrides: { entries: [{ date: '2026-01-01', count: 1.5 }] },
    },
    ...[-1, null, 1.5, '4'].map((count) => ({
      name: `invalid status count (${JSON.stringify(count)})`,
      overrides: { completed_run_count: count },
    })),
  ])('rejects $name', ({ overrides }) => {
    expect(AutomationPerformanceStatsSchema.safeParse({ ...stats, ...overrides }).success).toBe(
      false,
    );
  });
});
