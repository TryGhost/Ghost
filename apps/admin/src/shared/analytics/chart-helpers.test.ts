import moment from 'moment-timezone';
import { STATS_RANGES, STATS_RANGE_OPTIONS } from '@/shared/analytics/constants';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  centsToDollars,
  formatCustomRange,
  formatQueryDate,
  getAggregationStrategy,
  getCustomRangeDays,
  getSingleDay,
  getEffectiveChartRange,
  getPeriodText,
  getRangeDates,
  getRangeForStartDate,
  getStatsTimezone,
  setStatsTimezone,
  isCustomRange,
  resolveEffectiveRangeDays,
  sanitizeChartData,
  truncateLeadingEmptyData,
} from '@/shared/analytics/chart-helpers';

type ChartDataItem = {
  date: string;
  value: number;
  customField?: number;
  extra?: string;
};

const createDateRange = (
  days: number,
  startDate = '2024-01-01',
  value: number | ((i: number) => number) = 10,
): ChartDataItem[] => {
  const result: ChartDataItem[] = [];
  const start = moment(startDate);
  for (let i = 0; i < days; i++) {
    result.push({
      date: start.clone().add(i, 'days').format('YYYY-MM-DD'),
      value: typeof value === 'function' ? value(i) : value,
    });
  }
  return result;
};

describe('chart-helpers', () => {
  describe('getPeriodText', () => {
    it('returns correct text for known ranges', () => {
      const ranges = [
        { value: 7, expected: 'in the last 7 days' },
        { value: 30, expected: 'in the last 30 days' },
        { value: 90, expected: 'in the last 90 days' },
        { value: 365, expected: 'in the last 12 months' },
        { value: -1, expected: 'year to date' },
        { value: STATS_RANGES.allTime.value, expected: '(all time)' },
      ];

      ranges.forEach(({ value, expected }) => {
        expect(getPeriodText(value)).toBe(expected);
      });
    });

    it('returns empty string for unknown range', () => {
      expect(getPeriodText(-99)).toBe('');
    });

    it('returns lowercase name for non-standard range', () => {
      const customRange = { value: 999, name: 'Custom Range' };
      STATS_RANGE_OPTIONS.push(customRange);
      expect(getPeriodText(customRange.value)).toBe('custom range');
      STATS_RANGE_OPTIONS.pop(); // Clean up
    });
  });

  describe('truncateLeadingEmptyData', () => {
    it('removes leading zero entries, keeping one before first real data', () => {
      const data = [
        { date: '2024-01-01', value: 0 },
        { date: '2024-02-01', value: 0 },
        { date: '2024-03-01', value: 0 },
        { date: '2024-04-01', value: 0 },
        { date: '2024-05-01', value: 0 },
        { date: '2024-06-01', value: 0 }, // Should be kept (one before first real data)
        { date: '2024-07-01', value: 10 }, // First real data
        { date: '2024-08-01', value: 20 },
      ];

      const result = truncateLeadingEmptyData(data);

      expect(result.length).toBe(3);
      expect(result[0].date).toBe('2024-06-01');
      expect(result[1].date).toBe('2024-07-01');
      expect(result[2].date).toBe('2024-08-01');
    });

    it('returns data unchanged if first entry has data', () => {
      const data = [
        { date: '2024-01-01', value: 10 },
        { date: '2024-02-01', value: 20 },
      ];

      expect(truncateLeadingEmptyData(data)).toEqual(data);
    });

    it('returns data unchanged if only one leading zero', () => {
      const data = [
        { date: '2024-01-01', value: 0 },
        { date: '2024-02-01', value: 10 },
      ];

      expect(truncateLeadingEmptyData(data)).toEqual(data);
    });

    it('handles empty array', () => {
      expect(truncateLeadingEmptyData([])).toEqual([]);
    });

    it('handles all zero values', () => {
      const data = [
        { date: '2024-01-01', value: 0 },
        { date: '2024-02-01', value: 0 },
        { date: '2024-03-01', value: 0 },
      ];

      expect(truncateLeadingEmptyData(data)).toEqual(data);
    });

    it('preserves trailing zeros after real data', () => {
      const data = [
        { date: '2024-01-01', value: 0 },
        { date: '2024-02-01', value: 0 },
        { date: '2024-03-01', value: 10 },
        { date: '2024-04-01', value: 0 }, // Trailing zero should be kept
        { date: '2024-05-01', value: 0 }, // Trailing zero should be kept
      ];

      const result = truncateLeadingEmptyData(data);

      expect(result.length).toBe(4);
      expect(result[0].date).toBe('2024-02-01');
      expect(result[3].date).toBe('2024-05-01');
    });

    it('truncates based on a custom field', () => {
      const data = [
        { date: '2024-01-01', value: 5, visits: 0 },
        { date: '2024-01-02', value: 5, visits: 0 },
        { date: '2024-01-03', value: 5, visits: 0 },
        { date: '2024-01-04', value: 5, visits: 9 },
      ];

      const result = truncateLeadingEmptyData(data, 'visits');

      expect(result.length).toBe(2);
      expect(result[0].date).toBe('2024-01-03');
    });
  });

  describe('resolveEffectiveRangeDays', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-07-10T12:00:00'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns fixed ranges unchanged', () => {
      expect(resolveEffectiveRangeDays(31)).toBe(31);
      expect(resolveEffectiveRangeDays(372)).toBe(372);
    });

    it('resolves year to date to days elapsed since January 1st', () => {
      const days = resolveEffectiveRangeDays(STATS_RANGES.yearToDate.value);
      // Jan 1 to Jul 10 2024 inclusive
      expect(days).toBe(192);
    });

    it('resolves all time to the span of the supplied data', () => {
      const data = createDateRange(120);
      expect(resolveEffectiveRangeDays(STATS_RANGES.allTime.value, data)).toBe(120);
    });

    it('falls back to the full all time window without data', () => {
      const { startDate, endDate } = getRangeDates(STATS_RANGES.allTime.value);
      expect(resolveEffectiveRangeDays(STATS_RANGES.allTime.value)).toBe(
        endDate.diff(startDate, 'days') + 1,
      );
    });
  });

  describe('getAggregationStrategy', () => {
    it('applies the daily/weekly/monthly thresholds to fixed ranges', () => {
      expect(getAggregationStrategy(7)).toBe('none');
      expect(getAggregationStrategy(30)).toBe('none');
      expect(getAggregationStrategy(89)).toBe('none');
      expect(getAggregationStrategy(90)).toBe('weekly');
      expect(getAggregationStrategy(270)).toBe('weekly');
      expect(getAggregationStrategy(271)).toBe('monthly');
      expect(getAggregationStrategy(365)).toBe('monthly');
    });

    it('honors an override strategy', () => {
      expect(getAggregationStrategy(7, [], 'monthly')).toBe('monthly');
      expect(getAggregationStrategy(372, [], 'none')).toBe('none');
    });

    it('buckets year to date by days elapsed in the year', () => {
      vi.useFakeTimers();

      vi.setSystemTime(new Date('2024-02-15T12:00:00'));
      expect(getAggregationStrategy(STATS_RANGES.yearToDate.value)).toBe('none');

      vi.setSystemTime(new Date('2024-07-10T12:00:00'));
      expect(getAggregationStrategy(STATS_RANGES.yearToDate.value)).toBe('weekly');

      vi.setSystemTime(new Date('2024-12-30T12:00:00'));
      expect(getAggregationStrategy(STATS_RANGES.yearToDate.value)).toBe('monthly');

      vi.useRealTimers();
    });

    it('buckets all time by the span of the data', () => {
      expect(getAggregationStrategy(STATS_RANGES.allTime.value, createDateRange(30))).toBe('none');
      expect(getAggregationStrategy(STATS_RANGES.allTime.value, createDateRange(180))).toBe(
        'weekly',
      );
      expect(getAggregationStrategy(STATS_RANGES.allTime.value, createDateRange(300))).toBe(
        'monthly',
      );
      expect(getAggregationStrategy(STATS_RANGES.allTime.value, createDateRange(500))).toBe(
        'monthly',
      );
    });
  });

  describe('sanitizeChartData', () => {
    it('handles empty data', () => {
      expect(sanitizeChartData([], 30)).toEqual([]);
    });

    it('keeps daily data for ranges under 91 days', () => {
      const data = createDateRange(30);
      expect(sanitizeChartData(data, 30)).toEqual(data);
    });

    describe('weekly aggregation', () => {
      it('aggregates data weekly for 91-270 day ranges', () => {
        const data = createDateRange(91);
        const result = sanitizeChartData(data, 91);

        expect(result.length).toBeLessThan(data.length);
        expect(result.length).toBeGreaterThan(10);
      });

      it('labels every bucket with the week start', () => {
        const data = createDateRange(91);
        const result = sanitizeChartData(data, 91, 'value', 'sum');

        result.forEach((item) => {
          expect(item.date).toBe(moment(item.date).startOf('week').format('YYYY-MM-DD'));
        });
      });

      it('sums values within each week', () => {
        // 2024-01-01 is a Monday; the first (partial) week bucket is Dec 31-Jan 6
        const data = createDateRange(14, '2024-01-01');
        const result = sanitizeChartData(data, 91, 'value', 'sum', 'weekly');

        const total = result.reduce((sum, item) => sum + item.value, 0);
        expect(total).toBe(14 * 10);
      });

      it('averages values within each week', () => {
        const data = createDateRange(91);
        const result = sanitizeChartData(data, 91, 'value', 'avg');

        result.forEach((item) => {
          expect(item.value).toBe(10);
        });
      });

      it('uses the last value of each week for exact aggregation', () => {
        const data = createDateRange(91, '2024-01-01', (i) => i);
        const result = sanitizeChartData(data, 91, 'value', 'exact');

        // Last bucket carries the last cumulative value
        expect(result[result.length - 1].value).toBe(90);
        // Buckets are still labeled with the week start
        result.forEach((item) => {
          expect(item.date).toBe(moment(item.date).startOf('week').format('YYYY-MM-DD'));
        });
      });
    });

    describe('monthly aggregation', () => {
      it('aggregates data monthly for ranges over 356 days', () => {
        const data = createDateRange(365);
        const result = sanitizeChartData(data, 372, 'value', 'sum');

        expect(result.length).toBe(12);
      });

      it('labels every bucket with the first of the month for all aggregation types', () => {
        const data = createDateRange(365);

        (['sum', 'avg', 'exact'] as const).forEach((type) => {
          const result = sanitizeChartData(data, 372, 'value', type);
          result.forEach((item) => {
            expect(item.date).toBe(moment(item.date).startOf('month').format('YYYY-MM-DD'));
          });
        });
      });

      it('uses the last value of each month for exact aggregation', () => {
        const data = createDateRange(365, '2024-01-01', (i) => i + 1);
        const result = sanitizeChartData(data, 372, 'value', 'exact');

        expect(result[0].date).toBe('2024-01-01');
        expect(result[0].value).toBe(31); // Jan 31st cumulative value
        expect(result[result.length - 1].value).toBe(365);
      });

      it('handles data with gaps between months', () => {
        const data = [
          { date: '2024-01-15', value: 10 },
          { date: '2024-03-20', value: 30 },
          { date: '2024-06-10', value: 60 },
        ];
        const result = sanitizeChartData(data, 372, 'value', 'sum');

        expect(result.map((item) => item.date)).toEqual(['2024-01-01', '2024-03-01', '2024-06-01']);
      });

      it('preserves additional fields from the last item in each bucket', () => {
        const data = createDateRange(365).map((item, i) => ({
          ...item,
          customField: i,
          extra: `row-${i}`,
        }));
        const result = sanitizeChartData(data, 372, 'value', 'exact');

        expect(result[0].customField).toBe(30); // Jan 31st row
        expect(result[0].extra).toBe('row-30');
      });
    });

    describe('year to date', () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('keeps daily data early in the year', () => {
        vi.setSystemTime(new Date('2024-02-15T12:00:00'));
        const data = createDateRange(46);
        const result = sanitizeChartData(data, STATS_RANGES.yearToDate.value, 'value', 'sum');

        expect(result).toEqual(data);
      });

      it('aggregates weekly mid-year', () => {
        vi.setSystemTime(new Date('2024-07-10T12:00:00'));
        const data = createDateRange(192);
        const result = sanitizeChartData(data, STATS_RANGES.yearToDate.value, 'value', 'sum');

        expect(result.length).toBeLessThan(30);
        // The partial first bucket is labeled with the range start
        // (January 1st), not the enclosing calendar week of the
        // previous year
        expect(result[0].date).toBe('2024-01-01');
        result.slice(1).forEach((item) => {
          expect(item.date).toBe(moment(item.date).startOf('week').format('YYYY-MM-DD'));
        });
      });

      it('aggregates monthly at the end of the year', () => {
        vi.setSystemTime(new Date('2024-12-30T12:00:00'));
        const data = createDateRange(364);
        const result = sanitizeChartData(data, STATS_RANGES.yearToDate.value, 'value', 'sum');

        expect(result.length).toBe(12);
      });
    });

    describe('all time', () => {
      it('trims leading empty data before measuring the span', () => {
        // 1000-day fetch window padded with zeros; only the last 60 days are real
        const data = createDateRange(1000, '2022-01-01', (i) => (i >= 940 ? 5 : 0));
        const result = sanitizeChartData(data, STATS_RANGES.allTime.value, 'value', 'sum');

        // 61 remaining points (one kept zero + 60 real) span under 91 days: daily
        expect(result.length).toBe(61);
        expect(result[0].value).toBe(0);
        expect(result[1].value).toBe(5);
      });

      it('aggregates monthly when the trimmed data spans over a year', () => {
        const data = createDateRange(1000, '2022-01-01', () => 5);
        const result = sanitizeChartData(data, STATS_RANGES.allTime.value, 'value', 'sum');

        expect(result.length).toBeLessThan(40);
        result.forEach((item) => {
          expect(item.date).toBe(moment(item.date).startOf('month').format('YYYY-MM-DD'));
        });
      });

      it('labels the partial first bucket with the first data point, not the calendar month start', () => {
        // A post published mid-month, ~10 months old: monthly buckets
        const data = createDateRange(300, '2025-08-06', () => 5);
        const result = sanitizeChartData(data, STATS_RANGES.allTime.value, 'value', 'sum');

        expect(result[0].date).toBe('2025-08-06');
        expect(result[1].date).toBe('2025-09-01');
      });
    });

    it('honors an override strategy', () => {
      const data = createDateRange(40);
      const result = sanitizeChartData(data, 40, 'value', 'sum', 'monthly');

      expect(result.length).toBe(2); // Jan + Feb buckets
      expect(result[0].date).toBe('2024-01-01');
      expect(result[0].value).toBe(31 * 10);
    });

    it('aggregates a custom field', () => {
      const data = createDateRange(91).map((item) => ({ ...item, customField: 2 }));
      const result = sanitizeChartData(data, 91, 'customField', 'sum');

      const total = result.reduce((sum, item) => sum + (item.customField ?? 0), 0);
      expect(total).toBe(91 * 2);
    });
  });

  describe('getEffectiveChartRange', () => {
    it('passes fixed daily ranges through unchanged', () => {
      expect(getEffectiveChartRange(1, createDateRange(1))).toBe(1);
      expect(getEffectiveChartRange(31, createDateRange(31))).toBe(31);
    });

    it('maps weekly bucketing into the "Week of" display band', () => {
      expect(getEffectiveChartRange(180, createDateRange(180))).toBe(90);
    });

    it('maps monthly bucketing into the "MMM YYYY" display band', () => {
      expect(getEffectiveChartRange(300, createDateRange(300))).toBe(365);
      expect(getEffectiveChartRange(365, createDateRange(365))).toBe(365);
    });

    it('follows an override strategy', () => {
      expect(getEffectiveChartRange(31, createDateRange(31), { overrideStrategy: 'monthly' })).toBe(
        365,
      );
      expect(getEffectiveChartRange(31, createDateRange(31), { overrideStrategy: 'weekly' })).toBe(
        90,
      );
    });

    it('agrees with the bucketing of trimmed all time data', () => {
      const data = createDateRange(1000, '2022-01-01', (i) => (i >= 940 ? 5 : 0));
      // sanitizeChartData keeps this daily (61 real days), so the display
      // range must stay below the weekly band too
      expect(getEffectiveChartRange(STATS_RANGES.allTime.value, data)).toBe(61);
    });

    it('resolves year to date daily points to the elapsed span', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-02-15T12:00:00'));

      const data = createDateRange(46);
      expect(getEffectiveChartRange(STATS_RANGES.yearToDate.value, data)).toBe(46);

      vi.useRealTimers();
    });
  });

  describe('custom ranges', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-07-10T12:00:00'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('tells custom ranges apart from presets', () => {
      expect(isCustomRange({ from: '2024-06-01', to: '2024-06-30' })).toBe(true);
      expect(isCustomRange(STATS_RANGES.last30Days.value)).toBe(false);
      expect(isCustomRange(STATS_RANGES.yearToDate.value)).toBe(false);
    });

    it('counts both ends of the range', () => {
      expect(getCustomRangeDays({ from: '2024-06-01', to: '2024-06-30' })).toBe(30);
      expect(getCustomRangeDays({ from: '2024-06-01', to: '2024-06-01' })).toBe(1);
      expect(resolveEffectiveRangeDays({ from: '2023-12-25', to: '2024-01-07' })).toBe(14);
    });

    it('resolves to the start and end of the selected days', () => {
      const { startDate, endDate } = getRangeDates({ from: '2024-03-04', to: '2024-03-17' });

      expect(formatQueryDate(startDate)).toBe('2024-03-04');
      expect(formatQueryDate(endDate)).toBe('2024-03-17');
      expect(startDate.isSame(startDate.clone().startOf('day'))).toBe(true);
      expect(endDate.isSame(endDate.clone().endOf('day'))).toBe(true);
    });

    it('formats ranges, showing the year only outside the current one', () => {
      expect(formatCustomRange({ from: '2024-03-04', to: '2024-03-17' })).toBe('4 Mar – 17 Mar');
      expect(formatCustomRange({ from: '2024-03-04', to: '2024-03-04' })).toBe('4 Mar');
      expect(formatCustomRange({ from: '2023-03-04', to: '2023-04-17' })).toBe(
        '4 Mar – 17 Apr 2023',
      );
      expect(formatCustomRange({ from: '2023-12-20', to: '2024-01-05' })).toBe(
        '20 Dec 2023 – 5 Jan 2024',
      );
    });

    it('describes the period for subheads', () => {
      expect(getPeriodText({ from: '2024-03-04', to: '2024-03-17' })).toBe(
        'between 4 Mar and 17 Mar',
      );
      expect(getPeriodText({ from: '2023-12-20', to: '2024-01-05' })).toBe(
        'between 20 Dec 2023 and 5 Jan 2024',
      );
      expect(getPeriodText({ from: '2024-03-04', to: '2024-03-04' })).toBe('on 4 Mar');
    });

    it('buckets by the length of the range', () => {
      expect(getAggregationStrategy({ from: '2024-05-01', to: '2024-06-30' })).toBe('none');
      expect(getAggregationStrategy({ from: '2024-01-01', to: '2024-06-30' })).toBe('weekly');
      expect(getAggregationStrategy({ from: '2023-01-01', to: '2024-06-30' })).toBe('monthly');
    });

    it('labels the partial first bucket with the range start', () => {
      // 2024-01-03 is a Wednesday, mid-week
      const range = { from: '2024-01-03', to: '2024-06-30' };
      const data = createDateRange(getCustomRangeDays(range), range.from);
      const result = sanitizeChartData(data, range, 'value', 'sum');

      expect(result[0].date).toBe('2024-01-03');
      expect(result[1].date).toBe(
        moment('2024-01-03').add(1, 'week').startOf('week').format('YYYY-MM-DD'),
      );
    });

    it('finds the day a single-day range covers', () => {
      expect(getSingleDay(STATS_RANGES.today.value)).toBe('2024-07-10');
      expect(getSingleDay({ from: '2024-03-04', to: '2024-03-04' })).toBe('2024-03-04');
      expect(getSingleDay({ from: '2024-03-04', to: '2024-03-05' })).toBeNull();
      expect(getSingleDay(STATS_RANGES.last7Days.value)).toBeNull();
    });

    it('reports the range length for daily charts', () => {
      expect(getEffectiveChartRange({ from: '2024-06-01', to: '2024-06-10' })).toBe(10);
      // A single day reports 1, like Today, so visits chart by the hour
      expect(getEffectiveChartRange({ from: '2024-06-01', to: '2024-06-01' })).toBe(1);
      expect(getEffectiveChartRange({ from: '2024-01-01', to: '2024-06-30' })).toBe(90);
    });
  });

  describe('formatQueryDate', () => {
    it('formats a moment date for queries', () => {
      expect(formatQueryDate(moment('2023-04-15'))).toBe('2023-04-15');
    });
  });

  describe('centsToDollars', () => {
    it('converts cents to rounded dollars', () => {
      expect(centsToDollars(0)).toBe(0);
      expect(centsToDollars(1050)).toBe(11);
      expect(centsToDollars(123456)).toBe(1235);
    });
  });

  describe('getRangeForStartDate', () => {
    const currentTime = new Date('2026-05-28T09:00:00-04:00');
    const publishedAt = '2026-05-26T12:00:00-04:00';

    afterEach(() => {
      vi.useRealTimers();
    });

    it('counts calendar days inclusively before the publish time-of-day has passed', () => {
      vi.useFakeTimers();
      vi.setSystemTime(currentTime);

      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const expectedRange =
        moment(currentTime)
          .tz(timezone)
          .startOf('day')
          .diff(moment(publishedAt).tz(timezone).startOf('day'), 'days') + 1;

      expect(getRangeForStartDate(publishedAt)).toBe(expectedRange);
    });

    it('never lands on the All time marker, however old the post', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-10-21T12:00:00Z'));

      // 999 days ago: a 1,000-day range, which All time used to be
      expect(getRangeForStartDate('2024-01-26T12:00:00Z')).toBe(1000);
      expect(getRangeForStartDate('2024-01-26T12:00:00Z')).not.toBe(STATS_RANGES.allTime.value);
    });

    it('produces a date range that includes the publish calendar day', () => {
      vi.useFakeTimers();
      vi.setSystemTime(currentTime);

      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const expectedStartDate = moment(publishedAt).tz(timezone).startOf('day');

      const range = getRangeForStartDate(publishedAt);
      const { startDate } = getRangeDates(range);

      expect(formatQueryDate(startDate)).toBe(formatQueryDate(expectedStartDate));
    });
  });

  describe('All time', () => {
    it('starts on 1 January 2013, so a site’s whole history shows', () => {
      const { startDate } = getRangeDates(STATS_RANGES.allTime.value);
      expect(formatQueryDate(startDate)).toBe('2013-01-01');
    });

    it('charts a long history as months', () => {
      const data = createDateRange(3000, '2017-06-01', () => 5);
      expect(getAggregationStrategy(STATS_RANGES.allTime.value, data)).toBe('monthly');
    });
  });

  describe('the site timezone', () => {
    afterEach(() => {
      setStatsTimezone(null);
    });

    it('counts days in the site timezone once it is known', () => {
      setStatsTimezone('Asia/Tokyo');

      const { startDate, timezone } = getRangeDates(STATS_RANGES.last7Days.value);

      expect(getStatsTimezone()).toBe('Asia/Tokyo');
      expect(timezone).toBe('Asia/Tokyo');
      expect(startDate.tz()).toBe('Asia/Tokyo');
    });

    it('takes Today from the site clock, which near midnight can be a day ahead', () => {
      vi.useFakeTimers();
      // 8pm on the 20th in UTC is already 5am on the 21st in Tokyo
      vi.setSystemTime(new Date('2026-10-20T20:00:00Z'));
      setStatsTimezone('Asia/Tokyo');

      try {
        expect(getSingleDay(STATS_RANGES.today.value)).toBe('2026-10-21');
      } finally {
        vi.useRealTimers();
      }
    });

    it('uses the viewer timezone until then', () => {
      expect(getStatsTimezone()).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
    });
  });
});
