import { formatQueryDate, getRangeDates } from '@/shared/analytics/chart-helpers';

export const PERFORMANCE_RANGES = [
  { value: 'all', label: 'All time' },
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
] as const;

export type PerformanceRange = (typeof PERFORMANCE_RANGES)[number]['value'];
export type PerformanceDateRange = {
  value: PerformanceRange;
  searchParams: Record<string, string>;
};

// Capture calendar bounds when selected; opening/closing the panel does not move them.
export function createPerformanceDateRange(value: PerformanceRange): PerformanceDateRange {
  const { startDate, endDate, timezone } = getRangeDates(value === 'all' ? 1 : value);
  const searchParams: Record<string, string> = { timezone };
  if (value !== 'all') {
    searchParams.date_from = formatQueryDate(startDate);
    searchParams.date_to = formatQueryDate(endDate);
  }
  return { value, searchParams };
}
