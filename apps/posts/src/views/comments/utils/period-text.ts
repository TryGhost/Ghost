import {STATS_RANGES} from '@src/utils/constants';

const RANGE_BY_VALUE = new Map<number, string>(
    Object.values(STATS_RANGES).map(option => [option.value, option.name])
);

/**
 * Returns a phrase describing the selected date range, ready to append to a
 * card title or description: e.g. "in the last 30 days", "(all time)".
 */
export const getPeriodText = (range: number): string => {
    const name = RANGE_BY_VALUE.get(range);
    if (!name) {
        return '';
    }
    if (['Last 7 days', 'Last 30 days', 'Last 90 days', 'Last 12 months'].includes(name)) {
        return `in the ${name.toLowerCase()}`;
    }
    if (name === 'All time') {
        return '(all time)';
    }
    return name.toLowerCase();
};

/**
 * Returns a phrase describing the prior comparison period, or '' when no
 * comparable prior period exists (e.g. "All time").
 */
export const getPreviousPeriodText = (range: number): string => {
    const name = RANGE_BY_VALUE.get(range);
    if (!name) {
        return '';
    }
    if (name === 'Today') {
        return 'previous day';
    }
    if (name === 'Year to date') {
        return 'same period last year';
    }
    if (name === 'All time') {
        return '';
    }
    // "Last 7 days" → "previous 7 days", "Last 12 months" → "previous 12 months"
    return name.toLowerCase().replace(/^last /, 'previous ');
};
