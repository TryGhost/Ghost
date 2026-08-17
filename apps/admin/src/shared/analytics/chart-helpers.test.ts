import moment from 'moment-timezone';
import {STATS_RANGES, STATS_RANGE_OPTIONS} from '@/shared/analytics/constants';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
    getAggregationStrategy,
    getEffectiveChartRange,
    getPeriodText,
    resolveEffectiveRangeDays,
    sanitizeChartData,
    truncateLeadingEmptyData
} from '@/shared/analytics/chart-helpers';

type ChartDataItem = {
    date: string;
    value: number;
    customField?: number;
    extra?: string;
};

const createDateRange = (days: number, startDate = '2024-01-01', value: number | ((i: number) => number) = 10): ChartDataItem[] => {
    const result: ChartDataItem[] = [];
    const start = moment(startDate);
    for (let i = 0; i < days; i++) {
        result.push({
            date: start.clone().add(i, 'days').format('YYYY-MM-DD'),
            value: typeof value === 'function' ? value(i) : value
        });
    }
    return result;
};

describe('chart-helpers', () => {
    describe('getPeriodText', () => {
        it('returns correct text for known ranges', () => {
            const ranges = [
                {value: 7, expected: 'in the last 7 days'},
                {value: 31, expected: 'in the last 30 days'},
                {value: 91, expected: 'in the last 90 days'},
                {value: 372, expected: 'in the last 12 months'},
                {value: -1, expected: 'year to date'},
                {value: 1000, expected: '(all time)'}
            ];

            ranges.forEach(({value, expected}) => {
                expect(getPeriodText(value)).toBe(expected);
            });
        });

        it('returns empty string for unknown range', () => {
            expect(getPeriodText(-99)).toBe('');
        });

        it('returns lowercase name for non-standard range', () => {
            const customRange = {value: 999, name: 'Custom Range'};
            STATS_RANGE_OPTIONS.push(customRange);
            expect(getPeriodText(customRange.value)).toBe('custom range');
            STATS_RANGE_OPTIONS.pop(); // Clean up
        });
    });

    describe('truncateLeadingEmptyData', () => {
        it('removes leading zero entries, keeping one before first real data', () => {
            const data = [
                {date: '2024-01-01', value: 0},
                {date: '2024-02-01', value: 0},
                {date: '2024-03-01', value: 0},
                {date: '2024-04-01', value: 0},
                {date: '2024-05-01', value: 0},
                {date: '2024-06-01', value: 0}, // Should be kept (one before first real data)
                {date: '2024-07-01', value: 10}, // First real data
                {date: '2024-08-01', value: 20}
            ];

            const result = truncateLeadingEmptyData(data);

            expect(result.length).toBe(3);
            expect(result[0].date).toBe('2024-06-01');
            expect(result[1].date).toBe('2024-07-01');
            expect(result[2].date).toBe('2024-08-01');
        });

        it('returns data unchanged if first entry has data', () => {
            const data = [
                {date: '2024-01-01', value: 10},
                {date: '2024-02-01', value: 20}
            ];

            expect(truncateLeadingEmptyData(data)).toEqual(data);
        });

        it('returns data unchanged if only one leading zero', () => {
            const data = [
                {date: '2024-01-01', value: 0},
                {date: '2024-02-01', value: 10}
            ];

            expect(truncateLeadingEmptyData(data)).toEqual(data);
        });

        it('handles empty array', () => {
            expect(truncateLeadingEmptyData([])).toEqual([]);
        });

        it('handles all zero values', () => {
            const data = [
                {date: '2024-01-01', value: 0},
                {date: '2024-02-01', value: 0},
                {date: '2024-03-01', value: 0}
            ];

            expect(truncateLeadingEmptyData(data)).toEqual(data);
        });

        it('preserves trailing zeros after real data', () => {
            const data = [
                {date: '2024-01-01', value: 0},
                {date: '2024-02-01', value: 0},
                {date: '2024-03-01', value: 10},
                {date: '2024-04-01', value: 0}, // Trailing zero should be kept
                {date: '2024-05-01', value: 0} // Trailing zero should be kept
            ];

            const result = truncateLeadingEmptyData(data);

            expect(result.length).toBe(4);
            expect(result[0].date).toBe('2024-02-01');
            expect(result[3].date).toBe('2024-05-01');
        });

        it('truncates based on a custom field', () => {
            const data = [
                {date: '2024-01-01', value: 5, visits: 0},
                {date: '2024-01-02', value: 5, visits: 0},
                {date: '2024-01-03', value: 5, visits: 0},
                {date: '2024-01-04', value: 5, visits: 9}
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
            expect(resolveEffectiveRangeDays(STATS_RANGES.allTime.value)).toBe(1000);
        });
    });

    describe('getAggregationStrategy', () => {
        it('applies the daily/weekly/monthly thresholds to fixed ranges', () => {
            expect(getAggregationStrategy(7)).toBe('none');
            expect(getAggregationStrategy(31)).toBe('none');
            expect(getAggregationStrategy(90)).toBe('none');
            expect(getAggregationStrategy(91)).toBe('weekly');
            expect(getAggregationStrategy(270)).toBe('weekly');
            expect(getAggregationStrategy(271)).toBe('monthly');
            expect(getAggregationStrategy(372)).toBe('monthly');
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
            expect(getAggregationStrategy(STATS_RANGES.allTime.value, createDateRange(180))).toBe('weekly');
            expect(getAggregationStrategy(STATS_RANGES.allTime.value, createDateRange(300))).toBe('monthly');
            expect(getAggregationStrategy(STATS_RANGES.allTime.value, createDateRange(500))).toBe('monthly');
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
                const data = createDateRange(91, '2024-01-01', i => i);
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
                const data = createDateRange(365, '2024-01-01', i => i + 1);
                const result = sanitizeChartData(data, 372, 'value', 'exact');

                expect(result[0].date).toBe('2024-01-01');
                expect(result[0].value).toBe(31); // Jan 31st cumulative value
                expect(result[result.length - 1].value).toBe(365);
            });

            it('handles data with gaps between months', () => {
                const data = [
                    {date: '2024-01-15', value: 10},
                    {date: '2024-03-20', value: 30},
                    {date: '2024-06-10', value: 60}
                ];
                const result = sanitizeChartData(data, 372, 'value', 'sum');

                expect(result.map(item => item.date)).toEqual(['2024-01-01', '2024-03-01', '2024-06-01']);
            });

            it('preserves additional fields from the last item in each bucket', () => {
                const data = createDateRange(365).map((item, i) => ({...item, customField: i, extra: `row-${i}`}));
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
                const data = createDateRange(1000, '2022-01-01', i => (i >= 940 ? 5 : 0));
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
            const data = createDateRange(91).map(item => ({...item, customField: 2}));
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
            expect(getEffectiveChartRange(180, createDateRange(180))).toBe(91);
        });

        it('maps monthly bucketing into the "MMM YYYY" display band', () => {
            expect(getEffectiveChartRange(300, createDateRange(300))).toBe(366);
            expect(getEffectiveChartRange(372, createDateRange(372))).toBe(366);
        });

        it('follows an override strategy', () => {
            expect(getEffectiveChartRange(31, createDateRange(31), {overrideStrategy: 'monthly'})).toBe(366);
            expect(getEffectiveChartRange(31, createDateRange(31), {overrideStrategy: 'weekly'})).toBe(91);
        });

        it('agrees with the bucketing of trimmed all time data', () => {
            const data = createDateRange(1000, '2022-01-01', i => (i >= 940 ? 5 : 0));
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
});
