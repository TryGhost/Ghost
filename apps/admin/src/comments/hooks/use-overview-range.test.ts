import moment from 'moment-timezone';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { STATS_RANGES } from '@/shared/analytics/constants';
import { useCommentsOverviewSearchParams } from './use-comments-overview-rail';
import { useOverviewRange } from './use-overview-range';

describe('useOverviewRange', () => {
  it('sends the fixed all time window used across analytics', () => {
    const { result } = renderHook(() => useOverviewRange('Etc/UTC'));

    act(() => {
      result.current.setRange(STATS_RANGES.allTime.value);
    });

    const expectedFrom = moment()
      .tz('Etc/UTC')
      .subtract(STATS_RANGES.allTime.value - 1, 'days')
      .format('YYYY-MM-DD');

    expect(result.current.dateFrom).toBe(expectedFrom);
    expect(result.current.dateTo).toBe(moment().tz('Etc/UTC').format('YYYY-MM-DD'));
  });

  it('always sends both bounds to the API', () => {
    const { result } = renderHook(() =>
      useCommentsOverviewSearchParams('2026-01-01', '2026-01-31', 'Etc/UTC'),
    );

    expect(result.current).toEqual({
      date_from: '2026-01-01',
      date_to: '2026-01-31',
      timezone: 'Etc/UTC',
    });
  });
});
