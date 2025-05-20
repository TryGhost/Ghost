import {STATS_RANGES} from '@src/utils/constants';
/**
 * Returns additional text for subheads
 */
export const getPeriodText = (range: number): string => {
    const option = Object.values(STATS_RANGES).find(opt => opt.value === range);
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