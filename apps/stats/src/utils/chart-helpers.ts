import moment from 'moment-timezone';
import {STATS_RANGE_OPTIONS} from '@src/utils/constants';
import {formatDisplayDate} from '@tryghost/shade';

/**
 * Calculates the Y-axis range with appropriate padding
 */
export const getYRange = (data: { value: number }[]): {min: number; max: number} => {
    if (!data.length) {
        return {min: 0, max: 1};
    }

    const values = data.map(d => Number(d.value));
    let min = Math.min(...values);
    let max = Math.max(...values);

    // If min and max are equal, create a range around the value
    if (min === max) {
        const value = min;
        // For zero, use a range of 0 to 1
        if (value === 0) {
            min = 0;
            max = 1;
        } else {
            // For non-zero values, create a 10% range around the value
            const range = Math.abs(value) * 0.1;
            min = Math.max(0, value - range);
            max = value + range;
        }
    } else {
        // Ensure minimum 10% range between min and max
        const range = max - min;
        const minRange = Math.max(Math.abs(max), Math.abs(min)) * 0.1;
        if (range < minRange) {
            const padding = (minRange - range) / 2;
            min = Math.max(0, min - padding);
            max += padding;
        }
    }

    return {min, max};
};

/**
 * Calculates Y-axis ticks based on the data values
 */
export const getYTicks = (data: { value: number }[]): number[] => {
    if (!data.length) {
        return [];
    }

    const {min, max} = getYRange(data);

    // Calculate the range and initial step
    const range = max - min;
    const initialStep = Math.pow(10, Math.floor(Math.log10(range)));

    // Try different step sizes until we get 6 or fewer ticks
    let step = initialStep;
    let numTicks = Math.ceil(range / step) + 1;

    // If we have too many ticks, increase the step size
    while (numTicks > 6) {
        step *= 2;
        numTicks = Math.ceil(range / step) + 1;
    }

    // Generate the ticks
    const ticks = [];
    for (let i = Math.floor(min / step) * step; i <= Math.ceil(max / step) * step; i += step) {
        ticks.push(i);
    }

    return ticks;
};

/**
 * Calculates the width needed for the Y-axis based on the formatted tick values
 */
export const calculateYAxisWidth = (ticks: number[], formatter: (value: number) => string): number => {
    if (!ticks.length) {
        return 40;
    }

    // Get the longest formatted tick value
    const maxFormattedLength = Math.max(...ticks.map(tick => formatter(tick).length));

    // Approximate width based on character count (assuming monospace font)
    // Add padding for safety
    const width = Math.max(20, maxFormattedLength * 8 + 8);
    return width;
};

/**
 * Return today and startdate for charts
 */
export const getRangeDates = (range: number) => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const endDate = moment().tz(timezone).endOf('day');
    let startDate;

    if (range === -1) {
        // Year to date - use January 1st of current year
        startDate = moment().tz(timezone).startOf('year');
    } else {
        // Regular range calculation
        startDate = moment().tz(timezone).subtract(range - 1, 'days').startOf('day');
    }

    return {startDate, endDate, timezone};
};

/**
 * Converts a country code to corresponding flag emoji
 */
export function getCountryFlag(countryCode:string) {
    if (!countryCode || countryCode === null || countryCode.toUpperCase() === 'NULL' || countryCode === 'ᴺᵁᴸᴸ') {
        return '🏳️';
    }
    return countryCode.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397)
    );
}

/**
 * Returns additional text for subheads
 */
export const getPeriodText = (range: number): string => {
    const option = STATS_RANGE_OPTIONS.find((opt: {value: number; name: string}) => opt.value === range);
    if (option) {
        if (['Last 7 days', 'Last 30 days', 'Last 3 months', 'Last 12 months'].includes(option.name)) {
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
 * Sanitizes chart data based on the date range
 * - For ranges between 91-356 days: shows weekly changes
 * - For ranges above 356 days or YTD: shows monthly changes
 * - For other ranges: keeps data as is
 * @param data The chart data to sanitize
 * @param range The date range in days
 * @param fieldName The name of the field to use for calculations
 * @param aggregationType The type of aggregation to use: 'sum', 'avg', or 'exact'
 */
export const sanitizeChartData = <T extends {date: string}>(data: T[], range: number, fieldName: keyof T = 'value' as keyof T, aggregationType: 'sum' | 'avg' | 'exact' = 'avg'): T[] => {
    if (!data.length) {
        return [];
    }

    // Helper function to detect potential bulk import events
    const detectBulkImports = (items: Array<T>) => {
        if (items.length <= 1) {
            return items;
        }

        // Calculate average and standard deviation
        const values = items.map(item => Number(item[fieldName]));
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        const stdDev = Math.sqrt(
            values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length
        );

        // Consider values that are more than 3 standard deviations from mean as outliers
        const threshold = avg + (3 * stdDev);

        return items.map((item) => {
            const value = Number(item[fieldName]);
            // If value is an outlier, mark it with a flag
            return {
                ...item,
                _isOutlier: value > threshold && value > avg * 5 // Ensure it's both statistically significant and at least 5x average
            };
        });
    };

    // Calculate the actual date span to determine appropriate aggregation
    const dateSpan = data.length > 1 ?
        moment(data[data.length - 1].date).diff(moment(data[0].date), 'days') : 0;

    // For YTD, use weekly aggregation if more than 60 days, or monthly if more than 150 days
    if (range === -1) {
        if (dateSpan > 150) {
            range = 400; // Force monthly aggregation
        } else if (dateSpan > 60) {
            range = 100; // Force weekly aggregation
        }
    }

    // For 'exact' aggregation type (like subscriber counts), always use month-end or key points approach
    if (aggregationType === 'exact' && (range > 356 || (range === -1 && dateSpan > 150))) {
        // For long ranges with cumulative data, we'll use a smarter approach
        // that preserves important data points while reducing noise

        const importantPoints = new Map<string, T>();

        // First, identify month boundaries (first/last day of each month)
        data.forEach((item) => {
            const itemDate = moment(item.date);
            const monthKey = itemDate.format('YYYY-MM');

            // Keep the first day of each month
            const firstDayKey = `${monthKey}-first`;
            if (!importantPoints.has(firstDayKey) ||
                moment(item.date).isBefore(moment(importantPoints.get(firstDayKey)!.date))) {
                importantPoints.set(firstDayKey, {...item});
            }

            // Keep the last day of each month
            const lastDayKey = `${monthKey}-last`;
            if (!importantPoints.has(lastDayKey) ||
                moment(item.date).isAfter(moment(importantPoints.get(lastDayKey)!.date))) {
                importantPoints.set(lastDayKey, {...item});
            }
        });

        // Also identify significant changes (>2% increase from previous)
        let lastValue = Number(data[0][fieldName]);
        data.forEach((item) => {
            const currentValue = Number(item[fieldName]);
            // If there's a significant increase from the last captured value
            if (currentValue > lastValue * 1.02) { // 2% threshold
                importantPoints.set(`significant-${item.date}`, {...item});
                lastValue = currentValue;
            }
        });

        // Always include first and last points in the dataset
        importantPoints.set('first', {...data[0]});
        importantPoints.set('last', {...data[data.length - 1]});

        // Convert to sorted array
        const result = Array.from(importantPoints.values())
            .sort((a, b) => moment(a.date).diff(moment(b.date)));

        return detectBulkImports(result);
    }

    if ((range >= 91 && range <= 356) || (range === -1 && dateSpan > 60 && dateSpan <= 150)) {
        // Weekly changes
        const weeklyData: T[] = [];
        let currentWeek = moment(data[0].date).startOf('week');
        let weekTotal = 0;
        let weekCount = 0;
        let lastValue = 0;

        data.forEach((item, index) => {
            const itemDate = moment(item.date);
            if (itemDate.isSame(currentWeek, 'week')) {
                weekTotal += Number(item[fieldName]);
                weekCount += 1;
                lastValue = Number(item[fieldName]);
            } else {
                // Add the value for the previous week
                weeklyData.push({
                    ...data[index - 1],
                    date: currentWeek.format('YYYY-MM-DD'),
                    [fieldName]: aggregationType === 'sum' ? weekTotal :
                        aggregationType === 'avg' ? (weekCount > 0 ? weekTotal / weekCount : 0) :
                            lastValue
                } as T);

                // Start new week
                currentWeek = itemDate.startOf('week');
                weekTotal = Number(item[fieldName]);
                weekCount = 1;
                lastValue = Number(item[fieldName]);
            }

            // Handle the last item
            if (index === data.length - 1) {
                weeklyData.push({
                    ...item,
                    date: currentWeek.format('YYYY-MM-DD'),
                    [fieldName]: aggregationType === 'sum' ? weekTotal :
                        aggregationType === 'avg' ? (weekCount > 0 ? weekTotal / weekCount : 0) :
                            lastValue
                } as T);
            }
        });

        return detectBulkImports(weeklyData);
    } else if (range > 356 || (range === -1 && dateSpan > 150)) {
        // Monthly changes
        const monthlyData: T[] = [];
        let currentMonth = moment(data[0].date).startOf('month');
        let monthTotal = 0;
        let monthCount = 0;
        let lastValue = 0;

        // For cumulative data like subscriber counts, we take the last value for each month
        if (aggregationType === 'exact') {
            const monthMap = new Map<string, T>();

            // Group by month and keep the latest entry for each month
            data.forEach((item) => {
                const itemDate = moment(item.date);
                const monthKey = itemDate.format('YYYY-MM');

                if (!monthMap.has(monthKey) || moment(item.date).isAfter(moment(monthMap.get(monthKey)!.date))) {
                    monthMap.set(monthKey, {...item});
                }
            });

            // Convert map to sorted array
            const sortedMonths = Array.from(monthMap.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([, value]) => value);

            return detectBulkImports(sortedMonths);
        }

        // For non-cumulative data (sum/avg)
        data.forEach((item, index) => {
            const itemDate = moment(item.date);
            const value = Number(item[fieldName]);

            if (itemDate.isSame(currentMonth, 'month')) {
                // Simple heuristic to detect bulk imports
                const isLikelyOutlier = aggregationType === 'sum' && value > 10000;
                if (!isLikelyOutlier) {
                    monthTotal += value;
                    monthCount += 1;
                }
                lastValue = value;
            } else {
                // Add the value for the previous month
                monthlyData.push({
                    ...data[index - 1],
                    date: currentMonth.format('YYYY-MM-DD'),
                    [fieldName]: aggregationType === 'sum'
                        ? monthTotal // Use the accumulated total
                        : aggregationType === 'avg'
                            ? (monthCount > 0 ? monthTotal / monthCount : 0)
                            : lastValue
                } as T);

                // Start new month
                currentMonth = itemDate.startOf('month');
                monthTotal = value;
                monthCount = 1;
                lastValue = value;
            }

            // Handle the last item
            if (index === data.length - 1) {
                monthlyData.push({
                    ...item,
                    date: currentMonth.format('YYYY-MM-DD'),
                    [fieldName]: aggregationType === 'sum'
                        ? monthTotal
                        : aggregationType === 'avg'
                            ? (monthCount > 0 ? monthTotal / monthCount : 0)
                            : lastValue
                } as T);
            }
        });

        return detectBulkImports(monthlyData);
    }

    // Return data as is for other ranges
    return detectBulkImports(data);
};

/**
 * Formats a date based on the range
 * - For ranges above 365 days: shows month and year (e.g. "Apr 2025")
 * - For ranges above 91 days: shows "Week of [date]"
 * - For other ranges: uses the default formatDisplayDate
 */
export const formatDisplayDateWithRange = (date: string, range: number): string => {
    if (range > 365) {
        return moment(date).format('MMM YYYY');
    } else if (range >= 91) {
        return `Week of ${formatDisplayDate(date)}`;
    }
    return formatDisplayDate(date);
};