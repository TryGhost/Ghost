import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getCommentsStatsSearchParams,
  getComparisonText,
  getTrend,
  parseRangeParam,
  parseTabParam,
} from './comments-analytics-helpers';

describe('comments analytics helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 03:00 UTC on Nov 17 is still Nov 16 in New York
    vi.setSystemTime(new Date('2026-11-17T03:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves ranges to inclusive dates in the site timezone', () => {
    expect(getCommentsStatsSearchParams(30, 'America/New_York')).toEqual({
      date_from: '2026-10-18',
      date_to: '2026-11-16',
      timezone: 'America/New_York',
    });
    expect(getCommentsStatsSearchParams(30, 'Asia/Tokyo')).toEqual({
      date_from: '2026-10-19',
      date_to: '2026-11-17',
      timezone: 'Asia/Tokyo',
    });
  });

  it('starts year to date on January 1', () => {
    expect(getCommentsStatsSearchParams(-1, 'UTC').date_from).toBe('2026-01-01');
  });

  it('falls back to the defaults for unknown params', () => {
    expect(parseRangeParam('90')).toBe(90);
    expect(parseRangeParam('42')).toBe(30);
    expect(parseRangeParam(null)).toBe(30);
    expect(parseTabParam('reported')).toBe('reported');
    expect(parseTabParam('nope')).toBe('comments');
  });

  it('compares against the previous period', () => {
    expect(getTrend(15, 10, 30)).toEqual({ direction: 'up', value: '+50%' });
    expect(getTrend(5, 10, 30)).toEqual({ direction: 'down', value: '-50%' });
  });

  it('hides the trend when there is no change or nothing to compare', () => {
    expect(getTrend(10, 10, 30).direction).toBe('hidden');
    expect(getTrend(10, 0, 30).direction).toBe('hidden');
    expect(getTrend(10, 5, 1000).direction).toBe('hidden');
  });

  it('describes the comparison period', () => {
    expect(getComparisonText('+50%', 1)).toBe('+50% compared to the previous day');
    expect(getComparisonText('+50%', 7)).toBe('+50% compared to the previous 7 days');
  });
});
