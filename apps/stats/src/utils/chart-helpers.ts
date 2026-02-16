import moment from 'moment-timezone';
import {STATS_RANGE_OPTIONS} from '@src/utils/constants';

/**
 * Returns additional text for subheads
 */
export const getPeriodText = (range: number): string => {
    const option = STATS_RANGE_OPTIONS.find((opt: {value: number; name: string}) => opt.value === range);
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
export function truncateLeadingEmptyData<T extends {value?: number}>(data: T[]): T[] {
    const firstNonEmptyIndex = data.findIndex(item => Number(item.value) > 0);
    if (firstNonEmptyIndex > 1) {
        // Keep one zero entry before the first real data
        return data.slice(firstNonEmptyIndex - 1);
    }
    return data;
}

type AggregationType = 'sum' | 'avg' | 'exact';

type AggregationStrategy = 'none' | 'weekly' | 'monthly' | 'monthly-exact';

/**
 * Calculates the span between two dates in days
 */
function calculateDateSpan(startDate: string, endDate: string): number {
    return moment(endDate).diff(moment(startDate), 'days');
}

/**
 * Gets a standardized month key for grouping
 */
function getMonthKey(date: string): string {
    return moment(date).format('YYYY-MM');
}

/**
 * Checks if a date is in the same month as a reference date
 */
function isInSameMonth(date: string, referenceDate: string): boolean {
    return moment(date).isSame(moment(referenceDate), 'month');
}

/**
 * Checks if a date is in the same week as a reference date
 */
function isInSameWeek(date: string, referenceDate: string): boolean {
    return moment(date).isSame(moment(referenceDate), 'week');
}

/**
 * Calculates the aggregated value based on aggregation type
 */
function calculateAggregatedValue(total: number, count: number, lastValue: number, type: AggregationType): number {
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
 * Calculates outlier threshold using standard deviation
 */
function calculateOutlierThreshold(values: number[]): {threshold: number; average: number} {
    // Calculate median instead of mean to be more robust against extreme outliers
    const sortedValues = [...values].sort((a, b) => a - b);
    const median = sortedValues[Math.floor(sortedValues.length / 2)];

    // Calculate MAD (Median Absolute Deviation) which is more robust than standard deviation
    const deviations = values.map(val => Math.abs(val - median));
    const mad = deviations.sort((a, b) => a - b)[Math.floor(deviations.length / 2)];

    return {
        threshold: median + (5 * mad), // Using 5 times MAD as threshold
        average: median
    };
}

/**
 * Determines the appropriate aggregation strategy based on range and date span
 */
function determineAggregationStrategy(range: number, dateSpan: number, aggregationType: AggregationType, overrideStrategy?: AggregationStrategy): AggregationStrategy {
    // If an override strategy is provided, use it
    if (overrideStrategy) {
        return overrideStrategy;
    }

    // Normalize YTD range
    if (range === -1) {
        if (dateSpan > 150) {
            range = 400; // Force monthly aggregation
        } else if (dateSpan > 60) {
            range = 100; // Force weekly aggregation
        }
    }

    // For 'exact' aggregation type with long ranges
    if (aggregationType === 'exact' && (range > 356 || (range === -1 && dateSpan > 150))) {
        return 'monthly';
    }

    // For weekly aggregation
    if ((range >= 91 && range <= 356) || (range === -1 && dateSpan > 60 && dateSpan <= 150)) {
        return 'weekly';
    }

    // For monthly aggregation
    if (range > 356 || (range === -1 && dateSpan > 150)) {
        return 'monthly';
    }

    return 'none';
}

/**
 * Detects potential bulk import events in the data
 */
function detectBulkImports<T extends {date: string}>(items: T[], fieldName: keyof T): T[] {
    if (items.length <= 1) {
        return items;
    }

    const values = items.map(item => Number(item[fieldName]));
    const {threshold, average} = calculateOutlierThreshold(values);

    return items.map((item) => {
        const value = Number(item[fieldName]);
        return {
            ...item,
            _isOutlier: value > threshold || value > average * 10
        };
    });
}

/**
 * Aggregates data by week
 */
function aggregateByWeek<T extends {date: string}>(data: T[], fieldName: keyof T, aggregationType: AggregationType): T[] {
    const weeklyData: T[] = [];
    let currentWeek = moment(data[0].date).startOf('week');
    let weekTotal = 0;
    let weekCount = 0;
    let lastValue = 0;

    data.forEach((item, index) => {
        const itemDate = moment(item.date);
        if (isInSameWeek(itemDate.format('YYYY-MM-DD'), currentWeek.format('YYYY-MM-DD'))) {
            weekTotal += Number(item[fieldName]);
            weekCount += 1;
            lastValue = Number(item[fieldName]);
        } else {
            weeklyData.push({
                ...data[index - 1],
                date: currentWeek.format('YYYY-MM-DD'),
                [fieldName]: calculateAggregatedValue(weekTotal, weekCount, lastValue, aggregationType)
            } as T);

            currentWeek = itemDate.startOf('week');
            weekTotal = Number(item[fieldName]);
            weekCount = 1;
            lastValue = Number(item[fieldName]);
        }

        if (index === data.length - 1) {
            weeklyData.push({
                ...item,
                date: currentWeek.format('YYYY-MM-DD'),
                [fieldName]: calculateAggregatedValue(weekTotal, weekCount, lastValue, aggregationType)
            } as T);
        }
    });

    return weeklyData;
}

/**
 * Aggregates data by month using simple aggregation (sum/avg)
 */
function aggregateByMonth<T extends {date: string}>(data: T[], fieldName: keyof T, aggregationType: AggregationType): T[] {
    const monthlyData: T[] = [];
    let currentMonth = moment(data[0].date).startOf('month');
    let monthTotal = 0;
    let monthCount = 0;
    let lastValue = 0;
    let lastItem: T | null = null;

    data.forEach((item, index) => {
        const itemDate = moment(item.date);
        const value = Number(item[fieldName]);

        if (isInSameMonth(itemDate.format('YYYY-MM-DD'), currentMonth.format('YYYY-MM-DD'))) {
            monthTotal += value;
            monthCount += 1;
            lastValue = value;
            lastItem = item;
        } else {
            if (aggregationType === 'exact' && lastItem) {
                monthlyData.push({
                    ...lastItem,
                    [fieldName]: lastValue
                } as T);
            } else {
                monthlyData.push({
                    ...data[index - 1],
                    date: currentMonth.format('YYYY-MM-DD'),
                    [fieldName]: calculateAggregatedValue(monthTotal, monthCount, lastValue, aggregationType)
                } as T);
            }

            currentMonth = itemDate.startOf('month');
            monthTotal = value;
            monthCount = 1;
            lastValue = value;
            lastItem = item;
        }

        if (index === data.length - 1) {
            if (aggregationType === 'exact' && lastItem) {
                monthlyData.push({
                    ...lastItem,
                    [fieldName]: lastValue
                } as T);
            } else {
                monthlyData.push({
                    ...item,
                    date: currentMonth.format('YYYY-MM-DD'),
                    [fieldName]: calculateAggregatedValue(monthTotal, monthCount, lastValue, aggregationType)
                } as T);
            }
        }
    });

    return monthlyData;
}

/**
 * Aggregates data by month for exact values, preserving important points
 */
function aggregateByMonthExact<T extends {date: string}>(data: T[], fieldName: keyof T): T[] {
    const importantPoints = new Map<string, T>();

    // Add first and last points
    importantPoints.set(data[0].date, {...data[0]});
    importantPoints.set(data[data.length - 1].date, {...data[data.length - 1]});

    // Add month boundaries and track significant changes
    let prevValue = Number(data[0][fieldName]);
    data.forEach((item, index) => {
        if (index === 0) {
            return; // Skip first item as it's already added
        }

        const itemDate = moment(item.date);
        const currentValue = Number(item[fieldName]);
        const isMonthStart = itemDate.date() === 1;
        const isMonthEnd = itemDate.clone().endOf('month').format('YYYY-MM-DD') === item.date;
        const isSignificantChange = currentValue > prevValue * 1.02 || currentValue < prevValue * 0.98;

        if (isMonthStart || isMonthEnd || isSignificantChange) {
            importantPoints.set(item.date, {...item});
        }

        prevValue = currentValue;
    });

    return Array.from(importantPoints.values())
        .sort((a, b) => moment(a.date).diff(moment(b.date)));
}

/**
 * Sanitizes chart data based on the date range
 * - For ranges between 91-356 days: shows weekly changes
 * - For ranges above 356 days or YTD: shows monthly changes
 * - For other ranges: keeps data as is
 */
export const sanitizeChartData = <T extends {date: string}>(
    data: T[],
    range: number,
    fieldName: keyof T = 'value' as keyof T,
    aggregationType: AggregationType = 'avg',
    overrideStrategy?: AggregationStrategy
): T[] => {
    if (!data.length) {
        return [];
    }

    // Calculate the actual date span
    const dateSpan = data.length > 1 ? calculateDateSpan(data[0].date, data[data.length - 1].date) : 0;

    // Determine aggregation strategy
    const strategy = determineAggregationStrategy(range, dateSpan, aggregationType, overrideStrategy);

    // Apply the appropriate aggregation
    let result: T[];
    switch (strategy) {
    case 'weekly':
        result = aggregateByWeek(data, fieldName, aggregationType);
        break;
    case 'monthly':
        result = aggregateByMonth(data, fieldName, aggregationType);
        break;
    default:
        result = data;
    }

    // Always detect bulk imports
    return detectBulkImports(result, fieldName);
};

// Export for testing
export {
    calculateDateSpan,
    getMonthKey,
    isInSameMonth,
    isInSameWeek,
    calculateAggregatedValue,
    calculateOutlierThreshold,
    detectBulkImports,
    aggregateByWeek,
    aggregateByMonth,
    aggregateByMonthExact,
    determineAggregationStrategy
};
