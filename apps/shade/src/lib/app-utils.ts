import moment, {Moment} from 'moment-timezone';

import {formatDisplayDate} from './ds-utils';

// Format date for stats query
export const formatQueryDate = (date: Moment) => {
    return date.format('YYYY-MM-DD');
};

// Format cents to Dollars
export const centsToDollars = (value: number) => {
    return Math.round(value / 100);
};

/* Chart formatters
/* -------------------------------------------------------------------------- */

export const getYRange = (data: { value: number }[]): {min: number; max: number} => {
    if (!data.length) {
        return {min: 0, max: 1};
    }

    const values = data.map(d => Number(d.value));
    let min = Math.min(...values);
    let max = Math.max(...values);

    if (min === max) {
        const value = min;
        return {min: Math.max(0, value - 1), max: value + 1};
    }

    // Use a percentage-based padding (10% of the range)
    const padding = 0.02;

    // Add padding and ensure min is not negative
    min = Math.max(0, min - (min * padding));
    max = max + (max * padding);

    const range = max - min;

    // Determine the order of magnitude for rounding based on the range
    const rangeMagnitude = Math.floor(Math.log10(range));
    // Always round to at least 10s, but use larger steps for bigger ranges
    // const roundTo = Math.max(10, Math.pow(10, rangeMagnitude));
    const roundTo = Math.pow(10, rangeMagnitude);

    // Round min and max to the appropriate precision
    const roundedMax = Math.round(max / roundTo) * roundTo;
    max = roundedMax < max ? Math.ceil(max / roundTo) * roundTo : roundedMax;

    const roundedMin = Math.round(min / roundTo) * roundTo;
    min = roundedMin > min ? Math.floor(min / roundTo) * roundTo : roundedMin;
    min = Math.max(0, min);

    // Ensure we have a visible range even after rounding
    if (min === max) {
        const midPoint = (min + max) / 2;
        const smallRange = Math.max(Math.abs(midPoint) * padding, roundTo);
        min = Math.max(0, Math.floor(midPoint - smallRange));
        max = Math.ceil(midPoint + smallRange);
    }

    // Final safety check to ensure min is never negative
    min = Math.max(0, min);

    return {min, max};
};

// Calculates the width needed for the Y-axis based on the formatted tick values
export const calculateYAxisWidth = (ticks: number[], formatter: (value: number) => string): number => {
    if (!ticks.length) {
        return 40;
    }

    // Get the longest formatted tick value
    const maxFormattedLength = Math.max(...ticks.map(tick => formatter(tick).length));

    // Approximate width based on character count (assuming monospace font)
    // Add padding for safety
    const width = Math.max(20, maxFormattedLength * 8 + 20);
    return width;
};

// Get range for date
export const getRangeForStartDate = (startDate: string) => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const publishedDate = moment(startDate).tz(timezone).startOf('day');
    const today = moment().tz(timezone).startOf('day');
    const diffInDays = today.diff(publishedDate, 'days') + 1;

    // Ensure minimum of 1 day to avoid issues with same-day publications
    return Math.max(diffInDays, 1);
};

//Return today and startdate for charts
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
 * Formats a date based on the range
 * - For ranges above 365 days: shows month and year (e.g. "Apr 2025")
 * - For ranges above 91 days: shows "Week of [date]"
 * - For other ranges: uses the default formatDisplayDate
 */
export const formatDisplayDateWithRange = (date: string, range: number, showHours: boolean = false, hoursOnly: boolean = false): string => {
    if (range === 1 && hoursOnly) {
        return moment(date).format('h:mma');
    } else if (range === 1 && showHours) {
        return moment(date).format('MMM D, h:mma');
    } else if (range > 365) {
        return moment(date).format('MMM YYYY');
    } else if (range >= 91) {
        return `Week of ${formatDisplayDate(date)}`;
    }
    return formatDisplayDate(date);
};

/**
 * Member formatters
 */

// Helper function to format member names with fallback to email
export const formatMemberName = (member: {name?: string; email?: string}) => {
    return (member.name && member.name.trim()) || member.email || 'Unknown Member';
};

// Helper function to get member initials
export const getMemberInitials = (member: {name?: string}) => {
    const name = formatMemberName(member);
    const words = name.split(' ');
    if (words.length >= 2) {
        return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};
