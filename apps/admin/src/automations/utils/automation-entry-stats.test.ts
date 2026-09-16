import { afterEach, describe, expect, it } from 'vitest';
import moment from 'moment-timezone';
import {
  AutomationEntryStatsSchema,
  type AutomationEntryStats,
} from '@tryghost/admin-x-framework/api/automations';
import { mapAutomationEntryStats, mapAutomationSearchEntries } from './automation-entry-stats';

const history = (days: number): AutomationEntryStats => {
  const entries = Array.from({ length: days }, (_, i) => ({
    date: new Date(Date.UTC(2020, 0, 1 + i)).toISOString().slice(0, 10),
    count: 1,
  }));
  return {
    automation_id: 'one',
    total_run_count: days,
    entries,
    window: {
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

  it('preserves leading zero days in a selected range', () => {
    const stats = history(30);
    stats.entries.forEach((entry, index) => {
      entry.count = index === 29 ? 2 : 0;
    });
    stats.total_run_count = 2;
    const mapped = mapAutomationEntryStats(stats, 30);
    expect(mapped.points).toHaveLength(30);
    expect(mapped.points[0]).toMatchObject({ date: '2020-01-01', value: 0 });
    expect(mapped.total).toBe('2');
  });

  it('keeps an empty chart at zero with a usable axis', () => {
    const stats = history(1);
    stats.entries[0].count = 0;
    stats.total_run_count = 0;
    expect(mapAutomationEntryStats(stats)).toMatchObject({ total: '0', max: 1, empty: true });
  });
});

describe('automation statistics response validation', () => {
  it.each([
    { name: 'empty series', value: { ...history(1), entries: [] } },
    { name: 'invalid date', value: { ...history(1), entries: [{ date: '2020-02-30', count: 1 }] } },
    { name: 'negative total', value: { ...history(1), total_run_count: -1 } },
    {
      name: 'fractional count',
      value: { ...history(1), entries: [{ date: '2020-01-01', count: 1.5 }] },
    },
  ])('rejects an entry response with $name', ({ value }) => {
    expect(AutomationEntryStatsSchema.safeParse(value).success).toBe(false);
  });
});

describe('searched entry chart', () => {
  it('fills missing calendar days across daylight saving without changing the total', () => {
    const chart = mapAutomationSearchEntries(
      [
        { date: '2024-03-09', count: 2 },
        { date: '2024-03-11', count: 1 },
      ],
      {
        value: 7,
        searchParams: {
          timezone: 'America/New_York',
          date_from: '2024-03-09',
          date_to: '2024-03-11',
        },
      },
    );
    expect(chart.points.map(({ date, value }) => [date, value])).toEqual([
      ['2024-03-09', 2],
      ['2024-03-10', 0],
      ['2024-03-11', 1],
    ]);
    expect(chart.total).toBe('3');
  });
  it('uses the viewer’s calendar day for empty all-time results', () => {
    const chart = mapAutomationSearchEntries(
      [],
      { value: 'all', searchParams: { timezone: 'America/New_York' } },
      new Date('2026-09-22T01:00:00Z'),
    );
    expect(chart.startDate).toBe('2026-09-21');
    expect(chart.endDate).toBe('2026-09-21');
    expect(chart.empty).toBe(true);
  });
});
