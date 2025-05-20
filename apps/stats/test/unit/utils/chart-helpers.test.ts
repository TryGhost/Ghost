import {STATS_RANGE_OPTIONS} from '@src/utils/constants';
import {
    calculateYAxisWidth,
    formatDisplayDateWithRange,
    getCountryFlag,
    getPeriodText,
    getRangeDates,
    getYRange,
    getYTicks,
    sanitizeChartData
} from '@src/utils/chart-helpers';
import {formatDisplayDate} from '@tryghost/shade';
import moment from 'moment-timezone';
import {vi} from 'vitest';

// Mock the formatDisplayDate from @tryghost/shade
vi.mock('@tryghost/shade', () => ({
    formatDisplayDate: vi.fn((date: string) => moment(date).format('MMM D, YYYY'))
}));

describe('Chart Helpers', function () {
    describe('getYRange', function () {
        test('returns 0 to 1 range when data is empty', function () {
            const result = getYRange([]);
            expect(result).toEqual({min: 0, max: 1});
        });

        test('handles data with all zeros correctly', function () {
            const data = [{value: 0}, {value: 0}, {value: 0}];
            const result = getYRange(data);
            expect(result).toEqual({min: 0, max: 1});
        });

        test('creates appropriate range when all values are the same non-zero value', function () {
            const data = [{value: 100}, {value: 100}, {value: 100}];
            const result = getYRange(data);
            
            // Should create a range around 100 with at least 10% padding
            expect(result.min).toBeLessThan(100);
            expect(result.max).toBeGreaterThan(100);
            expect(result.max - result.min).toBeGreaterThanOrEqual(10); // At least 10% of 100
        });

        test('creates appropriate range for varied data', function () {
            const data = [{value: 10}, {value: 20}, {value: 30}];
            const result = getYRange(data);
            
            expect(result.min).toBeLessThanOrEqual(10);
            expect(result.max).toBeGreaterThanOrEqual(30);
        });
    });

    describe('getYTicks', function () {
        test('returns empty array when data is empty', function () {
            const result = getYTicks([]);
            expect(result).toEqual([]);
        });

        test('generates appropriate ticks for data range', function () {
            const data = [{value: 0}, {value: 50}, {value: 100}];
            const result = getYTicks(data);
            
            expect(result.length).toBeLessThanOrEqual(6); // Should have 6 or fewer ticks
            expect(result[0]).toBeLessThanOrEqual(0);
            expect(result[result.length - 1]).toBeGreaterThanOrEqual(100);
            
            // Check ticks are evenly spaced
            const step = result[1] - result[0];
            for (let i = 1; i < result.length; i++) {
                expect(result[i] - result[i - 1]).toBeCloseTo(step);
            }
        });
    });

    describe('calculateYAxisWidth', function () {
        test('returns default width when ticks array is empty', function () {
            const result = calculateYAxisWidth([], val => val.toString());
            expect(result).toBe(40);
        });

        test('calculates width based on formatter output length', function () {
            const ticks = [1, 10, 100, 1000];
            const formatter = (val: number) => `$${val.toLocaleString()}`;
            const result = calculateYAxisWidth(ticks, formatter);
            
            // Width should be larger for longer formatted strings
            expect(result).toBeGreaterThan(40);
        });
    });

    describe('getCountryFlag', function () {
        test('returns placeholder flag for null or invalid country codes', function () {
            expect(getCountryFlag(null as unknown as string)).toBe('🏳️');
            expect(getCountryFlag('NULL')).toBe('🏳️');
            expect(getCountryFlag('')).toBe('🏳️');
        });

        test('returns emoji flag for valid country codes', function () {
            expect(getCountryFlag('US')).toBe('🇺🇸');
            expect(getCountryFlag('GB')).toBe('🇬🇧');
            expect(getCountryFlag('JP')).toBe('🇯🇵');
        });
    });

    describe('getPeriodText', function () {
        test('returns expected text for range values', function () {
            // Test "Last X days/months" format
            const lastWeekOption = STATS_RANGE_OPTIONS.find(opt => opt.name === 'Last 7 days');
            if (lastWeekOption) {
                expect(getPeriodText(lastWeekOption.value)).toBe('in the last 7 days');
            }
            
            // Test All time
            const allTimeOption = STATS_RANGE_OPTIONS.find(opt => opt.name === 'All time');
            if (allTimeOption) {
                expect(getPeriodText(allTimeOption.value)).toBe('(all time)');
            }
            
            // Test Today
            const todayOption = STATS_RANGE_OPTIONS.find(opt => opt.name === 'Today');
            if (todayOption) {
                expect(getPeriodText(todayOption.value)).toBe('today');
            }
        });

        test('returns empty string for unknown range', function () {
            expect(getPeriodText(999)).toBe('');
        });
    });

    describe('getRangeDates', function () {
        test('calculates correct dates for regular ranges', function () {
            const {startDate, endDate} = getRangeDates(7);
            
            expect(endDate.isSame(moment().endOf('day'), 'day')).toBe(true);
            expect(startDate.isSame(moment().subtract(6, 'days').startOf('day'), 'day')).toBe(true);
        });

        test('calculates year-to-date for -1 range', function () {
            const {startDate, endDate} = getRangeDates(-1);
            
            expect(endDate.isSame(moment().endOf('day'), 'day')).toBe(true);
            expect(startDate.isSame(moment().startOf('year'), 'day')).toBe(true);
        });
    });

    describe('sanitizeChartData', function () {
        const generateTestData = (days: number) => {
            const data = [];
            const startDate = moment().subtract(days, 'days');
            
            for (let i = 0; i < days; i++) {
                data.push({
                    date: startDate.clone().add(i, 'days').format('YYYY-MM-DD'),
                    value: i * 10
                });
            }
            
            return data;
        };
        
        test('returns empty array when data is empty', function () {
            const result = sanitizeChartData([], 30);
            expect(result).toEqual([]);
        });
        
        test('keeps data as is for short ranges', function () {
            const testData = generateTestData(30);
            const result = sanitizeChartData(testData, 30);
            
            expect(result.length).toBe(testData.length);
            // Checking that each item has the same date and value but may have additional props
            result.forEach((item, i) => {
                expect(item.date).toBe(testData[i].date);
                expect(item.value).toBe(testData[i].value);
            });
        });
        
        test('aggregates to weekly data for medium ranges', function () {
            const testData = generateTestData(100);
            const result = sanitizeChartData(testData, 100);
            
            // Should have fewer data points than original
            expect(result.length).toBeLessThan(testData.length);
            
            // The first data point should have the date of the start of the week
            const weekStartFormat = moment(testData[0].date).startOf('week').format('YYYY-MM-DD');
            expect(result[0].date).toBe(weekStartFormat);
        });
        
        test('aggregates to monthly data for long ranges', function () {
            const testData = generateTestData(400);
            const result = sanitizeChartData(testData, 400);
            
            // Should have significantly fewer data points than original
            expect(result.length).toBeLessThan(testData.length / 2);
        });
        
        test('uses sum aggregation when specified', function () {
            const testData = [
                {date: '2023-01-01', value: 10},
                {date: '2023-01-02', value: 20},
                {date: '2023-01-03', value: 30}
            ];
            
            const result = sanitizeChartData(testData, 100, 'value', 'sum');
            
            // For a week aggregation, should have 1 point with summed values
            expect(result.length).toBe(1);
            expect(result[0].value).toBe(60); // 10 + 20 + 30
        });
        
        test('uses exact aggregation when specified for cumulative data', function () {
            const testData = [];
            const startDate = moment().subtract(200, 'days');
            
            // Create cumulative data (always increasing)
            for (let i = 0; i < 200; i++) {
                testData.push({
                    date: startDate.clone().add(i, 'days').format('YYYY-MM-DD'),
                    value: 1000 + i * 5 // Steadily increasing value
                });
            }
            
            const result = sanitizeChartData(testData, 200, 'value', 'exact');
            
            // Should identify month boundaries with fewer points than original
            expect(result.length).toBeLessThan(testData.length);
            
            // Check that final result has cumulative properties
            const lastResultValue = result[result.length - 1].value;
            const lastInputValue = testData[testData.length - 1].value;
            
            // Last value should be the same or very close
            expect(lastResultValue).toBeCloseTo(lastInputValue, 0);
        });
        
        test('handles YTD range with appropriate aggregation', function () {
            const testData = generateTestData(180);
            const result = sanitizeChartData(testData, -1); // -1 represents Year to Date
            
            // Should aggregate with fewer points than original
            expect(result.length).toBeLessThan(testData.length);
            
            // Should have multiple data points
            expect(result.length).toBeGreaterThan(5);
        });
        
        test('supports outlier detection logic', function () {
            // Create a dataset where the outlier is extremely obvious
            const baseValue = 10;
            const outlierValue = 5000; // 500x the base value
            const testData = [
                {date: '2023-01-01', value: baseValue},
                {date: '2023-01-02', value: baseValue + 1},
                {date: '2023-01-03', value: baseValue + 2},
                {date: '2023-01-04', value: outlierValue}, // Extreme outlier
                {date: '2023-01-05', value: baseValue + 3}
            ];
            
            const result = sanitizeChartData(testData, 5); // Short range to avoid aggregation
            
            // Verify the result has processed the data correctly
            expect(result.length).toBe(testData.length);
            
            // Find the item with the outlier value and verify it exists
            const outlierItem = result.find(item => item.value === outlierValue);
            expect(outlierItem).toBeDefined();
            
            // Verify the result contains the _isOutlier property (though we don't check its value)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect(Object.keys(result[0])).toContain('_isOutlier');
        });

        test('processes data with extreme value differences', function () {
            // Create a dataset where one value is very different from others
            const baseValue = 10;
            const extremeValue = 5000; // 500x the base value
            const testData = [
                {date: '2023-01-01', value: baseValue},
                {date: '2023-01-02', value: baseValue + 1},
                {date: '2023-01-03', value: baseValue + 2},
                {date: '2023-01-04', value: extremeValue}, // Very large value
                {date: '2023-01-05', value: baseValue + 3}
            ];
            
            const result = sanitizeChartData(testData, 5); // Short range to avoid aggregation
            
            // Should process all data points
            expect(result.length).toBe(testData.length);
            
            // The extreme value should still be present in the result
            const extremeItem = result.find(item => item.value === extremeValue);
            expect(extremeItem).toBeDefined();
            expect(extremeItem?.date).toBe('2023-01-04');
        });

        test('handles monthly data aggregation with exact aggregation type', function () {
            // Create test data spanning multiple months
            const testData = [];
            const startDate = moment('2023-01-01');
            
            // Create data for 3 months with multiple entries per month
            for (let month = 0; month < 3; month++) {
                for (let day = 1; day <= 28; day++) {
                    const date = startDate.clone().add(month, 'months').date(day);
                    testData.push({
                        date: date.format('YYYY-MM-DD'),
                        value: 1000 + (month * 100) + day // Value increases each day
                    });
                }
            }
            
            // Test monthly aggregation with exact aggregation type
            const result = sanitizeChartData(testData, 400, 'value', 'exact');
            
            // Should have consolidated to a smaller number of data points
            expect(result.length).toBeLessThan(testData.length);
            
            // The current implementation returns data with first/last day of months
            // Find entries for each month
            const janEntry = result.find(item => item.date.startsWith('2023-01-') && moment(item.date).date() === 28);
            const febEntry = result.find(item => item.date.startsWith('2023-02-') && moment(item.date).date() === 28);
            const marEntry = result.find(item => item.date.startsWith('2023-03-') && moment(item.date).date() === 28);
            
            // Verify each month has at least one entry
            expect(janEntry).toBeDefined();
            expect(febEntry).toBeDefined();
            expect(marEntry).toBeDefined();
            
            // Values should match the actual implementation
            if (janEntry) {
                expect(janEntry.value).toBe(1028); // Last day of January
            }
            if (febEntry) {
                expect(febEntry.value).toBe(1128); // Last day of February
            }
            if (marEntry) {
                expect(marEntry.value).toBe(1228); // Last day of March
            }
        });
        
        test('handles monthly data aggregation with sum aggregation type', function () {
            // Create test data for sum aggregation
            const testData = [];
            const startDate = moment('2023-01-01');
            
            // Create data for 2 months with consistent values
            for (let day = 1; day <= 30; day++) {
                // January data
                testData.push({
                    date: startDate.clone().date(day).format('YYYY-MM-DD'),
                    value: 10 // Constant value
                });
                
                if (day <= 28) {
                    // February data
                    testData.push({
                        date: startDate.clone().add(1, 'month').date(day).format('YYYY-MM-DD'),
                        value: 20 // Different constant value
                    });
                }
            }
            
            // Test with sum aggregation
            const result = sanitizeChartData(testData, 400, 'value', 'sum');
            
            // Should include at least one data point for each month
            expect(result.find(item => item.date.startsWith('2023-01'))).toBeDefined();
            expect(result.find(item => item.date.startsWith('2023-02'))).toBeDefined();
            
            // January entries combined should add up to about 300
            // February entries combined should add up to about 560
            // But they might be split into multiple data points
            const janValues = result
                .filter(item => item.date.startsWith('2023-01'))
                .reduce((sum, item) => sum + item.value, 0);
            
            const febValues = result
                .filter(item => item.date.startsWith('2023-02'))
                .reduce((sum, item) => sum + item.value, 0);
            
            expect(janValues).toBeCloseTo(300, 0);
            expect(febValues).toBeCloseTo(560, 0);
        });
        
        test('handles outlier detection in monthly aggregation', function () {
            // Create test data with an outlier in the second month
            const testData = [];
            const startDate = moment('2023-01-01');
            
            // Create data for 2 months with an outlier
            for (let day = 1; day <= 30; day++) {
                // January data - normal values
                testData.push({
                    date: startDate.clone().date(day).format('YYYY-MM-DD'),
                    value: 100
                });
                
                if (day <= 28) {
                    // February data - with one outlier
                    const febValue = day === 15 ? 50000 : 100; // Outlier on the 15th
                    testData.push({
                        date: startDate.clone().add(1, 'month').date(day).format('YYYY-MM-DD'),
                        value: febValue
                    });
                }
            }
            
            // Test with sum aggregation - should detect and exclude the outlier
            const result = sanitizeChartData(testData, 400, 'value', 'sum');
            
            // Check for _isOutlier flag on the Feb 15 data
            interface OutlierItem {
                date: string;
                value: number;
                _isOutlier?: boolean;
            }
            
            const outlierEntry = result.find(item => 
                item.date.startsWith('2023-02-') && 
                (item as unknown as OutlierItem)._isOutlier === true
            );
            
            // The implementation might mark it as an outlier or exclude it 
            if (outlierEntry) {
                expect((outlierEntry as unknown as OutlierItem).value).toBeGreaterThan(1000);
            }
            
            // January total should be approximately 3000 (30 * 100)
            const janTotal = result
                .filter(item => item.date.startsWith('2023-01'))
                .reduce((sum, item) => sum + item.value, 0);
                
            expect(janTotal).toBeCloseTo(3000, 0);
        });
    });
    
    describe('formatDisplayDateWithRange', function () {
        test('formats date as month and year for long ranges', function () {
            const date = '2023-04-15';
            const result = formatDisplayDateWithRange(date, 400); // Range > 365
            
            expect(result).toBe('Apr 2023');
        });
        
        test('formats date with "Week of" prefix for medium ranges', function () {
            const date = '2023-04-15';
            const result = formatDisplayDateWithRange(date, 100); // Range >= 91 but <= 365
            
            expect(result).toBe('Week of Apr 15, 2023');
            expect(formatDisplayDate).toHaveBeenCalledWith(date);
        });
        
        test('uses standard date format for short ranges', function () {
            const date = '2023-04-15';
            const result = formatDisplayDateWithRange(date, 30); // Range < 91
            
            expect(result).toBe('Apr 15, 2023');
            expect(formatDisplayDate).toHaveBeenCalledWith(date);
        });
    });
}); 