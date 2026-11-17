import moment from 'moment-timezone';
import { STATS_RANGES, STATS_RANGE_OPTIONS } from '@/shared/analytics/constants';
import { formatPercentage } from '@tryghost/shade/utils';
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

// Site-local dates, so the server's buckets line up with the list's date filters
export function getCommentsStatsSearchParams(range: number, timezone: string) {
  const today = moment().tz(timezone);
  const start =
    range === STATS_RANGES.yearToDate.value
      ? today.clone().startOf('year')
      : today.clone().subtract(range - 1, 'days');

  return {
    date_from: start.format('YYYY-MM-DD'),
    date_to: today.format('YYYY-MM-DD'),
    timezone,
  };
}

export type CommentsTrend = {
  direction: 'up' | 'down' | 'same' | 'hidden';
  value: string;
};

export function getTrend(current: number, previous: number, range: number): CommentsTrend {
  if (range === STATS_RANGES.allTime.value || previous === 0) {
    return { direction: 'hidden', value: '' };
  }
  const change = (current - previous) / previous;
  if (change === 0) {
    return { direction: 'same', value: '0%' };
  }
  return {
    direction: change > 0 ? 'up' : 'down',
    value: `${change > 0 ? '+' : '-'}${formatPercentage(Math.abs(change))}`,
  };
}

export function getComparisonText(range: number): string {
  if (range === STATS_RANGES.yearToDate.value) {
    return 'Compared to the same number of days before January 1';
  }
  return `Compared to the previous ${range} days`;
}

// Day counts that make Shade's date formatters read as day, week or month
export const DISPLAY_RANGE_BY_INTERVAL: Record<CommentsStatsInterval, number> = {
  day: 30,
  week: 90,
  month: 365,
};
