import {
    aggregateByMonthSimple,
    determineAggregationStrategy,
    getPeriodText,
    sanitizeChartData
} from '@src/utils/chart-helpers';
import {STATS_RANGE_OPTIONS} from '@src/utils/constants';
import {describe, expect, it} from 'vitest';
import moment from 'moment-timezone';

type ChartDataItem = {
    date: string;
    value: number;
    _isOutlier?: boolean;
    customField?: number;
    extra?: string;
};

describe('chart-helpers', () => {
    describe('getPeriodText', () => {
        it('returns correct text for known ranges', () => {
            const ranges = [
                {value: 7, name: 'Last 7 days', expected: 'in the last 7 days'},
                {value: 31, name: 'Last 30 days', expected: 'in the last 30 days'},
                {value: 91, name: 'Last 3 months', expected: 'in the last 3 months'},
                {value: 372, name: 'Last 12 months', expected: 'in the last 12 months'},
                {value: 1000, name: 'All time', expected: '(all time)'}
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

    describe('sanitizeChartData', () => {
        const createDateRange = (days: number, startDate = '2024-01-01'): ChartDataItem[] => {
            const result: ChartDataItem[] = [];
            const start = moment(startDate);
            for (let i = 0; i < days; i++) {
                result.push({
                    date: start.clone().add(i, 'days').format('YYYY-MM-DD'),
                    value: 10
                });
            }
            return result;
        };

        it('handles empty data', () => {
            expect(sanitizeChartData([], 30)).toEqual([]);
        });

        describe('bulk import detection', () => {
            it('does not mark values as outliers when variation is normal', () => {
                const data: ChartDataItem[] = [
                    {date: '2024-01-01', value: 10},
                    {date: '2024-01-02', value: 15},
                    {date: '2024-01-03', value: 20},
                    {date: '2024-01-04', value: 12}
                ];

                const result = sanitizeChartData(data, 7);
                expect(result.some(item => item._isOutlier)).toBe(false);
            });
        });

        describe('weekly aggregation', () => {
            it('aggregates data weekly for 91-356 day ranges', () => {
                const data = createDateRange(100);
                const result = sanitizeChartData(data, 100);

                // Should have roughly 14-15 weeks of data
                expect(result.length).toBeLessThan(data.length);
                expect(result.length).toBeGreaterThan(13);
                expect(result.length).toBeLessThan(16);
            });

            it('handles sum aggregation type', () => {
                const data: ChartDataItem[] = [
                    {date: '2024-01-01', value: 10},
                    {date: '2024-01-02', value: 20},
                    {date: '2024-01-03', value: 30}
                ];

                const result = sanitizeChartData(data, 100, 'value', 'sum');
                expect(result[0].value).toBe(60); // Sum of all values in the week
            });

            it('handles average aggregation type', () => {
                const data: ChartDataItem[] = [
                    {date: '2024-01-01', value: 10},
                    {date: '2024-01-02', value: 20},
                    {date: '2024-01-03', value: 30}
                ];

                const result = sanitizeChartData(data, 100, 'value', 'avg');
                expect(result[0].value).toBe(20); // Average of values in the week
            });

            it('handles exact aggregation type for weekly data', () => {
                const data = [
                    {date: '2024-01-01', value: 10}, // Week 1
                    {date: '2024-01-02', value: 15},
                    {date: '2024-01-03', value: 20},
                    {date: '2024-01-08', value: 25}, // Week 2
                    {date: '2024-01-09', value: 30},
                    {date: '2024-01-10', value: 35}
                ];

                const result = sanitizeChartData(data, 100, 'value', 'exact');
                expect(result.length).toBe(2);
                expect(result[0].value).toBe(20); // Last value of first week
                expect(result[1].value).toBe(35); // Last value of second week
            });
        });

        describe('monthly aggregation', () => {
            it('aggregates data monthly for ranges > 356 days', () => {
                const data = createDateRange(400);
                const result = sanitizeChartData(data, 400);

                // Should have roughly 13-14 months of data
                expect(result.length).toBeLessThan(data.length);
                expect(result.length).toBeGreaterThan(12);
                expect(result.length).toBeLessThan(15);
            });

            it('handles exact aggregation type with significant changes', () => {
                const data: ChartDataItem[] = [
                    {date: '2024-01-01', value: 100},
                    {date: '2024-01-15', value: 150}, // 50% increase
                    {date: '2024-01-31', value: 155},
                    {date: '2024-02-01', value: 160},
                    {date: '2024-02-15', value: 250}, // Significant increase
                    {date: '2024-02-28', value: 255}
                ];

                const result = sanitizeChartData(data, 400, 'value', 'exact');
                
                // Should include month boundaries and significant changes
                expect(result.length).toBeGreaterThan(4); // Should include first/last days of months and significant changes
                expect(result.some(item => item.value === 250)).toBe(true); // Should include significant change point
            });

            it('handles exact aggregation type for monthly data', () => {
                const data = [
                    {date: '2024-01-01', value: 10}, // January start
                    {date: '2024-01-15', value: 15},
                    {date: '2024-01-31', value: 20}, // January end
                    {date: '2024-02-01', value: 25}, // February start
                    {date: '2024-02-15', value: 30},
                    {date: '2024-02-28', value: 35} // February end
                ];

                const result = sanitizeChartData(data, 400, 'value', 'exact');
                
                // Should include first and last day of each month
                expect(result.some(item => item.date === '2024-01-01')).toBe(true);
                expect(result.some(item => item.date === '2024-01-31')).toBe(true);
                expect(result.some(item => item.date === '2024-02-01')).toBe(true);
                expect(result.some(item => item.date === '2024-02-28')).toBe(true);

                // Values should be preserved
                const jan31 = result.find(item => item.date === '2024-01-31');
                const feb28 = result.find(item => item.date === '2024-02-28');
                expect(jan31?.value).toBe(20);
                expect(feb28?.value).toBe(35);
            });

            it('handles simple month-end aggregation', () => {
                const data = [
                    {date: '2024-01-01', value: 100}, // First day of Jan
                    {date: '2024-01-15', value: 110}, // Mid Jan
                    {date: '2024-01-31', value: 120}, // Last day of Jan
                    {date: '2024-02-01', value: 120}, // First day of Feb
                    {date: '2024-02-15', value: 130}, // Mid Feb
                    {date: '2024-02-28', value: 140}, // Last day of Feb
                    {date: '2024-03-01', value: 140}, // First day of Mar
                    {date: '2024-03-15', value: 150}, // Mid Mar
                    {date: '2024-03-31', value: 160} // Last day of Mar
                ];

                const result = aggregateByMonthSimple(data);

                // Should keep only the last day of each month
                expect(result.length).toBe(3);
                expect(result[0].date).toBe('2024-01-31');
                expect(result[0].value).toBe(120);
                expect(result[1].date).toBe('2024-02-28');
                expect(result[1].value).toBe(140);
                expect(result[2].date).toBe('2024-03-31');
                expect(result[2].value).toBe(160);
            });

            it('handles data with gaps between months', () => {
                const data = [
                    {date: '2024-01-31', value: 100}, // Last day of Jan
                    {date: '2024-03-31', value: 120}, // Last day of Mar (Feb missing)
                    {date: '2024-05-31', value: 140} // Last day of May (Apr missing)
                ];

                const result = aggregateByMonthSimple(data);

                // Should preserve the data as is since they're already month-end values
                expect(result.length).toBe(3);
                expect(result[0].date).toBe('2024-01-31');
                expect(result[0].value).toBe(100);
                expect(result[1].date).toBe('2024-03-31');
                expect(result[1].value).toBe(120);
                expect(result[2].date).toBe('2024-05-31');
                expect(result[2].value).toBe(140);
            });

            it('preserves additional fields in data objects', () => {
                const data = [
                    {date: '2024-01-31', value: 100, extra: 'info1'},
                    {date: '2024-02-28', value: 110, extra: 'info2'},
                    {date: '2024-03-31', value: 120, extra: 'info3'}
                ];

                const result = aggregateByMonthSimple(data);

                expect(result.length).toBe(3);
                expect(result[0].extra).toBe('info1');
                expect(result[1].extra).toBe('info2');
                expect(result[2].extra).toBe('info3');
            });

            it('integrates correctly with sanitizeChartData', () => {
                const data = [
                    {date: '2024-01-01', value: 100},
                    {date: '2024-01-15', value: 120}, // Mid-month significant change
                    {date: '2024-01-31', value: 125},
                    {date: '2024-02-15', value: 145}, // Mid-month significant change
                    {date: '2024-02-28', value: 150},
                    {date: '2024-03-15', value: 170}, // Mid-month significant change
                    {date: '2024-03-31', value: 175}
                ];

                // First verify the strategy is correct
                const strategy = determineAggregationStrategy(400, 90, 'exact');
                expect(strategy).toBe('monthly-exact');

                // Then verify the full sanitization
                const result = sanitizeChartData(data, 400, 'value', 'exact');

                // Verify all points are included with correct values
                const points = new Map(result.map(item => [item.date, item.value]));
                
                // Check month boundaries
                expect(points.get('2024-01-01')).toBe(100);
                expect(points.get('2024-01-31')).toBe(125);
                expect(points.get('2024-02-28')).toBe(150);
                expect(points.get('2024-03-31')).toBe(175);

                // Mid-month significant changes should be included
                expect(points.get('2024-01-15')).toBe(120);
                expect(points.get('2024-02-15')).toBe(145);
                expect(points.get('2024-03-15')).toBe(170);

                // Total points should include boundaries and significant changes
                expect(points.size).toBe(7);
            });
        });

        describe('year to date handling', () => {
            it('uses appropriate aggregation based on date span', () => {
                // Test YTD with < 60 days
                const shortData = createDateRange(30);
                const shortResult = sanitizeChartData(shortData, -1);
                expect(shortResult.length).toBe(shortData.length); // Should keep original data

                // Test YTD with 61-150 days (weekly)
                const mediumData = createDateRange(100);
                const mediumResult = sanitizeChartData(mediumData, -1);
                expect(mediumResult.length).toBeLessThan(mediumData.length); // Should aggregate weekly

                // Test YTD with > 150 days (monthly)
                const longData = createDateRange(200);
                const longResult = sanitizeChartData(longData, -1);
                expect(longResult.length).toBeLessThan(longData.length); // Should aggregate monthly
            });
        });

        describe('edge cases', () => {
            it('handles single data point', () => {
                const data: ChartDataItem[] = [{date: '2024-01-01', value: 10}];
                const result = sanitizeChartData(data, 30);
                expect(result).toEqual(data);
            });

            it('handles custom field names', () => {
                const data = [
                    {date: '2024-01-01', customField: 10},
                    {date: '2024-01-02', customField: 20}
                ];
                const result = sanitizeChartData(data, 30, 'customField');
                expect(result[0].customField).toBeDefined();
            });

            it('preserves additional fields in data objects', () => {
                const data: ChartDataItem[] = [
                    {date: '2024-01-01', value: 10, extra: 'info'},
                    {date: '2024-01-02', value: 20, extra: 'info'}
                ];
                const result = sanitizeChartData(data, 30);
                expect(result[0].extra).toBe('info');
            });
        });
    });
}); 