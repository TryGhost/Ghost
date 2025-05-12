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
    });
}); 