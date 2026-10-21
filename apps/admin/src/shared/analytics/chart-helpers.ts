import moment, { type Moment } from 'moment-timezone';
import { ALL_TIME_START, STATS_RANGES, STATS_RANGE_OPTIONS } from './constants';

export type AggregationType = 'sum' | 'avg' | 'exact';

export type AggregationStrategy = 'none' | 'weekly' | 'monthly';

// Format date for stats query
export const formatQueryDate = (date: Moment) => {
  return date.format('YYYY-MM-DD');
};

// Format cents to Dollars
export const centsToDollars = (value: number) => {
  return Math.round(value / 100);
};

// Where the site's history starts (YYYY-MM-DD): its first published post or
// page, first member or first visit, whichever came first. Loaded once when
// Analytics opens (useAllTimeStart); until then All time starts at the floor
let siteHistoryStart: string | null = null;

export const setAllTimeStart = (date: string | null) => {
  siteHistoryStart = date;
};

/** The day All time starts: where the site's history does, never before ALL_TIME_START */
export const getAllTimeStart = (): string =>
  siteHistoryStart && siteHistoryStart > ALL_TIME_START ? siteHistoryStart : ALL_TIME_START;

/**
 * A date range picked on the calendar: inclusive calendar dates (YYYY-MM-DD)
 * read in the viewer's timezone, the same frame preset ranges resolve in.
 */
export interface CustomDateRange {
  from: string;
  to: string;
}

/**
 * A date range selection: either a preset (a day count or one of the
 * STATS_RANGES sentinels) or a custom pair of dates.
 */
export type StatsRange = number | CustomDateRange;

export const isCustomRange = (range: StatsRange): range is CustomDateRange => {
  return typeof range === 'object';
};

// Number of calendar days a custom range covers, counting both ends
export const getCustomRangeDays = ({ from, to }: CustomDateRange): number => {
  return moment(to).diff(moment(from), 'days') + 1;
};

// The one day a single-day range covers (Today or a one-day custom range),
// as YYYY-MM-DD, or null for longer ranges
export const getSingleDay = (range: StatsRange): string | null => {
  if (range === STATS_RANGES.today.value) {
    return moment().format('YYYY-MM-DD');
  }
  if (isCustomRange(range) && range.from === range.to) {
    return range.from;
  }
  return null;
};

// Formats the two ends of a custom range for display, dropping the year when
// the whole range falls in the current year and repeating it only when the
// range crosses a year boundary
const formatCustomRangeEnds = ({ from, to }: CustomDateRange): [string, string] => {
  const start = moment(from);
  const end = moment(to);
  const currentYear = moment().year();
  const showYear = start.year() !== currentYear || end.year() !== currentYear;
  const startFormat = showYear && start.year() !== end.year() ? 'D MMM YYYY' : 'D MMM';
  const endFormat = showYear ? 'D MMM YYYY' : 'D MMM';

  return [start.format(startFormat), end.format(endFormat)];
};

// Formats a custom range for display, e.g. "3 Jan – 14 Feb" or "3 Jan"
export const formatCustomRange = (range: CustomDateRange): string => {
  const [start, end] = formatCustomRangeEnds(range);
  return range.from === range.to ? end : `${start} – ${end}`;
};

// Servers that can answer a single day by the hour say so in the response
export const hasHourlyInterval = (response: unknown): boolean =>
  (response as { meta?: { interval?: string } } | undefined)?.meta?.interval === 'hour';

// The timezone Analytics counts days in: the site's own (Settings → General),
// so everyone on a team sees the same days, and they match the post dates
// shown alongside. Set once Analytics has the site's settings
// (useStatsTimezone); until then, the viewer's
let statsTimezone: string | null = null;

export const setStatsTimezone = (timezone: string | null) => {
  statsTimezone = timezone;
};

export const getStatsTimezone = (): string =>
  statsTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

// Return the start and end dates for a range selection
export const getRangeDates = (range: StatsRange) => {
  const timezone = getStatsTimezone();

  if (isCustomRange(range)) {
    return {
      startDate: moment.tz(range.from, timezone).startOf('day'),
      endDate: moment.tz(range.to, timezone).endOf('day'),
      timezone,
    };
  }

  const endDate = moment().tz(timezone).endOf('day');
  let startDate;

  if (range === -1) {
    // Year to date - use January 1st of current year
    startDate = moment().tz(timezone).startOf('year');
  } else if (range === STATS_RANGES.allTime.value) {
    // All time starts where the site's history does, however old it is,
    // imported posts and members included
    startDate = moment.tz(getAllTimeStart(), timezone).startOf('day');
  } else {
    // Regular range calculation
    startDate = moment()
      .tz(timezone)
      .subtract(range - 1, 'days')
      .startOf('day');
  }

  return { startDate, endDate, timezone };
};

// Get range for date
export const getRangeForStartDate = (startDate: string) => {
  const timezone = getStatsTimezone();
  const publishedDate = moment(startDate).tz(timezone).startOf('day');
  const today = moment().tz(timezone).startOf('day');
  const diffInDays = today.diff(publishedDate, 'days') + 1;

  // Ensure minimum of 1 day to avoid issues with same-day publications
  return Math.max(diffInDays, 1);
};

// formatDisplayDateWithRange (Shade) and GhAreaChart derive their tick/tooltip
// format from a range day count: > 365 renders "MMM YYYY", >= 91 renders
// "Week of ...", anything below renders a plain date. These constants are the
// smallest values that land in each display band.
const WEEKLY_DISPLAY_RANGE = 91;
const MONTHLY_DISPLAY_RANGE = 366;

/**
 * Returns additional text for subheads
 */
export const getPeriodText = (range: StatsRange): string => {
  if (isCustomRange(range)) {
    const [start, end] = formatCustomRangeEnds(range);
    return range.from === range.to ? `on ${end}` : `between ${start} and ${end}`;
  }
  const option = STATS_RANGE_OPTIONS.find(
    (opt: { value: number; name: string }) => opt.value === range,
  );
  if (option) {
    if (['Last 7 days', 'Last 30 days', 'Last 90 days', 'Last 12 months'].includes(option.name)) {
      return `in the ${option.name.toLowerCase()}`;
    }
    if (option.name === 'All time') {
      return '(all time)';
    }
    return option.name.toLowerCase();
  }
  return '';
};

/**
 * Truncates leading empty data points from the beginning of a dataset,
 * keeping one zero entry before the first real data for a smooth chart transition.
 * Ultimately, we should fix the API to return only what we want to see.
 * https://linear.app/ghost/issue/NY-1035/
 */
export function truncateLeadingEmptyData<T>(
  data: T[],
  fieldName: keyof T = 'value' as keyof T,
): T[] {
  const firstNonEmptyIndex = data.findIndex((item) => Number(item[fieldName]) > 0);
  if (firstNonEmptyIndex > 1) {
    // Keep one zero entry before the first real data
    return data.slice(firstNonEmptyIndex - 1);
  }
  return data;
}

/**
 * Resolves a range selection to the number of days the chart actually spans.
 * Fixed ranges are already day counts and custom ranges count their days;
 * the sentinels need resolving:
 * - Year to date (-1) resolves to the days elapsed since January 1st
 * - All time (100000) resolves to the span of the supplied data — the fetch
 *   window starts where the site's history does, but a post has far less
 *   real data (pass data with leading empty rows already trimmed)
 */
export function resolveEffectiveRangeDays(
  range: StatsRange,
  data: { date: string }[] = [],
): number {
  if (isCustomRange(range)) {
    return getCustomRangeDays(range);
  }
  if (range === STATS_RANGES.yearToDate.value) {
    const { startDate, endDate } = getRangeDates(range);
    return endDate.diff(startDate, 'days') + 1;
  }
  if (range === STATS_RANGES.allTime.value) {
    if (data.length > 0) {
      return moment(data[data.length - 1].date).diff(moment(data[0].date), 'days') + 1;
    }
    const { startDate, endDate } = getRangeDates(range);
    return endDate.diff(startDate, 'days') + 1;
  }
  return range;
}

/**
 * Determines the bucketing for a chart. One rule for every range, including
 * the sentinels (via resolveEffectiveRangeDays): spans under 91 days render
 * daily points, 91-270 days render weekly buckets, anything longer renders
 * monthly buckets. The weekly band caps at ~9 months because beyond that
 * weekly charts get too dense (~40+ points) while monthly already gives a
 * readable 9-12; only span-resolved ranges (Year to date, All time, post age)
 * can land between the fixed dropdown options of 91 and 372 days.
 */
export function getAggregationStrategy(
  range: StatsRange,
  data: { date: string }[] = [],
  overrideStrategy?: AggregationStrategy,
): AggregationStrategy {
  if (overrideStrategy) {
    return overrideStrategy;
  }

  const effectiveDays = resolveEffectiveRangeDays(range, data);

  if (effectiveDays > 270) {
    return 'monthly';
  }
  if (effectiveDays >= 91) {
    return 'weekly';
  }
  return 'none';
}

function calculateAggregatedValue(
  total: number,
  count: number,
  lastValue: number,
  type: AggregationType,
): number {
  switch (type) {
    case 'sum':
      return total;
    case 'avg':
      return count > 0 ? total / count : 0;
    case 'exact':
      return lastValue;
  }
}

/**
 * Aggregates daily data into weekly or monthly buckets. Every bucket is
 * labeled with its period START date regardless of aggregation type, so
 * sum/avg charts (e.g. web visits) and exact charts (e.g. member totals)
 * place points on the same dates. Non-aggregated fields keep the values of
 * the last item in the period.
 *
 * The one exception is the partial first bucket: the calendar period
 * containing the start of a range usually begins before the range does, and
 * labeling that bucket with the calendar period start dates the chart before
 * its own range — a Year to date chart opening with "Week of 28 Dec" of the
 * previous year. When labelFloor falls inside the first bucket's period, the
 * first label is clamped to it.
 */
function aggregateByPeriod<T extends { date: string }>(
  data: T[],
  fieldName: keyof T,
  aggregationType: AggregationType,
  unit: 'week' | 'month',
  labelFloor?: string,
): T[] {
  const aggregated: T[] = [];
  let periodStart = moment(data[0].date).startOf(unit);
  let total = 0;
  let count = 0;
  let lastItem = data[0];

  const pushBucket = () => {
    aggregated.push({
      ...lastItem,
      date: periodStart.format('YYYY-MM-DD'),
      [fieldName]: calculateAggregatedValue(
        total,
        count,
        Number(lastItem[fieldName]),
        aggregationType,
      ),
    });
  };

  data.forEach((item) => {
    const itemDate = moment(item.date);
    if (!itemDate.isSame(periodStart, unit)) {
      pushBucket();
      periodStart = itemDate.clone().startOf(unit);
      total = 0;
      count = 0;
    }
    total += Number(item[fieldName]);
    count += 1;
    lastItem = item;
  });
  pushBucket();

  const first = aggregated[0];
  if (
    labelFloor &&
    labelFloor > first.date &&
    moment(labelFloor).isSame(moment(first.date), unit)
  ) {
    aggregated[0] = { ...first, date: labelFloor };
  }

  return aggregated;
}

/**
 * The date the first bucket's label may be clamped to: where the range
 * actually starts. All time has no calendar anchor, so its floor is the
 * first (trimmed) data point.
 */
function getFirstBucketFloor(range: StatsRange, chartData: { date: string }[]): string {
  if (range === STATS_RANGES.allTime.value) {
    return chartData[0].date;
  }
  const { startDate } = getRangeDates(range);
  return startDate.format('YYYY-MM-DD');
}

function trimForRange<T extends { date: string }>(
  data: T[],
  range: StatsRange,
  fieldName: keyof T,
): T[] {
  // The All time fetch window is padded with empty leading rows by the API;
  // trim them so both the span measurement and the chart reflect real data
  if (range === STATS_RANGES.allTime.value) {
    return truncateLeadingEmptyData(data, fieldName);
  }
  return data;
}

/**
 * Sanitizes chart data based on the date range
 * - Spans under 91 days keep daily points
 * - Spans of 91-270 days aggregate into weekly buckets
 * - Longer spans aggregate into monthly buckets
 * Year to date and All time resolve to their real spans before the rule is
 * applied, so they bucket like the equivalent fixed range would.
 * @param data The chart data to sanitize
 * @param range The date range in days (or a STATS_RANGES sentinel), or a custom range
 * @param fieldName The name of the field to aggregate
 * @param aggregationType The type of aggregation to use: 'sum', 'avg', or 'exact'
 * @param overrideStrategy Forces a specific bucketing regardless of range
 */
export const sanitizeChartData = <T extends { date: string }>(
  data: T[],
  range: StatsRange,
  fieldName: keyof T = 'value' as keyof T,
  aggregationType: AggregationType = 'avg',
  overrideStrategy?: AggregationStrategy,
): T[] => {
  if (!data.length) {
    return [];
  }

  const chartData = trimForRange(data, range, fieldName);
  const strategy = getAggregationStrategy(range, chartData, overrideStrategy);

  switch (strategy) {
    case 'weekly':
      return aggregateByPeriod(
        chartData,
        fieldName,
        aggregationType,
        'week',
        getFirstBucketFloor(range, chartData),
      );
    case 'monthly':
      return aggregateByPeriod(
        chartData,
        fieldName,
        aggregationType,
        'month',
        getFirstBucketFloor(range, chartData),
      );
    default:
      return chartData;
  }
};

/**
 * Returns the range day count to hand to range-driven display helpers
 * (GhAreaChart, formatDisplayDateWithRange) so that tick and tooltip formats
 * match the bucketing sanitizeChartData applied: monthly buckets read as
 * "MMM YYYY", weekly buckets as "Week of ...", daily points as plain dates.
 * Pass the same raw data and field given to sanitizeChartData.
 */
export function getEffectiveChartRange<T extends { date: string }>(
  range: StatsRange,
  data: T[] = [],
  options: { fieldName?: keyof T; overrideStrategy?: AggregationStrategy } = {},
): number {
  const fieldName = options.fieldName ?? ('value' as keyof T);
  const chartData = trimForRange(data, range, fieldName);
  const strategy = getAggregationStrategy(range, chartData, options.overrideStrategy);

  switch (strategy) {
    case 'monthly':
      return MONTHLY_DISPLAY_RANGE;
    case 'weekly':
      return WEEKLY_DISPLAY_RANGE;
    default:
      // A single custom day reports 1, matching Today: both fetch hourly
      // visitor data
      if (isCustomRange(range)) {
        return getCustomRangeDays(range);
      }
      if (range > 0 && range !== STATS_RANGES.allTime.value) {
        return range;
      }
      // Sentinel ranges with daily points: report the resolved span, and
      // never 1 — that would trigger the hourly "Today" display format
      return Math.max(resolveEffectiveRangeDays(range, chartData), 2);
  }
}
