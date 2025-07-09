import {STATS_RANGES} from '@src/utils/constants';
import {describe, expect, it} from 'vitest';
import {getPeriodText} from '@src/utils/chart-helpers';

describe('getPeriodText', () => {
    it('should return correct text for known ranges', () => {
        expect(getPeriodText(STATS_RANGES.LAST_7_DAYS.value)).toBe('in the last 7 days');
        expect(getPeriodText(STATS_RANGES.LAST_30_DAYS.value)).toBe('in the last 30 days');
        expect(getPeriodText(STATS_RANGES.LAST_3_MONTHS.value)).toBe('in the last 3 months');
        expect(getPeriodText(STATS_RANGES.LAST_12_MONTHS.value)).toBe('in the last 12 months');
        expect(getPeriodText(STATS_RANGES.ALL_TIME.value)).toBe('(all time)');
    });

    it('should return empty string for unknown range', () => {
        expect(getPeriodText(-1)).toBe('');
    });

    it('should handle edge case ranges correctly', () => {
        // Test ranges that fall through to the lowercase fallback
        expect(getPeriodText(STATS_RANGES.TODAY.value)).toBe('today');
        expect(getPeriodText(STATS_RANGES.YEAR_TO_DATE.value)).toBe('year to date');
    });
}); 