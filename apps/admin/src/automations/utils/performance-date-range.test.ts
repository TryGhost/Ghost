import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPerformanceDateRange, matchesPerformanceDateRange } from './performance-date-range';
import type { AutomationEntryStats } from '@tryghost/admin-x-framework/api/automations';

const useDate = (date: string, timezone: string) => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(date));
  const original = Intl.DateTimeFormat().resolvedOptions();
  vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
    ...original,
    timeZone: timezone,
  });
};
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('performance date selections', () => {
  it('requests unbounded all-time data in the browser timezone', () => {
    useDate('2024-03-11T02:00:00Z', 'America/New_York');
    expect(createPerformanceDateRange('all')).toEqual({
      value: 'all',
      searchParams: { timezone: 'America/New_York' },
    });
  });

  it.each([
    { days: 7, start: '2024-03-04' },
    { days: 30, start: '2024-02-10' },
    { days: 90, start: '2023-12-12' },
  ] as const)(
    'includes today and the preceding days in a $days-day local range',
    ({ days, start }) => {
      useDate('2024-03-11T02:00:00Z', 'America/New_York');
      expect(createPerformanceDateRange(days).searchParams).toEqual({
        timezone: 'America/New_York',
        date_from: start,
        date_to: '2024-03-10',
      });
    },
  );

  it('rejects a response for different bounds or timezone', () => {
    useDate('2024-03-11T02:00:00Z', 'America/New_York');
    const range = createPerformanceDateRange(7);
    const stats: AutomationEntryStats = {
      automation_id: 'one',
      total_run_count: 0,
      entries: [{ date: '2024-03-04', count: 0 }],
      window: {
        date_from: '2024-03-04',
        date_to: '2024-03-11',
        bucket: 'day',
        timezone: 'America/New_York',
      },
    };
    expect(matchesPerformanceDateRange(stats, range)).toBe(true);
    for (const window of [
      { ...stats.window, date_from: '2020-01-01' },
      { ...stats.window, date_to: '2024-03-10' },
      { ...stats.window, timezone: 'UTC' },
    ]) {
      expect(matchesPerformanceDateRange({ ...stats, window }, range)).toBe(false);
    }
  });
});
