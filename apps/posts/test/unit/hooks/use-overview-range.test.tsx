import {STATS_RANGES} from '@src/utils/constants';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {renderHook} from '@testing-library/react';
import {useOverviewRange} from '@src/views/comments/hooks/use-overview-range';

describe('useOverviewRange', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('uses Jan 1 through today for year to date', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-05-06T12:00:00.000Z'));

        const {result} = renderHook(() => useOverviewRange(STATS_RANGES.YEAR_TO_DATE.value));

        expect(result.current.dateFrom).toBe('2026-01-01');
        expect(result.current.dateTo).toBe('2026-05-06');
    });
});
