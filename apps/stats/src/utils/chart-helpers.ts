import moment from 'moment-timezone';
import {STATS_RANGE_OPTIONS} from '@src/utils/constants';

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
