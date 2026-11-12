import moment from 'moment';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mockLoading,
  mockNull,
  mockSuccess,
} from '@tryghost/admin-x-framework/test/hook-testing-utils';
import { renderHook, waitFor } from '@testing-library/react';
import { useGrowthStats } from '@/analytics/hooks/use-growth-stats';

// Mock external dependencies
vi.mock('@tryghost/admin-x-framework/api/stats', () => ({
  useMemberCountHistory: vi.fn(),
  useMrrHistory: vi.fn(),
  useSubscriptionStats: vi.fn(),
}));

vi.mock('@tryghost/admin-x-framework', () => ({
  getSymbol: vi.fn(),
}));

vi.mock('@/shared/analytics/chart-helpers', async () => {
  const actual = await vi.importActual('@/shared/analytics/chart-helpers');
  return {
    ...actual,
    getRangeDates: vi.fn(),
  };
});

import { getRangeDates } from '@/shared/analytics/chart-helpers';
import { getSymbol } from '@tryghost/admin-x-framework';
import { STATS_RANGES } from '@/shared/analytics/constants';
import {
  useMemberCountHistory,
  useMrrHistory,
  useSubscriptionStats,
} from '@tryghost/admin-x-framework/api/stats';

const mockedUseMemberCountHistory = useMemberCountHistory as ReturnType<typeof vi.fn>;
const mockedUseMrrHistory = useMrrHistory as ReturnType<typeof vi.fn>;
const mockedUseSubscriptionStats = useSubscriptionStats as ReturnType<typeof vi.fn>;
const mockedGetSymbol = getSymbol as ReturnType<typeof vi.fn>;
const mockedGetRangeDates = getRangeDates as ReturnType<typeof vi.fn>;

// Mock data for testing
const mockMemberData = [
  {
    date: '2024-06-25',
    free: 100,
    paid: 50,
    comped: 5,
    gift: 6,
    paid_subscribed: 5,
    paid_canceled: 2,
  },
  {
    date: '2024-06-26',
    free: 105,
    paid: 52,
    comped: 5,
    gift: 7,
    paid_subscribed: 3,
    paid_canceled: 1,
  },
  {
    date: '2024-06-27',
    free: 110,
    paid: 55,
    comped: 5,
    gift: 8,
    paid_subscribed: 4,
    paid_canceled: 1,
  },
];

const mockMrrData = [
  { date: '2024-06-25', mrr: 5000, currency: 'usd' },
  { date: '2024-06-26', mrr: 5200, currency: 'usd' },
  { date: '2024-06-27', mrr: 5500, currency: 'usd' },
];

const mockSubscriptionData = [
  { date: '2024-06-25', signups: 5, cancellations: 2 },
  { date: '2024-06-26', signups: 3, cancellations: 1 },
  { date: '2024-06-27', signups: 4, cancellations: 1 },
];

describe('useGrowthStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date(2024, 5, 27, 12));

    // Mock getRangeDates with realistic behavior
    mockedGetRangeDates.mockImplementation((range: number) => {
      const endDate = moment();
      const startDate =
        range === -1 ? moment().startOf('year') : moment().subtract(range - 1, 'days');
      return { startDate, endDate };
    });

    // Default successful responses
    mockSuccess(mockedUseMemberCountHistory, {
      stats: mockMemberData,
      meta: {
        totals: { paid: 55, free: 110, comped: 5, gift: 8 },
      },
    });

    mockSuccess(mockedUseMrrHistory, {
      stats: mockMrrData,
      meta: {
        totals: [{ mrr: 5500, currency: 'usd' }],
      },
    });

    mockSuccess(mockedUseSubscriptionStats, {
      stats: mockSubscriptionData,
    });

    mockedGetSymbol.mockReturnValue('$');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    STATS_RANGES.last7Days,
    STATS_RANGES.last30Days,
    STATS_RANGES.last3Months,
    STATS_RANGES.last12Months,
    STATS_RANGES.yearToDate,
  ])('includes first-day growth in $name', ({ value }) => {
    const { startDate, endDate } = getRangeDates(value);
    const firstDay = startDate.format('YYYY-MM-DD');
    const previousDay = startDate.clone().subtract(1, 'day').format('YYYY-MM-DD');
    const lastDay = endDate.format('YYYY-MM-DD');
    const before = { ...mockMemberData[0], date: previousDay, free: 130 };
    const first = { ...mockMemberData[2], date: firstDay, free: 139 };
    const last = { ...first, date: lastDay, paid_subscribed: 0, paid_canceled: 0 };

    // Member history starts on the requested date. MRR history also includes
    // the closing balance immediately before its first change.
    mockedUseMemberCountHistory.mockImplementation(
      ({ searchParams }: { searchParams: { date_from: string } }) => ({
        data: {
          stats: [before, first, last].filter(({ date }) => date >= searchParams.date_from),
        },
        isLoading: false,
      }),
    );
    mockSuccess(mockedUseMrrHistory, {
      stats: [
        { date: previousDay, mrr: 5000, currency: 'usd' },
        { date: firstDay, mrr: 5500, currency: 'usd' },
      ],
      meta: { totals: [{ mrr: 5500, currency: 'usd' }] },
    });

    const { result } = renderHook(() => useGrowthStats(value));

    expect(result.current.totals.percentChanges).toEqual({
      total: '8%',
      free: '7%',
      paid: '11%',
      mrr: '10%',
    });
    expect(result.current.totals.directions).toEqual({
      total: 'up',
      free: 'up',
      paid: 'up',
      mrr: 'up',
    });
    expect(result.current.chartData.map(({ date }) => date)).toEqual([firstDay, lastDay]);
    expect(result.current.chartData[0]).toMatchObject({ free: 139, mrr: 5500, paid_subscribed: 4 });
  });

  describe('hook basic functionality', () => {
    it('returns initial loading state', () => {
      mockLoading(mockedUseMemberCountHistory);
      mockLoading(mockedUseMrrHistory);
      mockLoading(mockedUseSubscriptionStats);

      const { result } = renderHook(() => useGrowthStats(30));

      expect(result.current.isLoading).toBe(true);
    });

    it('returns data when loaded', async () => {
      const { result } = renderHook(() => useGrowthStats(30));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.chartData).toBeDefined();
      expect(result.current.totals).toBeDefined();
      expect(result.current.currencySymbol).toBe('$');
      expect(result.current.subscriptionData).toBeDefined();
    });

    it('calculates correct totals', async () => {
      const { result } = renderHook(() => useGrowthStats(30));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.totals.totalMembers).toBe(178); // 110 + 55 + 5 + 8
      expect(result.current.totals.freeMembers).toBe(110);
      expect(result.current.totals.paidMembers).toBe(68); // 55 + 5 + 8 (gift treated like comped)
      expect(result.current.totals.mrr).toBe(5500);
    });

    it('handles range=1 (Today) correctly', async () => {
      const { result } = renderHook(() => useGrowthStats(1));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // For range=1, should create two data points for proper line chart
      expect(result.current.chartData).toHaveLength(2);
    });
  });

  describe('data processing', () => {
    it('handles empty member data response', async () => {
      mockSuccess(mockedUseMemberCountHistory, {
        stats: [],
        meta: { totals: { paid: 0, free: 0, comped: 0, gift: 0 } },
      });

      const { result } = renderHook(() => useGrowthStats(30));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.totals.totalMembers).toBe(0);
    });

    it('handles array response format', async () => {
      mockSuccess(
        mockedUseMemberCountHistory,
        mockMemberData, // Direct array instead of stats object
      );

      const { result } = renderHook(() => useGrowthStats(30));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.chartData).toBeDefined();
    });

    it('handles multi-currency MRR data', async () => {
      const mockMultiCurrencyMrrData = [
        { date: '2024-06-25', mrr: 5000, currency: 'usd' },
        { date: '2024-06-25', mrr: 1000, currency: 'eur' },
        { date: '2024-06-26', mrr: 5200, currency: 'usd' },
        { date: '2024-06-26', mrr: 1100, currency: 'eur' },
        { date: '2024-06-27', mrr: 5500, currency: 'usd' },
        { date: '2024-06-27', mrr: 1200, currency: 'eur' },
      ];

      mockSuccess(mockedUseMrrHistory, {
        stats: mockMultiCurrencyMrrData,
        meta: {
          totals: [
            { mrr: 5500, currency: 'usd' },
            { mrr: 1200, currency: 'eur' },
          ],
        },
      });

      const { result } = renderHook(() => useGrowthStats(30));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should select USD as it has higher MRR
      expect(result.current.selectedCurrency).toBe('usd');
      expect(result.current.totals.mrr).toBe(5500);
    });

    it('handles subscription data merging by date', async () => {
      // Use dates within the current range
      const today = moment().format('YYYY-MM-DD');
      const yesterday = moment().subtract(1, 'day').format('YYYY-MM-DD');

      const duplicateSubscriptionData = [
        { date: today, signups: 3, cancellations: 1 },
        { date: today, signups: 2, cancellations: 1 }, // Same date
        { date: yesterday, signups: 4, cancellations: 2 },
      ];

      mockSuccess(mockedUseSubscriptionStats, {
        stats: duplicateSubscriptionData,
      });

      const { result } = renderHook(() => useGrowthStats(30));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const mergedData = result.current.subscriptionData;
      const todayData = mergedData.find((item) => item.date === today);
      expect(todayData?.signups).toBe(5); // 3 + 2
      expect(todayData?.cancellations).toBe(2); // 1 + 1
    });

    it('filters subscription data by date range', async () => {
      // Use realistic date ranges relative to today
      const today = moment().format('YYYY-MM-DD');
      const yesterday = moment().subtract(1, 'day').format('YYYY-MM-DD');
      const lastWeek = moment().subtract(8, 'days').format('YYYY-MM-DD'); // Out of 7-day range

      const outOfRangeData = [
        { date: lastWeek, signups: 5, cancellations: 2 }, // Out of range
        { date: yesterday, signups: 3, cancellations: 1 }, // In range
        { date: today, signups: 4, cancellations: 2 }, // In range
      ];

      mockSuccess(mockedUseSubscriptionStats, {
        stats: outOfRangeData,
      });

      const { result } = renderHook(() => useGrowthStats(7));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should only include data within range
      expect(result.current.subscriptionData).toHaveLength(2);
      expect(result.current.subscriptionData.every((item) => item.date >= yesterday)).toBe(true);
    });
  });

  describe('MRR data processing', () => {
    it('uses the opening balance when the first MRR change is later in the range', () => {
      mockSuccess(mockedUseMrrHistory, {
        stats: [
          { date: '2024-06-25', mrr: 5000, currency: 'usd' },
          { date: '2024-06-26', mrr: 5500, currency: 'usd' },
        ],
        meta: { totals: [{ mrr: 5500, currency: 'usd' }] },
      });

      const { result } = renderHook(() => useGrowthStats(STATS_RANGES.last7Days.value));

      expect(result.current.totals.percentChanges.mrr).toBe('10%');
      expect(result.current.totals.directions.mrr).toBe('up');
    });

    it('adds start point when missing', async () => {
      const earlierMrrData = [
        { date: '2024-06-20', mrr: 5000, currency: 'usd' },
        { date: '2024-06-27', mrr: 5500, currency: 'usd' },
      ];

      mockSuccess(mockedUseMrrHistory, {
        stats: earlierMrrData,
        meta: {
          totals: [{ mrr: 5500, currency: 'usd' }],
        },
      });

      const { result } = renderHook(() => useGrowthStats(7));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should add synthetic start point
      expect(result.current.mrrData.length).toBeGreaterThan(1);
    });

    it('uses earliest data point when no MRR data exists before dateFrom', async () => {
      // Simulate the bug: API returns MRR data starting AFTER dateFrom
      // For a 90-day range, dateFrom would be ~90 days ago
      // But the MRR data only starts 15 days into that range
      const startDate = moment().subtract(89, 'days');
      const dateFrom = startDate.format('YYYY-MM-DD');

      // MRR data starts 15 days AFTER dateFrom (no data before range)
      const firstMrrDate = moment(startDate).add(15, 'days').format('YYYY-MM-DD');
      const secondMrrDate = moment(startDate).add(16, 'days').format('YYYY-MM-DD');

      const lateMrrData = [
        { date: firstMrrDate, mrr: 17286, currency: 'usd' },
        { date: secondMrrDate, mrr: 17286, currency: 'usd' },
      ];

      // Update getRangeDates mock to return predictable dates
      mockedGetRangeDates.mockImplementation(() => ({
        startDate,
        endDate: moment(),
      }));

      mockSuccess(mockedUseMrrHistory, {
        stats: lateMrrData,
        meta: {
          totals: [{ mrr: 17286, currency: 'usd' }],
        },
      });

      const { result } = renderHook(() => useGrowthStats(90));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // The first data point should be at dateFrom (synthetic start point)
      expect(result.current.mrrData[0].date).toBe(dateFrom);

      // The MRR value should be the earliest available value (17286), NOT 0
      expect(result.current.mrrData[0].mrr).toBe(17286);
    });

    it.each([
      {
        name: 'includes activity after midnight in Kolkata',
        localMidnight: '2024-06-27T00:00:00+05:30',
        startAt: '2024-06-26T18:30:00Z',
        closingDate: '2024-06-26',
        legacyOpening: 11000,
        opening: 10000,
        closing: 11000,
        percent: 10,
        direction: 'up',
      },
      {
        name: 'excludes activity before midnight in New York',
        localMidnight: '2024-06-27T00:00:00-04:00',
        startAt: '2024-06-27T04:00:00Z',
        closingDate: undefined,
        legacyOpening: 10000,
        opening: 11000,
        closing: 11000,
        percent: 0,
        direction: 'same',
      },
      {
        name: 'plots a decline in UTC',
        localMidnight: '2024-06-27T00:00:00Z',
        startAt: '2024-06-27T00:00:00Z',
        closingDate: '2024-06-27',
        legacyOpening: 10000,
        opening: 10000,
        closing: 9500,
        percent: -5,
        direction: 'down',
      },
    ])(
      'Today MRR $name',
      ({
        localMidnight,
        startAt,
        closingDate,
        legacyOpening,
        opening,
        closing,
        percent,
        direction,
      }) => {
        const startDate = moment.parseZone(localMidnight);
        mockedGetRangeDates.mockReturnValue({ startDate, endDate: startDate.clone().endOf('day') });
        const total = { mrr: closing, currency: 'usd' };
        mockedUseMrrHistory.mockImplementation(
          ({ searchParams }: NonNullable<Parameters<typeof useMrrHistory>[0]>) => {
            const usesLocalMidnight =
              searchParams?.date_from === '2024-06-27' && searchParams.start_at === startAt;
            const openingMrr = { ...total, mrr: usesLocalMidnight ? opening : legacyOpening };
            const lastChangeDate = usesLocalMidnight ? closingDate : '2024-06-27';
            const openingDate = lastChangeDate
              ? moment.utc(lastChangeDate).subtract(1, 'day').format('YYYY-MM-DD')
              : '2024-06-27';
            return {
              isLoading: false,
              data: {
                stats: [
                  { ...openingMrr, date: openingDate },
                  ...(lastChangeDate ? [{ ...total, date: lastChangeDate }] : []),
                ],
                meta: {
                  totals: [total],
                  ...(usesLocalMidnight ? { opening_totals: [openingMrr] } : {}),
                },
              },
            };
          },
        );

        const { result } = renderHook(() => useGrowthStats(STATS_RANGES.today.value));

        expect(result.current.mrrChartData.map(({ date, mrr }) => ({ date, mrr }))).toEqual([
          { date: '2024-06-27', mrr: opening },
          { date: '2024-06-28', mrr: closing },
        ]);
        expect(result.current.totals.mrr).toBe(closing);
        expect(Number.parseFloat(result.current.totals.percentChanges.mrr)).toBe(percent);
        expect(result.current.totals.directions.mrr).toBe(direction);
      },
    );

    it('keeps the MRR chart on local Today when member history ends on the previous UTC date', () => {
      const startDate = moment.parseZone('2024-06-27T00:00:00+05:30');
      mockedGetRangeDates.mockReturnValue({ startDate, endDate: startDate.clone().endOf('day') });
      const member = mockMemberData[1];
      mockSuccess(mockedUseMemberCountHistory, { stats: [member], meta: { totals: member } });
      const opening = { currency: 'usd', mrr: 10000 };
      const closing = { currency: 'usd', mrr: 11000 };
      mockSuccess(mockedUseMrrHistory, {
        stats: [
          { ...opening, date: '2024-06-25' },
          { ...closing, date: '2024-06-26' },
        ],
        meta: { totals: [closing], opening_totals: [opening] },
      });

      const { result } = renderHook(() => useGrowthStats(STATS_RANGES.today.value));

      expect(result.current.mrrChartData.map(({ date, mrr }) => ({ date, mrr }))).toEqual([
        { date: '2024-06-27', mrr: 10000 },
        { date: '2024-06-28', mrr: 11000 },
      ]);
      expect(result.current.chartData.map(({ date, free }) => ({ date, free }))).toEqual([
        { date: '2024-06-26', free: member.free },
        { date: '2024-06-27', free: member.free },
      ]);
    });
  });

  describe('currency symbol handling', () => {
    it('gets currency symbol correctly', async () => {
      mockedGetSymbol.mockReturnValue('€');

      mockSuccess(mockedUseMrrHistory, {
        stats: [{ date: '2024-06-27', mrr: 5000, currency: 'eur' }],
        meta: {
          totals: [{ mrr: 5000, currency: 'eur' }],
        },
      });

      const { result } = renderHook(() => useGrowthStats(30));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currencySymbol).toBe('€');
      expect(result.current.selectedCurrency).toBe('eur');
    });

    it('defaults to $ for usd currency', async () => {
      const { result } = renderHook(() => useGrowthStats(30));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currencySymbol).toBe('$');
      expect(result.current.selectedCurrency).toBe('usd');
    });
  });

  describe('chart data formatting', () => {
    it('formats chart data correctly', async () => {
      const { result } = renderHook(() => useGrowthStats(30));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.chartData).toBeDefined();
      expect(result.current.chartData.length).toBeGreaterThan(0);

      const firstPoint = result.current.chartData[0];
      expect(firstPoint).toHaveProperty('date');
      expect(firstPoint).toHaveProperty('value');
      expect(firstPoint).toHaveProperty('free');
      expect(firstPoint).toHaveProperty('paid');
      expect(firstPoint).toHaveProperty('comped');
      expect(firstPoint).toHaveProperty('gift');
      expect(firstPoint).toHaveProperty('mrr');
      expect(firstPoint).toHaveProperty('formattedValue');
    });

    it('handles missing MRR data in chart formatting', async () => {
      mockSuccess(mockedUseMrrHistory, {
        stats: [],
        meta: { totals: [] },
      });

      const { result } = renderHook(() => useGrowthStats(30));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.chartData).toBeDefined();
      const firstPoint = result.current.chartData[0];
      expect(firstPoint.mrr).toBe(0);
    });
  });

  describe('error handling', () => {
    it('handles API errors gracefully', async () => {
      mockNull(mockedUseMemberCountHistory);

      const { result } = renderHook(() => useGrowthStats(30));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should handle null data gracefully - may still have MRR data from other mock
      expect(result.current.chartData).toBeDefined();
    });

    it('handles malformed subscription data', async () => {
      mockNull(mockedUseSubscriptionStats);

      const { result } = renderHook(() => useGrowthStats(30));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.subscriptionData).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('handles empty MRR data', async () => {
      mockSuccess(mockedUseMrrHistory, {
        stats: [],
        meta: { totals: [] },
      });

      const { result } = renderHook(() => useGrowthStats(30));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.mrrData).toEqual([]);
      expect(result.current.selectedCurrency).toBe('usd');
    });

    it('handles missing MRR meta totals', async () => {
      mockSuccess(mockedUseMrrHistory, {
        stats: mockMrrData,
        meta: { totals: [] },
      });

      const { result } = renderHook(() => useGrowthStats(30));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.mrrData).toEqual([]);
      expect(result.current.selectedCurrency).toBe('usd');
    });

    it('correctly processes totals with memberCountTotals', async () => {
      const { result } = renderHook(() => useGrowthStats(30));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should use meta totals when available
      expect(result.current.totals.totalMembers).toBe(178);
      expect(result.current.totals.freeMembers).toBe(110);
      expect(result.current.totals.paidMembers).toBe(68);
    });
  });

  describe('range handling', () => {
    it('handles year to date range (-1)', async () => {
      const { result } = renderHook(() => useGrowthStats(-1));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.dateFrom).toBeDefined();
      expect(result.current.endDate).toBeDefined();
    });

    it('handles custom ranges', async () => {
      const { result } = renderHook(() => useGrowthStats(90));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.dateFrom).toBeDefined();
      expect(result.current.endDate).toBeDefined();
    });
  });
});
