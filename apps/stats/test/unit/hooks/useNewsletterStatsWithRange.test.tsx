import {beforeEach, describe, expect, it, vi} from 'vitest';
import {createTestWrapper, setupStatsAppMocks} from '../../utils/test-helpers';
import {renderHook} from '@testing-library/react';
import {useNewsletterStatsWithRange, useNewslettersList, useSubscriberCountWithRange} from '@src/hooks/useNewsletterStatsWithRange';

// Mock the getRangeDates function
vi.mock('@src/hooks/useGrowthStats', () => ({
    getRangeDates: vi.fn((range: number) => ({
        dateFrom: `2024-01-${String(31 - range).padStart(2, '0')}`,
        endDate: '2024-01-31'
    }))
}));

// Mock the API hooks
vi.mock('@tryghost/admin-x-framework/api/stats');
vi.mock('@tryghost/admin-x-framework/api/newsletters');
vi.mock('@src/providers/GlobalDataProvider');

const {useNewsletterStats, useSubscriberCount} = await import('@tryghost/admin-x-framework/api/stats');
const {useBrowseNewsletters} = await import('@tryghost/admin-x-framework/api/newsletters');

const mockUseNewsletterStats = vi.mocked(useNewsletterStats);
const mockUseSubscriberCount = vi.mocked(useSubscriberCount);
const mockUseBrowseNewsletters = vi.mocked(useBrowseNewsletters);

describe('Newsletter Stats Hooks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        setupStatsAppMocks();
        
        // Apply the mocks to the actual imported modules with default return values
        mockUseNewsletterStats.mockReturnValue({
            data: {
                stats: [], 
                meta: {
                    pagination: {
                        page: 1,
                        limit: 15,
                        pages: 1,
                        total: 0,
                        next: null,
                        prev: null
                    }
                }
            },
            isLoading: false,
            error: null,
            isError: false,
            isLoadingError: false,
            isRefetchError: false,
            isSuccess: true,
            isFetching: false,
            isStale: false,
            refetch: vi.fn(),
            dataUpdatedAt: 0,
            errorUpdatedAt: 0,
            failureCount: 0,
            failureReason: null,
            fetchStatus: 'idle' as const,
            isRefetching: false,
            status: 'success' as const
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
        
        mockUseSubscriberCount.mockReturnValue({
            data: {stats: []},
            isLoading: false,
            error: null,
            isError: false,
            isLoadingError: false,
            isRefetchError: false,
            isSuccess: true,
            isFetching: false,
            isStale: false,
            refetch: vi.fn(),
            dataUpdatedAt: 0,
            errorUpdatedAt: 0,
            failureCount: 0,
            failureReason: null,
            fetchStatus: 'idle' as const,
            isRefetching: false,
            status: 'success' as const
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

        mockUseBrowseNewsletters.mockReturnValue({
            data: {
                pages: [{
                    newsletters: [], 
                    isEnd: true,
                    meta: {
                        pagination: {
                            page: 1,
                            limit: 50,
                            pages: 1,
                            total: 0,
                            next: null,
                            prev: null
                        }
                    }
                }],
                pageParams: []
            },
            isLoading: false,
            error: null,
            isError: false,
            isLoadingError: false,
            isRefetchError: false,
            isSuccess: true,
            isFetching: false,
            isStale: false,
            refetch: vi.fn(),
            dataUpdatedAt: 0,
            errorUpdatedAt: 0,
            failureCount: 0,
            failureReason: null,
            fetchStatus: 'idle' as const,
            isRefetching: false,
            status: 'success' as const,
            fetchNextPage: vi.fn(),
            fetchPreviousPage: vi.fn(),
            hasNextPage: false,
            hasPreviousPage: false,
            isFetchingNextPage: false,
            isFetchingPreviousPage: false
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
    });

    describe('useNewsletterStatsWithRange', () => {
        it('uses default range of 30 days when no range provided', () => {
            const wrapper = createTestWrapper();
            const {result} = renderHook(() => useNewsletterStatsWithRange(), {wrapper});
            
            // The hook should be called with default parameters
            expect(result.current).toBeDefined();
            expect(mockUseNewsletterStats).toHaveBeenCalledWith({
                searchParams: {
                    date_from: '2024-01-01',
                    date_to: '2024-01-31',
                    order: 'date desc'
                },
                enabled: true
            });
        });

        it('uses default order of "date desc" when no order provided', () => {
            const wrapper = createTestWrapper();
            const {result} = renderHook(() => useNewsletterStatsWithRange(7), {wrapper});
            
            expect(result.current).toBeDefined();
            expect(mockUseNewsletterStats).toHaveBeenCalledWith({
                searchParams: {
                    date_from: '2024-01-24',
                    date_to: '2024-01-31',
                    order: 'date desc'
                },
                enabled: true
            });
        });

        it('accepts custom range parameter', () => {
            const wrapper = createTestWrapper();
            const {result} = renderHook(() => useNewsletterStatsWithRange(14), {wrapper});
            
            expect(result.current).toBeDefined();
            expect(mockUseNewsletterStats).toHaveBeenCalledWith({
                searchParams: {
                    date_from: '2024-01-17',
                    date_to: '2024-01-31',
                    order: 'date desc'
                },
                enabled: true
            });
        });

        it('accepts custom order parameter', () => {
            const wrapper = createTestWrapper();
            const {result} = renderHook(() => useNewsletterStatsWithRange(30, 'open_rate desc'), {wrapper});
            
            expect(result.current).toBeDefined();
            expect(mockUseNewsletterStats).toHaveBeenCalledWith({
                searchParams: {
                    date_from: '2024-01-01',
                    date_to: '2024-01-31',
                    order: 'open_rate desc'
                },
                enabled: true
            });
        });

        it('accepts newsletter ID parameter', () => {
            const wrapper = createTestWrapper();
            const {result} = renderHook(() => useNewsletterStatsWithRange(30, 'date desc', 'newsletter-123'), {wrapper});
            
            expect(result.current).toBeDefined();
            expect(mockUseNewsletterStats).toHaveBeenCalledWith({
                searchParams: {
                    date_from: '2024-01-01',
                    date_to: '2024-01-31',
                    order: 'date desc',
                    newsletter_id: 'newsletter-123'
                },
                enabled: true
            });
        });
    });

    describe('useSubscriberCountWithRange', () => {
        it('uses default range of 30 days when no range provided', () => {
            const wrapper = createTestWrapper();
            const {result} = renderHook(() => useSubscriberCountWithRange(), {wrapper});
            
            expect(result.current).toBeDefined();
            expect(mockUseSubscriberCount).toHaveBeenCalledWith({
                searchParams: {
                    date_from: '2024-01-01',
                    date_to: '2024-01-31'
                },
                enabled: true
            });
        });

        it('accepts custom range parameter', () => {
            const wrapper = createTestWrapper();
            const {result} = renderHook(() => useSubscriberCountWithRange(7), {wrapper});
            
            expect(result.current).toBeDefined();
            expect(mockUseSubscriberCount).toHaveBeenCalledWith({
                searchParams: {
                    date_from: '2024-01-24',
                    date_to: '2024-01-31'
                },
                enabled: true
            });
        });

        it('accepts newsletter ID parameter', () => {
            const wrapper = createTestWrapper();
            const {result} = renderHook(() => useSubscriberCountWithRange(30, 'newsletter-123'), {wrapper});
            
            expect(result.current).toBeDefined();
            expect(mockUseSubscriberCount).toHaveBeenCalledWith({
                searchParams: {
                    date_from: '2024-01-01',
                    date_to: '2024-01-31',
                    newsletter_id: 'newsletter-123'
                },
                enabled: true
            });
        });
    });

    describe('useNewslettersList', () => {
        it('calls useBrowseNewsletters', () => {
            const wrapper = createTestWrapper();
            const {result} = renderHook(() => useNewslettersList(), {wrapper});
            
            expect(result.current).toBeDefined();
            expect(mockUseBrowseNewsletters).toHaveBeenCalledWith();
        });
    });
}); 