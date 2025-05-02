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
    const startDate = moment().tz(timezone).subtract(range - 1, 'days').startOf('day');
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
 * - For ranges above 356 days: shows monthly changes
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

    if (range >= 91 && range <= 356) {
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

        return weeklyData;
    } else if (range > 356) {
        // Monthly changes
        const monthlyData: T[] = [];
        let currentMonth = moment(data[0].date).startOf('month');
        let monthTotal = 0;
        let monthCount = 0;
        let lastValue = 0;

        data.forEach((item, index) => {
            const itemDate = moment(item.date);
            if (itemDate.isSame(currentMonth, 'month')) {
                monthTotal += Number(item[fieldName]);
                monthCount += 1;
                lastValue = Number(item[fieldName]);
            } else {
                // Add the value for the previous month
                monthlyData.push({
                    ...data[index - 1],
                    date: currentMonth.format('YYYY-MM-DD'),
                    [fieldName]: aggregationType === 'sum' ? monthTotal :
                        aggregationType === 'avg' ? (monthCount > 0 ? monthTotal / monthCount : 0) :
                            lastValue
                } as T);

                // Start new month
                currentMonth = itemDate.startOf('month');
                monthTotal = Number(item[fieldName]);
                monthCount = 1;
                lastValue = Number(item[fieldName]);
            }

            // Handle the last item
            if (index === data.length - 1) {
                monthlyData.push({
                    ...item,
                    date: currentMonth.format('YYYY-MM-DD'),
                    [fieldName]: aggregationType === 'sum' ? monthTotal :
                        aggregationType === 'avg' ? (monthCount > 0 ? monthTotal / monthCount : 0) :
                            lastValue
                } as T);
            }
        });

        return monthlyData;
    }

    // Return original data for ranges < 91 days
    return data;
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
