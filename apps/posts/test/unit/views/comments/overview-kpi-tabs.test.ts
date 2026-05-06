import {STATS_RANGES} from '@src/utils/constants';
import {describe, expect, it} from 'vitest';
import {shouldHideDiffs} from '@src/views/comments/components/overview-kpi-tabs';

describe('shouldHideDiffs', () => {
    it('hides diffs for all time and year to date', () => {
        expect(shouldHideDiffs(STATS_RANGES.ALL_TIME.value)).toBe(true);
        expect(shouldHideDiffs(STATS_RANGES.YEAR_TO_DATE.value)).toBe(true);
    });

    it('shows diffs for bounded trailing ranges', () => {
        expect(shouldHideDiffs(STATS_RANGES.LAST_7_DAYS.value)).toBe(false);
        expect(shouldHideDiffs(STATS_RANGES.LAST_30_DAYS.value)).toBe(false);
    });
});
