import {STATS_RANGES} from '@src/utils/constants';
import {describe, expect, it, vi} from 'vitest';
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

    it('should return lowercase name for non-standard range', () => {
        // Mock Object.values to return a custom range
        const spy = vi.spyOn(Object, 'values');
        spy.mockReturnValue([{value: 999, name: 'Custom Range'}]);
        expect(getPeriodText(999)).toBe('custom range');
        spy.mockRestore();
    });
}); 