import moment from 'moment-timezone';

/**
 * Calculates Y-axis ticks based on the data values
 */
export const getYTicks = (data: { value: number }[]): number[] => {
    if (!data?.length) {
        return [];
    }
    const values = data.map(d => Number(d.value));
    const max = Math.max(...values);
    const min = Math.min(...values);
    const step = Math.pow(10, Math.floor(Math.log10(max - min)));
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
    if (!countryCode || countryCode === null || countryCode.toUpperCase() === 'ᴺᵁᴸᴸ') {
        return '🏳️';
    }
    return countryCode.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397)
    );
}