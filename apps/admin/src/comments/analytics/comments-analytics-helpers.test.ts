import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getCommentsStatsSearchParams,
  getCommentsListFilter,
  getComparisonText,
  getTrend,
  parseCommentsCustomRange,
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

  it('leaves the start of all time to the server', () => {
    expect(getCommentsStatsSearchParams(1000, 'UTC')).toEqual({
      date_to: '2026-11-17',
      timezone: 'UTC',
    });
  });

  it('falls back to the defaults for unknown params', () => {
    expect(parseRangeParam('90')).toBe(90);
    expect(parseRangeParam('42')).toBe(1000);
    expect(parseRangeParam(null)).toBe(1000);
    expect(parseRangeParam('custom')).toBe(-2);
    expect(parseTabParam('reported')).toBe('reported');
    expect(parseTabParam('nope')).toBe('comments');
  });

  it('uses the same calendar dates for custom stats and list filters across DST', () => {
    const custom = { from: '2026-03-08', to: '2026-03-08' };
    expect(getCommentsStatsSearchParams(-2, 'America/New_York', custom)).toEqual({
      date_from: custom.from,
      date_to: custom.to,
      timezone: 'America/New_York',
    });
    expect(getCommentsListFilter(-2, 'America/New_York', 'status:hidden', custom)).toBe(
      "(status:hidden)+created_at:>='2026-03-08T05:00:00.000Z'+created_at:<'2026-03-09T04:00:00.000Z'",
    );
  });

  it('groups an existing OR filter before adding date bounds', () => {
    expect(getCommentsListFilter(1, 'UTC', 'status:hidden,status:published')).toBe(
      "(status:hidden,status:published)+created_at:>='2026-11-17T00:00:00.000Z'+created_at:<'2026-11-18T00:00:00.000Z'",
    );
  });

  it('matches the server All time horizon and excludes future comments', () => {
    expect(getCommentsListFilter(1000, 'UTC')).toBe(
      "created_at:>='2016-11-10T00:00:00.000Z'+created_at:<'2026-11-18T00:00:00.000Z'",
    );
  });

  it('validates custom date links before querying', () => {
    expect(parseCommentsCustomRange('2026-01-01', '2026-11-16', 'UTC')).toEqual({
      from: '2026-01-01',
      to: '2026-11-16',
    });
    expect(parseCommentsCustomRange(null, '2026-11-16', 'UTC')).toBeUndefined();
    expect(parseCommentsCustomRange('2026-02-30', '2026-03-01', 'UTC')).toBeUndefined();
    expect(parseCommentsCustomRange('2026-03-02', '2026-03-01', 'UTC')).toBeUndefined();
    expect(
      parseCommentsCustomRange('2026-01-01', '2026-11-17', 'America/New_York'),
    ).toBeUndefined();
    expect(parseCommentsCustomRange('2010-01-01', '2026-11-16', 'UTC')).toBeUndefined();
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
