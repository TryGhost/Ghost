import { STATS_RANGES, STATS_RANGE_OPTIONS } from '@/shared/analytics/constants';
import { formatPercentage } from '@tryghost/shade/utils';
import { formatQueryDate, getRangeDates } from '@/shared/analytics/chart-helpers';
import type { CommentsStatsInterval } from '@tryghost/admin-x-framework/api/stats';
import moment from 'moment-timezone';

export const COMMENTS_ANALYTICS_TABS = ['comments', 'commenters', 'reported'] as const;
export type CommentsAnalyticsTab = (typeof COMMENTS_ANALYTICS_TABS)[number];

export const DEFAULT_COMMENTS_ANALYTICS_RANGE = STATS_RANGES.allTime.value;
export const CUSTOM_COMMENTS_RANGE = -2;
export const MAX_COMMENTS_RANGE_DAYS = 3660;
export type CommentsCustomRange = { from: string; to: string };

export function parseRangeParam(value: string | null): number {
  if (value === 'custom') {
    return CUSTOM_COMMENTS_RANGE;
  }
  const range = Number(value);
  return STATS_RANGE_OPTIONS.some((option) => option.value === range)
    ? range
    : DEFAULT_COMMENTS_ANALYTICS_RANGE;
}

export function parseCommentsCustomRange(
  from: string | null,
  to: string | null,
  timezone: string,
): CommentsCustomRange | undefined {
  if (!from || !to) {
    return undefined;
  }
  const start = moment.tz(from, 'YYYY-MM-DD', true, timezone);
  const end = moment.tz(to, 'YYYY-MM-DD', true, timezone);
  if (
    !start.isValid() ||
    !end.isValid() ||
    from > to ||
    to > moment().tz(timezone).format('YYYY-MM-DD') ||
    end.diff(start, 'days') + 1 > MAX_COMMENTS_RANGE_DAYS
  ) {
    return undefined;
  }
  return { from, to };
}

export function parseTabParam(value: string | null): CommentsAnalyticsTab {
  return COMMENTS_ANALYTICS_TABS.find((tab) => tab === value) ?? 'comments';
}

// Site-local dates, so the server's buckets line up with the list's date filters.
// All time sends no date_from: Core starts it at the first comment.
export function getCommentsStatsSearchParams(
  range: number,
  timezone: string,
  customRange?: CommentsCustomRange,
): Record<string, string> {
  if (range === CUSTOM_COMMENTS_RANGE && customRange) {
    return { date_from: customRange.from, date_to: customRange.to, timezone };
  }
  const { startDate, endDate } = getRangeDates(range, timezone);
  return {
    ...(range === STATS_RANGES.allTime.value ? {} : { date_from: formatQueryDate(startDate) }),
    date_to: formatQueryDate(endDate),
    timezone,
  };
}

// Stats accepts inclusive site-local dates; the list accepts UTC timestamps.
// Keep these bounds half-open so midnight and DST transitions agree exactly.
export function getCommentsListFilter(
  range: number,
  timezone: string,
  filter?: string,
  customRange?: CommentsCustomRange,
): string {
  const dates = getCommentsStatsSearchParams(range, timezone, customRange);
  const from =
    dates.date_from ??
    moment
      .tz(dates.date_to, timezone)
      .subtract(MAX_COMMENTS_RANGE_DAYS - 1, 'days')
      .format('YYYY-MM-DD');
  const start = moment.tz(from, timezone).startOf('day').toISOString();
  const end = moment.tz(dates.date_to, timezone).add(1, 'day').startOf('day').toISOString();
  const bounds = `created_at:>='${start}'+created_at:<'${end}'`;
  return filter ? `(${filter})+${bounds}` : bounds;
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
