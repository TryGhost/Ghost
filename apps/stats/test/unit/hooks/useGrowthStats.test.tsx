import moment from 'moment';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {mockLoading, mockNull, mockSuccess} from '@tryghost/admin-x-framework/test/hook-testing-utils';
import {renderHook, waitFor} from '@testing-library/react';
import {useGrowthStats} from '@src/hooks/useGrowthStats';

// Mock external dependencies
vi.mock('@tryghost/admin-x-framework/api/stats', () => ({
    useMemberCountHistory: vi.fn(),
    useMrrHistory: vi.fn(),
    useSubscriptionStats: vi.fn()
}));

vi.mock('@tryghost/admin-x-framework', () => ({
    getSymbol: vi.fn()
}));

vi.mock('@tryghost/shade', async () => {
    const actual = await vi.importActual('@tryghost/shade');
    return {
        ...actual,
        formatPercentage: vi.fn(),
        getRangeDates: vi.fn()
    };
});

import {formatPercentage, getRangeDates} from '@tryghost/shade';
import {getSymbol} from '@tryghost/admin-x-framework';
import {useMemberCountHistory, useMrrHistory, useSubscriptionStats} from '@tryghost/admin-x-framework/api/stats';

const mockedUseMemberCountHistory = useMemberCountHistory as ReturnType<typeof vi.fn>;
const mockedUseMrrHistory = useMrrHistory as ReturnType<typeof vi.fn>;
const mockedUseSubscriptionStats = useSubscriptionStats as ReturnType<typeof vi.fn>;
const mockedGetSymbol = getSymbol as ReturnType<typeof vi.fn>;
const mockedFormatPercentage = formatPercentage as ReturnType<typeof vi.fn>;
const mockedGetRangeDates = getRangeDates as ReturnType<typeof vi.fn>;

// Mock data for testing
const mockMemberData = [
    {date: '2024-06-25', free: 100, paid: 50, comped: 5, paid_subscribed: 5, paid_canceled: 2},
    {date: '2024-06-26', free: 105, paid: 52, comped: 5, paid_subscribed: 3, paid_canceled: 1},
    {date: '2024-06-27', free: 110, paid: 55, comped: 5, paid_subscribed: 4, paid_canceled: 1}
];

const mockMrrData = [
    {date: '2024-06-25', mrr: 5000, currency: 'usd'},
    {date: '2024-06-26', mrr: 5200, currency: 'usd'},
    {date: '2024-06-27', mrr: 5500, currency: 'usd'}
];

const mockSubscriptionData = [
    {date: '2024-06-25', signups: 5, cancellations: 2},
    {date: '2024-06-26', signups: 3, cancellations: 1},
    {date: '2024-06-27', signups: 4, cancellations: 1}
];

describe('useGrowthStats', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        
        // Mock formatPercentage to return a consistent format
        mockedFormatPercentage.mockImplementation((value: number) => `${Math.abs(value * 100).toFixed(1)}%`);
        
        // Mock getRangeDates with realistic behavior
        mockedGetRangeDates.mockImplementation((range: number) => {
            const endDate = moment();
            const startDate = range === -1 ? moment().startOf('year') : moment().subtract(range - 1, 'days');
            return {startDate, endDate};
        });
        
        // Default successful responses
        mockSuccess(mockedUseMemberCountHistory, {
            stats: mockMemberData,
            meta: {
                totals: {paid: 55, free: 110, comped: 5}
            }
        });

        mockSuccess(mockedUseMrrHistory, {
            stats: mockMrrData,
            meta: {
                totals: [{mrr: 5500, currency: 'usd'}]
            }
        });

        mockSuccess(mockedUseSubscriptionStats, {
            stats: mockSubscriptionData
        });

        mockedGetSymbol.mockReturnValue('$');
    });

    describe('hook basic functionality', () => {
        it('returns initial loading state', () => {
            mockLoading(mockedUseMemberCountHistory);
            mockLoading(mockedUseMrrHistory);
            mockLoading(mockedUseSubscriptionStats);

            const {result} = renderHook(() => useGrowthStats(30));

            expect(result.current.isLoading).toBe(true);
        });

        it('returns data when loaded', async () => {
            const {result} = renderHook(() => useGrowthStats(30));

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.chartData).toBeDefined();
            expect(result.current.totals).toBeDefined();
            expect(result.current.currencySymbol).toBe('$');
            expect(result.current.subscriptionData).toBeDefined();
        });

        it('calculates correct totals', async () => {
            const {result} = renderHook(() => useGrowthStats(30));

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.totals.totalMembers).toBe(170); // 110 + 55 + 5
            expect(result.current.totals.freeMembers).toBe(110);
            expect(result.current.totals.paidMembers).toBe(60); // 55 + 5
            expect(result.current.totals.mrr).toBe(5500);
        });

        it('handles range=1 (Today) correctly', async () => {
            const {result} = renderHook(() => useGrowthStats(1));

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
                meta: {totals: {paid: 0, free: 0, comped: 0}}
            });

            const {result} = renderHook(() => useGrowthStats(30));

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.totals.totalMembers).toBe(0);
        });

        it('handles array response format', async () => {
            mockSuccess(mockedUseMemberCountHistory, 
                mockMemberData // Direct array instead of stats object
            );

            const {result} = renderHook(() => useGrowthStats(30));

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.chartData).toBeDefined();
        });

        it('handles multi-currency MRR data', async () => {
            const mockMultiCurrencyMrrData = [
                {date: '2024-06-25', mrr: 5000, currency: 'usd'},
                {date: '2024-06-25', mrr: 1000, currency: 'eur'},
                {date: '2024-06-26', mrr: 5200, currency: 'usd'},
                {date: '2024-06-26', mrr: 1100, currency: 'eur'},
                {date: '2024-06-27', mrr: 5500, currency: 'usd'},
                {date: '2024-06-27', mrr: 1200, currency: 'eur'}
            ];

            mockSuccess(mockedUseMrrHistory, {
                stats: mockMultiCurrencyMrrData,
                meta: {
                    totals: [
                        {mrr: 5500, currency: 'usd'},
                        {mrr: 1200, currency: 'eur'}
                    ]
                }
            });

            const {result} = renderHook(() => useGrowthStats(30));

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
                {date: today, signups: 3, cancellations: 1},
                {date: today, signups: 2, cancellations: 1}, // Same date
                {date: yesterday, signups: 4, cancellations: 2}
            ];

            mockSuccess(mockedUseSubscriptionStats, {
                stats: duplicateSubscriptionData
            });

            const {result} = renderHook(() => useGrowthStats(30));

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            const mergedData = result.current.subscriptionData;
            const todayData = mergedData.find(item => item.date === today);
            expect(todayData?.signups).toBe(5); // 3 + 2
            expect(todayData?.cancellations).toBe(2); // 1 + 1
        });

        it('filters subscription data by date range', async () => {
            // Use realistic date ranges relative to today
            const today = moment().format('YYYY-MM-DD');
            const yesterday = moment().subtract(1, 'day').format('YYYY-MM-DD');
            const lastWeek = moment().subtract(8, 'days').format('YYYY-MM-DD'); // Out of 7-day range
            
            const outOfRangeData = [
                {date: lastWeek, signups: 5, cancellations: 2}, // Out of range
                {date: yesterday, signups: 3, cancellations: 1}, // In range
                {date: today, signups: 4, cancellations: 2} // In range
            ];

            mockSuccess(mockedUseSubscriptionStats, {
                stats: outOfRangeData
            });

            const {result} = renderHook(() => useGrowthStats(7));

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            // Should only include data within range
            expect(result.current.subscriptionData).toHaveLength(2);
            expect(result.current.subscriptionData.every(item => item.date >= yesterday)).toBe(true);
        });
    });

    describe('MRR data processing', () => {
        it('adds start point when missing', async () => {
            const earlierMrrData = [
                {date: '2024-06-20', mrr: 5000, currency: 'usd'},
                {date: '2024-06-27', mrr: 5500, currency: 'usd'}
            ];

            mockSuccess(mockedUseMrrHistory, {
                stats: earlierMrrData,
                meta: {
                    totals: [{mrr: 5500, currency: 'usd'}]
                }
            });

            const {result} = renderHook(() => useGrowthStats(7));

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            // Should add synthetic start point
            expect(result.current.mrrData.length).toBeGreaterThan(1);
        });

        it('handles range=1 correctly', async () => {
            const {result} = renderHook(() => useGrowthStats(1));

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            // For range=1, should use appropriate date logic
            expect(result.current.mrrData).toBeDefined();
        });
    });

    describe('currency symbol handling', () => {
        it('gets currency symbol correctly', async () => {
            mockedGetSymbol.mockReturnValue('€');
            
            mockSuccess(mockedUseMrrHistory, {
                stats: [{date: '2024-06-27', mrr: 5000, currency: 'eur'}],
                meta: {
                    totals: [{mrr: 5000, currency: 'eur'}]
                }
            });

            const {result} = renderHook(() => useGrowthStats(30));

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.currencySymbol).toBe('€');
            expect(result.current.selectedCurrency).toBe('eur');
        });

        it('defaults to $ for usd currency', async () => {
            const {result} = renderHook(() => useGrowthStats(30));

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.currencySymbol).toBe('$');
            expect(result.current.selectedCurrency).toBe('usd');
        });
    });

    describe('chart data formatting', () => {
        it('formats chart data correctly', async () => {
            const {result} = renderHook(() => useGrowthStats(30));

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
            expect(firstPoint).toHaveProperty('mrr');
            expect(firstPoint).toHaveProperty('formattedValue');
        });

        it('handles missing MRR data in chart formatting', async () => {
            mockSuccess(mockedUseMrrHistory, {
                stats: [],
                meta: {totals: []}
            });

            const {result} = renderHook(() => useGrowthStats(30));

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

            const {result} = renderHook(() => useGrowthStats(30));

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            // Should handle null data gracefully - may still have MRR data from other mock
            expect(result.current.chartData).toBeDefined();
        });

        it('handles malformed subscription data', async () => {
            mockNull(mockedUseSubscriptionStats);

            const {result} = renderHook(() => useGrowthStats(30));

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
                meta: {totals: []}
            });

            const {result} = renderHook(() => useGrowthStats(30));

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.mrrData).toEqual([]);
            expect(result.current.selectedCurrency).toBe('usd');
        });

        it('handles missing MRR meta totals', async () => {
            mockSuccess(mockedUseMrrHistory, {
                stats: mockMrrData,
                meta: {totals: []}
            });

            const {result} = renderHook(() => useGrowthStats(30));

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.mrrData).toEqual([]);
            expect(result.current.selectedCurrency).toBe('usd');
        });

        it('correctly processes totals with memberCountTotals', async () => {
            const {result} = renderHook(() => useGrowthStats(30));

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            // Should use meta totals when available
            expect(result.current.totals.totalMembers).toBe(170);
            expect(result.current.totals.freeMembers).toBe(110);
            expect(result.current.totals.paidMembers).toBe(60);
        });
    });

    describe('range handling', () => {
        it('handles year to date range (-1)', async () => {
            const {result} = renderHook(() => useGrowthStats(-1));

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.dateFrom).toBeDefined();
            expect(result.current.endDate).toBeDefined();
        });

        it('handles custom ranges', async () => {
            const {result} = renderHook(() => useGrowthStats(90));

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });

            expect(result.current.dateFrom).toBeDefined();
            expect(result.current.endDate).toBeDefined();
        });
    });
});