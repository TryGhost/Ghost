import {type MockedFunction, vi} from 'vitest';

// Import React for renderHook
import {renderHook} from '@testing-library/react';

// Setup mocks with vi.mock calls to ensure proper hoisting
vi.mock('@tryghost/admin-x-framework/api/stats', () => ({
    useNewsletterStats: vi.fn().mockReturnValue({isLoading: false, data: []}),
    useSubscriberCount: vi.fn().mockReturnValue({isLoading: false, data: []}),
    useMemberCountHistory: vi.fn().mockReturnValue({
        isLoading: false,
        data: {
            stats: [],
            meta: {
                totals: { paid: 0, free: 0, comped: 0 },
                pagination: { page: 1, pages: 1, total: 0, limit: 15, next: null, prev: null }
            }
        }
    }),
    useMrrHistory: vi.fn().mockReturnValue({
        isLoading: false,
        data: {
            stats: [],
            meta: {
                pagination: { page: 1, pages: 1, total: 0, limit: 15, next: null, prev: null }
            }
        }
    }),
    useTopPostsStats: vi.fn().mockReturnValue({isLoading: false, data: []})
}));

// Setup React mock preserving all original exports
vi.mock('react', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useMemo: <T>(fn: () => T) => fn()
    };
});

// Now import the actual modules being tested
import {getRangeDates, useGrowthStats} from '../../../src/hooks/useGrowthStats';
import {useMemberCountHistory, useMrrHistory} from '@tryghost/admin-x-framework/api/stats';

describe('Growth Stats', function () {
    describe('getRangeDates', function () {
        beforeEach(function () {
            // Mock Date.now to return a fixed date for consistent testing
            vi.spyOn(Date, 'now').mockImplementation(() => new Date('2023-01-30T12:00:00Z').getTime());
        });

        afterEach(function () {
            vi.restoreAllMocks();
        });

        it('returns correct dates for 7 day range', function () {
            const result = getRangeDates(7);
            
            // Expect dates 7 days apart - update to match actual implementation
            expect(result.dateFrom).toBe('2023-01-24');
            expect(result.endDate).toBe('2023-01-30');
        });

        it('returns correct dates for 30 day range', function () {
            const result = getRangeDates(30);
            
            // Expect dates 30 days apart - update to match actual implementation
            expect(result.dateFrom).toBe('2023-01-01');
            expect(result.endDate).toBe('2023-01-30');
        });

        it('returns correct dates for 90 day range', function () {
            const result = getRangeDates(90);
            
            // Expect dates 90 days apart - update to match actual implementation
            expect(result.dateFrom).toBe('2022-11-02');
            expect(result.endDate).toBe('2023-01-30');
        });

        it('returns correct dates for custom range', function () {
            const result = getRangeDates(14);
            
            // Expect dates 14 days apart - update to match actual implementation
            expect(result.dateFrom).toBe('2023-01-17');
            expect(result.endDate).toBe('2023-01-30');
        });
    });

    describe('useGrowthStats', function () {
        // Mock the hook return values
        const mockUseMemberCountHistory = useMemberCountHistory as MockedFunction<typeof useMemberCountHistory>;
        const mockUseMrrHistory = useMrrHistory as MockedFunction<typeof useMrrHistory>;
        
        beforeEach(function () {
            vi.resetAllMocks();
            vi.spyOn(Date, 'now').mockImplementation(() => new Date('2023-01-30T12:00:00Z').getTime());
            
            // Default mock implementations
            mockUseMemberCountHistory.mockReturnValue({
                isLoading: false,
                error: null,
                isError: false,
                isLoadingError: false,
                isRefetchError: false,
                isSuccess: true,
                data: {
                    stats: [],
                    meta: {
                        totals: { paid: 0, free: 0, comped: 0 },
                        pagination: { page: 1, pages: 1, total: 0, limit: 15, next: null, prev: null }
                    }
                },
                status: 'success',
                fetchStatus: 'idle',
                isFetched: true,
                isFetching: false,
                isPaused: false,
                refetch: vi.fn()
            });
            
            mockUseMrrHistory.mockReturnValue({
                isLoading: false,
                error: null,
                isError: false,
                isLoadingError: false,
                isRefetchError: false,
                isSuccess: true,
                data: {
                    stats: [],
                    meta: {
                        pagination: { page: 1, pages: 1, total: 0, limit: 15, next: null, prev: null }
                    }
                },
                status: 'success',
                fetchStatus: 'idle',
                isFetched: true,
                isFetching: false,
                isPaused: false,
                refetch: vi.fn()
            });
        });

        afterEach(function () {
            vi.restoreAllMocks();
        });

        it('calls useMemberCountHistory with correct parameters for default range', function () {
            renderHook(() => useGrowthStats(30));
            
            expect(mockUseMemberCountHistory).toHaveBeenCalledWith({
                searchParams: {
                    date_from: '2023-01-01'
                }
            });
        });

        it('calls useMemberCountHistory with correct parameters for custom range', function () {
            renderHook(() => useGrowthStats(7));
            
            expect(mockUseMemberCountHistory).toHaveBeenCalledWith({
                searchParams: {
                    date_from: '2023-01-24'
                }
            });
        });

        it('handles loading state correctly', function () {
            // Mock loading state
            mockUseMemberCountHistory.mockReturnValue({
                isLoading: true,
                error: null,
                isError: false,
                isLoadingError: false,
                isRefetchError: false,
                isSuccess: false,
                data: undefined,
                status: 'loading',
                fetchStatus: 'fetching',
                isFetched: false,
                isFetching: true,
                isPaused: false,
                refetch: vi.fn()
            });
            
            const {result} = renderHook(() => useGrowthStats(30));
            
            expect(result.current.isLoading).toBe(true);
        });

        it('transforms data correctly when available', function () {
            // Setup mocks with sample data
            mockUseMemberCountHistory.mockReturnValue({
                isLoading: false,
                error: null,
                isError: false,
                isLoadingError: false,
                isRefetchError: false,
                isSuccess: true,
                data: {
                    stats: [
                        {date: '2023-01-29', free: 10, paid: 5, comped: 2, paid_subscribed: 4, paid_canceled: 1},
                        {date: '2023-01-30', free: 12, paid: 6, comped: 2, paid_subscribed: 5, paid_canceled: 1}
                    ],
                    meta: {
                        totals: { paid: 6, free: 12, comped: 2 },
                        pagination: { page: 1, pages: 1, total: 2, limit: 15, next: null, prev: null }
                    }
                },
                status: 'success',
                fetchStatus: 'idle',
                isFetched: true,
                isFetching: false,
                isPaused: false,
                refetch: vi.fn()
            });
            
            const {result} = renderHook(() => useGrowthStats(30));
            
            // Expect data to be transformed with totals
            expect(result.current.isLoading).toBe(false);
            expect(result.current.memberData.length).toBe(2);
            
            // Check the total members calculation
            const latestData = result.current.totals;
            expect(latestData.totalMembers).toBe(20); // 12 + 6 + 2
        });

        it('transforms different response formats correctly', function () {
            // Test array response format
            mockUseMemberCountHistory.mockReturnValue({
                isLoading: false,
                data: [
                    {date: '2023-01-29', free: 10, paid: 5, comped: 2},
                    {date: '2023-01-30', free: 12, paid: 6, comped: 2}
                ]
            });
            
            const {result: arrayResult} = renderHook(() => useGrowthStats(30));
            expect(arrayResult.current.memberData.length).toBe(2);
            
            // Reset to test stats object format
            mockUseMemberCountHistory.mockReturnValue({
                isLoading: false,
                data: {
                    stats: [
                        {date: '2023-01-29', free: 10, paid: 5, comped: 2},
                        {date: '2023-01-30', free: 12, paid: 6, comped: 2}
                    ]
                }
            });
            
            const {result: objectResult} = renderHook(() => useGrowthStats(30));
            expect(objectResult.current.memberData.length).toBe(2);
        });
        
        it('filters MRR data by date range', function () {
            // Setup data that spans beyond our date range
            const mrrData = [
                {date: '2022-12-15', mrr: 500},
                {date: '2022-12-30', mrr: 550},
                {date: '2023-01-15', mrr: 600}, // Should be included
                {date: '2023-01-30', mrr: 650}  // Should be included
            ];
            
            mockUseMrrHistory.mockReturnValue({
                isLoading: false,
                data: {
                    stats: mrrData
                }
            });
            
            // Request data for January 2023
            const {result} = renderHook(() => useGrowthStats(30)); // Will use our mocked date of 2023-01-30
            
            // Should only include MRR data points from January onwards
            expect(result.current.mrrData.length).toBe(2);
            expect(result.current.mrrData[0].date).toBe('2023-01-15');
            expect(result.current.mrrData[1].date).toBe('2023-01-30');
        });
        
        it('calculates percentage changes when data is available', function () {
            // Setup data with two data points to calculate percentage changes
            mockUseMemberCountHistory.mockReturnValue({
                isLoading: false,
                data: {
                    stats: [
                        {date: '2023-01-01', free: 100, paid: 50, comped: 10},
                        {date: '2023-01-30', free: 120, paid: 40, comped: 10}
                    ]
                }
            });
            
            mockUseMrrHistory.mockReturnValue({
                isLoading: false,
                data: {
                    stats: [
                        {date: '2023-01-01', mrr: 5000},
                        {date: '2023-01-30', mrr: 6000}
                    ]
                }
            });
            
            const {result} = renderHook(() => useGrowthStats(30));
            
            // Verify totals and percentage calculations
            expect(result.current.totals.totalMembers).toBe(170); // 120 + 40 + 10
            
            // Free members increased from 100 to 120, a 20% increase
            expect(result.current.totals.percentChanges.free).toBe('20.0%');
            expect(result.current.totals.directions.free).toBe('up');
            
            // Paid members decreased from 50 to 40, a 20% decrease
            expect(result.current.totals.percentChanges.paid).toBe('20.0%');
            expect(result.current.totals.directions.paid).toBe('down');
            
            // Total members increased from 160 to 170, a 6.3% increase
            expect(result.current.totals.percentChanges.total).toBe('6.3%');
            expect(result.current.totals.directions.total).toBe('up');
            
            // MRR increased from 5000 to 6000, a 20% increase
            expect(result.current.totals.percentChanges.mrr).toBe('20.0%');
            expect(result.current.totals.directions.mrr).toBe('up');
        });
        
        it('handles chart data formatting with missing dates', function () {
            // Create data with gaps to test interpolation
            mockUseMemberCountHistory.mockReturnValue({
                isLoading: false,
                data: {
                    stats: [
                        {date: '2023-01-01', free: 100, paid: 50, comped: 10},
                        // Gap here
                        {date: '2023-01-15', free: 110, paid: 55, comped: 10},
                        // Gap here
                        {date: '2023-01-30', free: 120, paid: 60, comped: 10}
                    ]
                }
            });
            
            mockUseMrrHistory.mockReturnValue({
                isLoading: false,
                data: {
                    stats: [
                        // Different dates than member data
                        {date: '2023-01-05', mrr: 5000},
                        {date: '2023-01-20', mrr: 5500},
                        {date: '2023-01-25', mrr: 6000}
                    ]
                }
            });
            
            const {result} = renderHook(() => useGrowthStats(30));
            
            // Should combine all dates from both datasets
            const expectedDates = [
                '2023-01-01', '2023-01-05', '2023-01-15', 
                '2023-01-20', '2023-01-25', '2023-01-30'
            ];
            
            // Verify chart data contains all dates
            expect(result.current.chartData.length).toBe(expectedDates.length);
            result.current.chartData.forEach((item, index) => {
                expect(item.date).toBe(expectedDates[index]);
            });
            
            // Verify first item has correct data from members but no MRR
            expect(result.current.chartData[0].value).toBe(160); // 100 + 50 + 10
            expect(result.current.chartData[0].free).toBe(100);
            expect(result.current.chartData[0].paid).toBe(50);
            expect(result.current.chartData[0].mrr).toBe(0); // No MRR data on this date
            
            // Verify middle item has carried forward member data and new MRR data
            expect(result.current.chartData[2].value).toBe(175); // 110 + 55 + 10
            expect(result.current.chartData[2].free).toBe(110);
            expect(result.current.chartData[2].mrr).toBe(5000); // Carried from Jan 5
            
            // Verify last item has all data
            expect(result.current.chartData[5].value).toBe(190); // 120 + 60 + 10
            expect(result.current.chartData[5].free).toBe(120);
            expect(result.current.chartData[5].paid).toBe(60);
            expect(result.current.chartData[5].mrr).toBe(6000); // From Jan 25
        });

        it('handles different response formats and transformations', function () {
            // Mock member data in array format
            mockUseMemberCountHistory.mockReturnValue({
                isLoading: false,
                data: [
                    {date: '2023-01-01', free: 100, paid: 50, comped: 10, paid_subscribed: 0, paid_canceled: 0},
                    {date: '2023-01-30', free: 120, paid: 40, comped: 10, paid_subscribed: 0, paid_canceled: 0}
                ]
            });
            
            // Mock MRR data
            mockUseMrrHistory.mockReturnValue({
                isLoading: false,
                data: {
                    stats: [
                        {date: '2023-01-01', mrr: 5000, currency: 'USD'},
                        {date: '2023-01-30', mrr: 6000, currency: 'USD'}
                    ]
                }
            });
            
            const {result} = renderHook(() => useGrowthStats(30));
            
            // Verify data transformations
            expect(result.current.memberData.length).toBe(2);
            expect(result.current.mrrData.length).toBe(2);
            
            // Verify totals calculation
            expect(result.current.totals.totalMembers).toBe(170); // 120 + 40 + 10
            expect(result.current.totals.freeMembers).toBe(120);
            expect(result.current.totals.paidMembers).toBe(40);
            expect(result.current.totals.mrr).toBe(6000);
            
            // Verify chart data formatting
            expect(result.current.chartData.length).toBe(2);
            expect(result.current.chartData[0].date).toBe('2023-01-01');
            expect(result.current.chartData[0].value).toBe(160); // 100 + 50 + 10
            expect(result.current.chartData[0].mrr).toBe(5000);
            
            expect(result.current.chartData[1].date).toBe('2023-01-30');
            expect(result.current.chartData[1].value).toBe(170); // 120 + 40 + 10
            expect(result.current.chartData[1].mrr).toBe(6000);
        });
    });
}); 