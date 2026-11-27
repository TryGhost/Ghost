import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPerformanceDateRange } from './performance-date-range';

const useDate = (date: string, timezone: string) => {
  // Keep native Intl so the browser timezone spy applies to its formatter.
  vi.useFakeTimers({ toFake: ['Date'] });
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
});
