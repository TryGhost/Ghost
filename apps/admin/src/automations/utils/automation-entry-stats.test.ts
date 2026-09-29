import { afterEach, describe, expect, it } from 'vitest';
import moment from 'moment-timezone';
import type { AutomationPerformanceStats } from '@tryghost/admin-x-framework/api/automations';
import { mapAutomationEntryStats } from './automation-entry-stats';

const history = (days: number): AutomationPerformanceStats => {
  const entries = Array.from({ length: days }, (_, i) => ({
    date: new Date(Date.UTC(2020, 0, 1 + i)).toISOString().slice(0, 10),
    count: 1,
  }));
  return {
    automation_id: 'one',
    total_run_count: days,
    in_progress_run_count: 0,
    completed_run_count: days,
    exited_early_run_count: 0,
    entries,
    entry_window: {
      date_from: entries[0].date,
      date_to: new Date(Date.UTC(2020, 0, 1 + days)).toISOString().slice(0, 10),
      bucket: 'day',
      timezone: 'UTC',
    },
  };
};

describe('automation entry chart mapping', () => {
  afterEach(() => moment.tz.setDefault());
  it.each([
    { days: 90, displayRange: 90 },
    { days: 91, displayRange: 91 },
    { days: 270, displayRange: 91 },
    { days: 271, displayRange: 366 },
    { days: 1500, displayRange: 366 },
  ])('groups $days days without losing entries', ({ days, displayRange }) => {
    const mapped = mapAutomationEntryStats(history(days));
    expect(mapped.range).toBe(displayRange);
    expect(mapped.points.reduce((sum, point) => sum + point.value, 0)).toBe(days);
    expect(mapped.points[0].date).toBe('2020-01-01');
    if (days < 91) {
      expect(mapped.points).toHaveLength(days);
    } else {
      expect(mapped.points.length).toBeLessThan(days);
    }
    expect(mapped.max).toBe(Math.max(...mapped.points.map((point) => point.value)));
  });

  it('sums monthly entries and formats the bucket total after aggregation', () => {
    const mapped = mapAutomationEntryStats(history(366));
    expect(mapped.points).toHaveLength(12);
    expect(mapped.points[0]).toMatchObject({ date: '2020-01-01', value: 31, formattedValue: '31' });
    expect(mapped.points[1]).toMatchObject({ date: '2020-02-01', value: 29, formattedValue: '29' });
  });

  it.each(['America/Los_Angeles', 'Pacific/Auckland'])(
    'preserves calendar dates in %s',
    (timezone) => {
      moment.tz.setDefault(timezone);
      const mapped = mapAutomationEntryStats(history(3));
      expect(mapped.points.map((point) => point.date)).toEqual([
        '2020-01-01',
        '2020-01-02',
        '2020-01-03',
      ]);
    },
  );

  it('preserves hourly points and zero gaps, including both repeated DST hours', () => {
    const stats = history(1);
    stats.entry_window = {
      date_from: '2024-11-03',
      date_to: '2024-11-04',
      bucket: 'hour',
      timezone: 'America/New_York',
    };
    stats.entries = [
      { date: '2024-11-03T04:00:00Z', count: 0 },
      { date: '2024-11-03T05:00:00Z', count: 1 },
      { date: '2024-11-03T06:00:00Z', count: 2 },
    ];
    stats.total_run_count = 3;
    const mapped = mapAutomationEntryStats(stats);
    expect(mapped).toMatchObject({
      range: 1,
      showHours: true,
      total: '3',
      startDate: '2024-11-03',
      endDate: '2024-11-03',
    });
    expect(mapped.points.map(({ date, value }) => ({ date, count: value }))).toEqual(stats.entries);
  });

  it('keeps an empty chart at zero with a usable axis', () => {
    const stats = history(1);
    stats.entries[0].count = 0;
    stats.total_run_count = 0;
    stats.completed_run_count = 0;
    expect(mapAutomationEntryStats(stats)).toMatchObject({ total: '0', max: 1 });
  });
});
