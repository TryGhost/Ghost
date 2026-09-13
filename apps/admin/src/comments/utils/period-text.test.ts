import { describe, expect, it } from 'vitest';
import { STATS_RANGES } from '@/shared/analytics/constants';
import { getPreviousPeriodText } from './period-text';

describe('getPreviousPeriodText', () => {
  it('describes a length-matched preceding window', () => {
    expect(getPreviousPeriodText(STATS_RANGES.today.value)).toBe('previous day');
    expect(getPreviousPeriodText(STATS_RANGES.last7Days.value)).toBe('previous 7 days');
    expect(getPreviousPeriodText(STATS_RANGES.last30Days.value)).toBe('previous 30 days');
    expect(getPreviousPeriodText(STATS_RANGES.yearToDate.value)).toBe('previous period');
  });

  it('returns empty for all time', () => {
    expect(getPreviousPeriodText(STATS_RANGES.allTime.value)).toBe('');
  });
});
