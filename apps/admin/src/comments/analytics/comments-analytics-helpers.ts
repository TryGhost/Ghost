import { STATS_RANGES, STATS_RANGE_OPTIONS } from '@/shared/analytics/constants';
import { formatPercentage } from '@tryghost/shade/utils';
import { formatQueryDate, getRangeDates } from '@/shared/analytics/chart-helpers';
import type { CommentsStatsInterval } from '@tryghost/admin-x-framework/api/stats';

export const COMMENTS_ANALYTICS_TABS = ['comments', 'commenters', 'reported'] as const;
export type CommentsAnalyticsTab = (typeof COMMENTS_ANALYTICS_TABS)[number];

export const DEFAULT_COMMENTS_ANALYTICS_RANGE = STATS_RANGES.last30Days.value;

export function parseRangeParam(value: string | null): number {
  const range = Number(value);
  return STATS_RANGE_OPTIONS.some((option) => option.value === range)
    ? range
    : DEFAULT_COMMENTS_ANALYTICS_RANGE;
}

export function parseTabParam(value: string | null): CommentsAnalyticsTab {
  return COMMENTS_ANALYTICS_TABS.find((tab) => tab === value) ?? 'comments';
}

// Site-local dates, so the server's buckets line up with the list's date filters.
// All time sends no date_from: Core starts it at the first comment.
export function getCommentsStatsSearchParams(
  range: number,
  timezone: string,
): Record<string, string> {
  const { startDate, endDate } = getRangeDates(range, timezone);
  return {
    ...(range === STATS_RANGES.allTime.value ? {} : { date_from: formatQueryDate(startDate) }),
    date_to: formatQueryDate(endDate),
    timezone,
  };
}

export type CommentsTrend = {
  direction: 'up' | 'down' | 'hidden';
  value: string;
};

export function getTrend(current: number, previous: number, range: number): CommentsTrend {
  if (range === STATS_RANGES.allTime.value || previous === 0) {
    return { direction: 'hidden', value: '' };
  }
  const change = (current - previous) / previous;
  if (change === 0) {
    return { direction: 'hidden', value: '' };
  }
  return {
    direction: change > 0 ? 'up' : 'down',
    value: `${change > 0 ? '+' : '-'}${formatPercentage(Math.abs(change))}`,
  };
}

export function getComparisonText(value: string, range: number): string {
  if (range === STATS_RANGES.yearToDate.value) {
    return `${value} compared to the same number of days before January 1`;
  }
  if (range === STATS_RANGES.today.value) {
    return `${value} compared to the previous day`;
  }
  return `${value} compared to the previous ${range} days`;
}

// Day counts that make Shade's date formatters read as day, week or month
export const DISPLAY_RANGE_BY_INTERVAL: Record<CommentsStatsInterval, number> = {
  day: 30,
  week: 90,
  month: 365,
};
