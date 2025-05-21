import moment from 'moment-timezone';
import {STATS_RANGE_OPTIONS} from '@src/utils/constants';
import {
    aggregateByMonthExact,
    aggregateByWeek,
    detectBulkImports,
    determineAggregationStrategy,
    getMonthKey,
    getPeriodText,
    sanitizeChartData
} from '@src/utils/chart-helpers';
import {describe, expect, it} from 'vitest';

type ChartDataItem = {
    date: string;
    value: number;
    _isOutlier?: boolean;
    customField?: number;
    extra?: string;
};

type ChartDataItemWithOutlier = ChartDataItem & {
    _isOutlier: boolean;
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
                
                // Should keep only end-of-month values
                expect(result.length).toBe(2);
                expect(result[0].date).toBe('2024-01-31');
                expect(result[0].value).toBe(155);
                expect(result[1].date).toBe('2024-02-28');
                expect(result[1].value).toBe(255);
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
                
                // Should keep only end-of-month values
                expect(result.length).toBe(2);
                expect(result[0].date).toBe('2024-01-31');
                expect(result[0].value).toBe(20);
                expect(result[1].date).toBe('2024-02-28');
                expect(result[1].value).toBe(35);
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

                const result = sanitizeChartData(data, 400, 'value', 'exact');

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

                const result = sanitizeChartData(data, 400, 'value', 'exact');

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

                const result = sanitizeChartData(data, 400, 'value', 'exact');

                expect(result.length).toBe(3);
                expect(result[0].extra).toBe('info1');
                expect(result[1].extra).toBe('info2');
                expect(result[2].extra).toBe('info3');
            });

            it('integrates correctly with sanitizeChartData', () => {
                const data = [
                    {date: '2024-01-01', value: 100},
                    {date: '2024-01-15', value: 150}, // 50% increase
                    {date: '2024-01-31', value: 155},
                    {date: '2024-02-15', value: 200}, // ~29% increase
                    {date: '2024-02-28', value: 205},
                    {date: '2024-03-15', value: 250}, // ~22% increase
                    {date: '2024-03-31', value: 255}
                ];

                // First verify the strategy is correct
                const strategy = determineAggregationStrategy(400, 90, 'exact');
                expect(strategy).toBe('monthly');

                // Then verify the full sanitization
                const result = sanitizeChartData(data, 400, 'value', 'exact');

                // Verify only end-of-month values are included
                const points = new Map(result.map(item => [item.date, item.value]));
                
                // Check month boundaries
                expect(points.get('2024-01-31')).toBe(155);
                expect(points.get('2024-02-28')).toBe(205);
                expect(points.get('2024-03-31')).toBe(255);

                // Mid-month significant changes should not be included
                expect(points.has('2024-01-15')).toBe(false);
                expect(points.has('2024-02-15')).toBe(false);
                expect(points.has('2024-03-15')).toBe(false);

                // Total points should be just the end-of-month values
                expect(points.size).toBe(3);
            });

            it('integrates correctly with sanitizeChartData for non-exact aggregation', () => {
                const data = [
                    {date: '2024-01-01', value: 100},
                    {date: '2024-01-15', value: 150},
                    {date: '2024-01-31', value: 200},
                    {date: '2024-02-15', value: 250},
                    {date: '2024-02-28', value: 300}
                ];

                // First verify the strategy is correct
                const strategy = determineAggregationStrategy(400, 60, 'avg');
                expect(strategy).toBe('monthly');

                // Then verify the full sanitization
                const result = sanitizeChartData(data, 400, 'value', 'avg');

                // Should have one point per month with average values
                expect(result.length).toBe(2);
                expect(result[0].date.startsWith('2024-01')).toBe(true);
                expect(result[0].value).toBe(150); // Average of 100, 150, 200
                expect(result[1].date.startsWith('2024-02')).toBe(true);
                expect(result[1].value).toBe(275); // Average of 250, 300
            });

            it('handles sum aggregation with outliers', () => {
                const data = [
                    {date: '2024-01-01', value: 100},
                    {date: '2024-01-15', value: 15000}, // Outlier - excluded from sum
                    {date: '2024-01-31', value: 200},
                    {date: '2024-02-15', value: 20000}, // Outlier - excluded from sum
                    {date: '2024-02-28', value: 300}
                ];

                // First verify the strategy is correct
                const strategy = determineAggregationStrategy(400, 60, 'sum');
                expect(strategy).toBe('monthly');

                // Then verify the full sanitization
                const result = sanitizeChartData(data, 400, 'value', 'sum') as (ChartDataItem & {_isOutlier: boolean})[];

                // Should have one point per month with sums (excluding outliers)
                expect(result.length).toBe(2);
                expect(result[0].date.startsWith('2024-01')).toBe(true);
                expect(result[0].value).toBe(300); // Sum of 100, 200 (15000 excluded)
                expect(result[1].date.startsWith('2024-02')).toBe(true);
                expect(result[1].value).toBe(300); // Just 300 (20000 excluded)

                // The final points aren't marked as outliers since the outliers were excluded from sums
                expect(result[0]._isOutlier).toBe(false);
                expect(result[1]._isOutlier).toBe(false);
            });

            it('uses aggregateByMonthSimple for exact monthly aggregation', () => {
                const data = [
                    {date: '2024-01-01', value: 100},
                    {date: '2024-01-15', value: 150},
                    {date: '2024-01-31', value: 200},
                    {date: '2024-02-15', value: 250},
                    {date: '2024-02-28', value: 300}
                ];

                // First verify the strategy is correct
                const strategy = determineAggregationStrategy(200, 150, 'exact');
                expect(strategy).toBe('weekly'); // Range 91-356 uses weekly

                // Then verify the full sanitization with monthly range
                const result = sanitizeChartData(data, 200, 'value', 'exact');

                // Should have weekly points aligned to start of week
                expect(result.length).toBe(5); // One point per week
                expect(result[0].date).toBe('2023-12-31'); // Week containing Jan 1
                expect(result[0].value).toBe(100);
                expect(result[1].date).toBe('2024-01-14'); // Week containing Jan 15
                expect(result[1].value).toBe(150);
                expect(result[2].date).toBe('2024-01-28'); // Week containing Jan 31
                expect(result[2].value).toBe(200);
                expect(result[3].date).toBe('2024-02-11'); // Week containing Feb 15
                expect(result[3].value).toBe(250);
                expect(result[4].date).toBe('2024-02-25'); // Week containing Feb 28
                expect(result[4].value).toBe(300);
            });

            it('handles significant changes in monthly exact aggregation', () => {
                const data = [
                    {date: '2024-01-01', value: 100}, // Start of Jan
                    {date: '2024-01-15', value: 103}, // Mid Jan (3% increase - not significant)
                    {date: '2024-01-20', value: 110}, // Mid Jan (6.8% increase - significant)
                    {date: '2024-01-31', value: 112}, // End of Jan
                    {date: '2024-02-01', value: 112}, // Start of Feb
                    {date: '2024-02-15', value: 115}, // Mid Feb (2.7% increase - not significant)
                    {date: '2024-02-28', value: 118} // End of Feb
                ];

                const result = sanitizeChartData(data, 400, 'value', 'exact');

                // Should include start/end of months
                expect(result.length).toBe(2);
                expect(result[0].date).toBe('2024-01-31'); // End of Jan
                expect(result[0].value).toBe(112);
                expect(result[1].date).toBe('2024-02-28'); // End of Feb
                expect(result[1].value).toBe(118);
            });

            it('handles monthly exact aggregation with significant changes', () => {
                const data = [
                    {date: '2024-01-01', value: 100}, // Start of Jan
                    {date: '2024-01-15', value: 103}, // Mid Jan (3% increase - not significant)
                    {date: '2024-01-20', value: 110}, // Mid Jan (6.8% increase - significant)
                    {date: '2024-01-31', value: 112}, // End of Jan
                    {date: '2024-02-01', value: 112}, // Start of Feb
                    {date: '2024-02-15', value: 115}, // Mid Feb (2.7% increase - not significant)
                    {date: '2024-02-28', value: 118} // End of Feb
                ];

                // Force monthly strategy by using a range that triggers it
                const result = sanitizeChartData(data, 400, 'value', 'exact');

                // Should include only end-of-month values
                expect(result.length).toBe(2);
                expect(result[0].date).toBe('2024-01-31'); // End of Jan
                expect(result[0].value).toBe(112);
                expect(result[1].date).toBe('2024-02-28'); // End of Feb
                expect(result[1].value).toBe(118);
            });

            it('calculates date span correctly for single data point', () => {
                const data = [{date: '2024-01-01', value: 100}];
                const result = sanitizeChartData(data, 400, 'value', 'exact');

                // Should return the single point as is
                expect(result.length).toBe(1);
                expect(result[0].date).toBe('2024-01-01');
                expect(result[0].value).toBe(100);
            });

            it('uses getMonthKey for consistent month formatting', () => {
                // Test the getMonthKey function directly
                expect(getMonthKey('2024-01-01')).toBe('2024-01');
                expect(getMonthKey('2024-01-15')).toBe('2024-01');
                expect(getMonthKey('2024-01-31')).toBe('2024-01');
            });

            it('handles empty data array', () => {
                const result = sanitizeChartData([], 400, 'value', 'exact');
                expect(result).toEqual([]);
            });

            it('handles single data point with monthly exact aggregation', () => {
                const data = [{date: '2024-01-01', value: 100}];
                const result = sanitizeChartData(data, 400, 'value', 'exact');
                expect(result.length).toBe(1);
                expect(result[0].date).toBe('2024-01-01');
                expect(result[0].value).toBe(100);
            });

            it('aggregates by month exact with significant changes', () => {
                const data = [
                    {date: '2024-01-01', value: 100}, // Start of Jan
                    {date: '2024-01-15', value: 103}, // Mid Jan (3% increase - not significant)
                    {date: '2024-01-20', value: 110}, // Mid Jan (6.8% increase - significant)
                    {date: '2024-01-31', value: 112}, // End of Jan
                    {date: '2024-02-01', value: 112}, // Start of Feb
                    {date: '2024-02-15', value: 115}, // Mid Feb (2.7% increase - not significant)
                    {date: '2024-02-28', value: 118} // End of Feb
                ];

                const result = aggregateByMonthExact(data, 'value');

                // Should include first/last points, month boundaries, and significant changes
                expect(result.length).toBe(7);
                expect(result[0].date).toBe('2024-01-01'); // First point
                expect(result[1].date).toBe('2024-01-15'); // Mid Jan
                expect(result[2].date).toBe('2024-01-20'); // Mid Jan (significant change)
                expect(result[3].date).toBe('2024-01-31'); // End of Jan
                expect(result[4].date).toBe('2024-02-01'); // Start of Feb
                expect(result[5].date).toBe('2024-02-15'); // Mid Feb
                expect(result[6].date).toBe('2024-02-28'); // End of Feb/Last point
            });

            it('handles single data point in aggregateByMonthExact', () => {
                const data = [{date: '2024-01-01', value: 100}];
                const result = aggregateByMonthExact(data, 'value');
                expect(result.length).toBe(1);
                expect(result[0].date).toBe('2024-01-01');
                expect(result[0].value).toBe(100);
            });

            it('handles single data point in detectBulkImports', () => {
                const data = [{date: '2024-01-01', value: 100}];
                const result = detectBulkImports(data, 'value');
                expect(result).toEqual(data);
            });

            it('handles non-outlier values in detectBulkImports', () => {
                const data = [
                    {date: '2024-01-01', value: 100},
                    {date: '2024-01-02', value: 110},
                    {date: '2024-01-03', value: 120}
                ];
                const result = detectBulkImports(data, 'value') as ChartDataItemWithOutlier[];
                expect(result.every(item => !item._isOutlier)).toBe(true);
            });

            it('handles single data point in aggregateByWeek', () => {
                const data = [{date: '2024-01-01', value: 100}];
                const result = aggregateByWeek(data, 'value', 'avg');
                expect(result.length).toBe(1);
                expect(result[0].date).toBe('2023-12-31'); // Week start
                expect(result[0].value).toBe(100);
            });

            it('handles YTD range with long date span', () => {
                const strategy = determineAggregationStrategy(-1, 180, 'exact');
                expect(strategy).toBe('monthly');
            });

            it('handles YTD range with medium date span', () => {
                const strategy = determineAggregationStrategy(-1, 100, 'exact');
                expect(strategy).toBe('weekly');
            });

            it('handles YTD range with short date span', () => {
                const strategy = determineAggregationStrategy(-1, 30, 'exact');
                expect(strategy).toBe('none');
            });

            it('handles YTD range edge case with exact aggregation', () => {
                const strategy = determineAggregationStrategy(-1, 151, 'exact');
                expect(strategy).toBe('monthly');
            });

            it('handles YTD range with long span and non-exact aggregation', () => {
                const strategy = determineAggregationStrategy(-1, 151, 'avg');
                expect(strategy).toBe('monthly');
            });

            it('handles extreme outliers in bulk import detection', () => {
                const data = [
                    {date: '2024-01-01', value: 100},
                    {date: '2024-01-02', value: 1000000},
                    {date: '2024-01-03', value: 100}
                ];
                const result = detectBulkImports(data, 'value') as ChartDataItemWithOutlier[];
                expect(result[1]._isOutlier).toBe(true);
                expect(result[0]._isOutlier).toBe(false);
                expect(result[2]._isOutlier).toBe(false);
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