import {STATS_RANGES} from '@/shared/analytics/constants';
import {describe, expect, it} from 'vitest';
import {getPeriodText} from '@/posts/analytics/utils/chart-helpers';

describe('getPeriodText', () => {
    it('should return correct text for known ranges', () => {
        expect(getPeriodText(STATS_RANGES.last7Days.value)).toBe('in the last 7 days');
        expect(getPeriodText(STATS_RANGES.last30Days.value)).toBe('in the last 30 days');
        expect(getPeriodText(STATS_RANGES.last3Months.value)).toBe('in the last 90 days');
        expect(getPeriodText(STATS_RANGES.last12Months.value)).toBe('in the last 12 months');
        expect(getPeriodText(STATS_RANGES.allTime.value)).toBe('(all time)');
    });

    it('should return empty string for unknown range', () => {
        expect(getPeriodText(-99)).toBe('');
    });

    it('should handle edge case ranges correctly', () => {
        // Test ranges that fall through to the lowercase fallback
        expect(getPeriodText(STATS_RANGES.today.value)).toBe('today');
        expect(getPeriodText(STATS_RANGES.yearToDate.value)).toBe('year to date');
    });
});
