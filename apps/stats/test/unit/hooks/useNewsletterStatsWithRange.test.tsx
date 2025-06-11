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

const mockUseNewsletterStats = vi.mocked(await import('@tryghost/admin-x-framework/api/stats')).useNewsletterStats;
const mockUseSubscriberCount = vi.mocked(await import('@tryghost/admin-x-framework/api/stats')).useSubscriberCount;
const mockUseBrowseNewsletters = vi.mocked(await import('@tryghost/admin-x-framework/api/newsletters')).useBrowseNewsletters;

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
            isPending: false,
            isStale: false,
            refetch: vi.fn(),
            dataUpdatedAt: 0,
            errorUpdatedAt: 0,
            failureCount: 0,
            failureReason: null,
            fetchStatus: 'idle' as const,
            isRefetching: false,
            status: 'success' as const,
            suspense: vi.fn(),
            promise: Promise.resolve()
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
            isPending: false,
            isStale: false,
            refetch: vi.fn(),
            dataUpdatedAt: 0,
            errorUpdatedAt: 0,
            failureCount: 0,
            failureReason: null,
            fetchStatus: 'idle' as const,
            isRefetching: false,
            status: 'success' as const,
            suspense: vi.fn(),
            promise: Promise.resolve()
        } as any);

        mockUseBrowseNewsletters.mockReturnValue({
            data: {
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
            },
            isLoading: false,
            error: null,
            isError: false,
            isLoadingError: false,
            isRefetchError: false,
            isSuccess: true,
            isFetching: false,
            isPending: false,
            isStale: false,
            refetch: vi.fn(),
            dataUpdatedAt: 0,
            errorUpdatedAt: 0,
            failureCount: 0,
            failureReason: null,
            fetchStatus: 'idle' as const,
            isRefetching: false,
            status: 'success' as const,
            suspense: vi.fn(),
            promise: Promise.resolve()
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
                }
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
                }
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
                }
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
                }
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
                }
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
                }
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
                }
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
                }
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