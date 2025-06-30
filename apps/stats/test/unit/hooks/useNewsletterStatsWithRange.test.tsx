import {TestWrapper} from '@tryghost/admin-x-framework/test/test-utils';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {getExpectedDateRange, setupDateMocking, setupStatsAppMocks} from '../../utils/test-helpers';
import {mockApiHook, mockDataFactories, mockSuccess} from '@tryghost/admin-x-framework/test/hook-testing-utils';
import {renderHook} from '@testing-library/react';
import {
    useNewsletterBasicStatsWithRange, 
    useNewsletterClickStatsWithRange, 
    useNewsletterStatsWithRange,
    useNewsletterStatsWithRangeSplit,
    useNewslettersList,
    useSubscriberCountWithRange
} from '@src/hooks/useNewsletterStatsWithRange';

// Mock the API hooks
vi.mock('@tryghost/admin-x-framework/api/stats');
vi.mock('@tryghost/admin-x-framework/api/newsletters');
vi.mock('@src/providers/GlobalDataProvider');

const {useNewsletterStats, useSubscriberCount, useNewsletterBasicStats, useNewsletterClickStats} = await import('@tryghost/admin-x-framework/api/stats');
const {useBrowseNewsletters} = await import('@tryghost/admin-x-framework/api/newsletters');

const mockUseNewsletterStats = vi.mocked(useNewsletterStats);
const mockUseSubscriberCount = vi.mocked(useSubscriberCount);
const mockUseNewsletterBasicStats = vi.mocked(useNewsletterBasicStats);
const mockUseNewsletterClickStats = vi.mocked(useNewsletterClickStats);
const mockUseBrowseNewsletters = vi.mocked(useBrowseNewsletters);

// Mock external date functions
vi.mock('@tryghost/shade', () => ({
    formatQueryDate: vi.fn(),
    getRangeDates: vi.fn()
}));

const {formatQueryDate, getRangeDates} = await import('@tryghost/shade');
const mockFormatQueryDate = vi.mocked(formatQueryDate);
const mockGetRangeDates = vi.mocked(getRangeDates);

describe('Newsletter Stats Hooks', () => {
    let dateMocking: ReturnType<typeof setupDateMocking>;

    beforeEach(() => {
        vi.clearAllMocks();
        setupStatsAppMocks();
        
        // Setup consistent date mocking
        dateMocking = setupDateMocking();
        
        // Mock the date functions with consistent behavior
        mockGetRangeDates.mockImplementation((range: number) => {
            const {expectedDateFrom, expectedDateTo} = getExpectedDateRange(range);
            return {
                startDate: new Date(expectedDateFrom + 'T00:00:00.000Z'),
                endDate: new Date(expectedDateTo + 'T23:59:59.999Z'),
                timezone: 'UTC'
            };
        });
        
        mockFormatQueryDate.mockImplementation((date: Date) => date.toISOString().split('T')[0]);
        
        // Apply the mocks to the actual imported modules with default return values
        mockSuccess(mockUseNewsletterStats, mockDataFactories.statsResponse([]));
        
        mockSuccess(mockUseSubscriberCount, {stats: []});

        mockSuccess(mockUseNewsletterBasicStats, mockDataFactories.statsResponse([]));

        mockSuccess(mockUseNewsletterClickStats, {stats: []});

        const newsletterPagesData = {
            pages: [{
                newsletters: [], 
                isEnd: true,
                meta: mockDataFactories.apiResponse({}, {
                    pagination: mockDataFactories.pagination({
                        limit: 50,
                        total: 0
                    })
                }).meta
            }],
            pageParams: []
        };
        mockUseBrowseNewsletters.mockReturnValue({
            ...mockApiHook(mockUseBrowseNewsletters, newsletterPagesData),
            fetchNextPage: vi.fn(),
            fetchPreviousPage: vi.fn(),
            hasNextPage: false,
            hasPreviousPage: false,
            isFetchingNextPage: false,
            isFetchingPreviousPage: false
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
    });

    afterEach(function () {
        dateMocking.cleanup();
    });

    describe('useNewsletterStatsWithRange', () => {
        it('uses default range of 30 days when no range provided', () => {
            const wrapper = TestWrapper;
            const {result} = renderHook(() => useNewsletterStatsWithRange(), {wrapper});
            
            // Calculate expected dates dynamically
            const expectedDateRange = getExpectedDateRange(30);
            
            // The hook should be called with default parameters
            expect(result.current).toBeDefined();
            expect(mockUseNewsletterStats).toHaveBeenCalledWith({
                searchParams: {
                    date_from: expectedDateRange.expectedDateFrom,
                    date_to: expectedDateRange.expectedDateTo,
                    order: 'date desc'
                },
                enabled: true
            });
        });

        it('uses default order of "date desc" when no order provided', () => {
            const wrapper = TestWrapper;
            const {result} = renderHook(() => useNewsletterStatsWithRange(7), {wrapper});
            
            // Calculate expected dates dynamically
            const expectedDateRange = getExpectedDateRange(7);
            
            expect(result.current).toBeDefined();
            expect(mockUseNewsletterStats).toHaveBeenCalledWith({
                searchParams: {
                    date_from: expectedDateRange.expectedDateFrom,
                    date_to: expectedDateRange.expectedDateTo,
                    order: 'date desc'
                },
                enabled: true
            });
        });

        it('accepts custom range parameter', () => {
            const wrapper = TestWrapper;
            const {result} = renderHook(() => useNewsletterStatsWithRange(14), {wrapper});
            
            // Calculate expected dates dynamically
            const expectedDateRange = getExpectedDateRange(14);
            
            expect(result.current).toBeDefined();
            expect(mockUseNewsletterStats).toHaveBeenCalledWith({
                searchParams: {
                    date_from: expectedDateRange.expectedDateFrom,
                    date_to: expectedDateRange.expectedDateTo,
                    order: 'date desc'
                },
                enabled: true
            });
        });

        it('accepts custom order parameter', () => {
            const wrapper = TestWrapper;
            const {result} = renderHook(() => useNewsletterStatsWithRange(30, 'open_rate desc'), {wrapper});
            
            // Calculate expected dates dynamically
            const expectedDateRange = getExpectedDateRange(30);
            
            expect(result.current).toBeDefined();
            expect(mockUseNewsletterStats).toHaveBeenCalledWith({
                searchParams: {
                    date_from: expectedDateRange.expectedDateFrom,
                    date_to: expectedDateRange.expectedDateTo,
                    order: 'open_rate desc'
                },
                enabled: true
            });
        });

        it('accepts newsletter ID parameter', () => {
            const wrapper = TestWrapper;
            const {result} = renderHook(() => useNewsletterStatsWithRange(30, 'date desc', 'newsletter-123'), {wrapper});
            
            // Calculate expected dates dynamically
            const expectedDateRange = getExpectedDateRange(30);
            
            expect(result.current).toBeDefined();
            expect(mockUseNewsletterStats).toHaveBeenCalledWith({
                searchParams: {
                    date_from: expectedDateRange.expectedDateFrom,
                    date_to: expectedDateRange.expectedDateTo,
                    order: 'date desc',
                    newsletter_id: 'newsletter-123'
                },
                enabled: true
            });
        });
    });

    describe('useSubscriberCountWithRange', () => {
        it('uses default range of 30 days when no range provided', () => {
            const wrapper = TestWrapper;
            const {result} = renderHook(() => useSubscriberCountWithRange(), {wrapper});
            
            // Calculate expected dates dynamically
            const expectedDateRange = getExpectedDateRange(30);
            
            expect(result.current).toBeDefined();
            expect(mockUseSubscriberCount).toHaveBeenCalledWith({
                searchParams: {
                    date_from: expectedDateRange.expectedDateFrom,
                    date_to: expectedDateRange.expectedDateTo
                },
                enabled: true
            });
        });

        it('accepts custom range parameter', () => {
            const wrapper = TestWrapper;
            const {result} = renderHook(() => useSubscriberCountWithRange(7), {wrapper});
            
            // Calculate expected dates dynamically
            const expectedDateRange = getExpectedDateRange(7);
            
            expect(result.current).toBeDefined();
            expect(mockUseSubscriberCount).toHaveBeenCalledWith({
                searchParams: {
                    date_from: expectedDateRange.expectedDateFrom,
                    date_to: expectedDateRange.expectedDateTo
                },
                enabled: true
            });
        });

        it('accepts newsletter ID parameter', () => {
            const wrapper = TestWrapper;
            const {result} = renderHook(() => useSubscriberCountWithRange(30, 'newsletter-123'), {wrapper});
            
            // Calculate expected dates dynamically
            const expectedDateRange = getExpectedDateRange(30);
            
            expect(result.current).toBeDefined();
            expect(mockUseSubscriberCount).toHaveBeenCalledWith({
                searchParams: {
                    date_from: expectedDateRange.expectedDateFrom,
                    date_to: expectedDateRange.expectedDateTo,
                    newsletter_id: 'newsletter-123'
                },
                enabled: true
            });
        });
    });

    describe('useNewslettersList', () => {
        it('calls useBrowseNewsletters', () => {
            const wrapper = TestWrapper;
            const {result} = renderHook(() => useNewslettersList(), {wrapper});
            
            expect(result.current).toBeDefined();
            expect(mockUseBrowseNewsletters).toHaveBeenCalledWith();
        });
    });

    describe('useNewsletterStatsWithRange - shouldFetch parameter', () => {
        it('returns empty state when shouldFetch is false', () => {
            const wrapper = TestWrapper;
            const mockRefetch = vi.fn();
            
            mockUseNewsletterStats.mockReturnValue({
                refetch: mockRefetch,
                data: undefined,
                isLoading: false,
                error: null
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);

            const {result} = renderHook(() => useNewsletterStatsWithRange(30, 'date desc', undefined, false), {wrapper});
            
            expect(result.current).toEqual({
                data: undefined,
                isLoading: false,
                error: null,
                isError: false,
                refetch: mockRefetch
            });
        });

        it('calls real API when shouldFetch is true', () => {
            const wrapper = TestWrapper;
            const {result} = renderHook(() => useNewsletterStatsWithRange(30, 'date desc', undefined, true), {wrapper});
            
            expect(result.current).toBeDefined();
            expect(mockUseNewsletterStats).toHaveBeenCalledWith({
                searchParams: expect.any(Object),
                enabled: true
            });
        });
    });

    describe('useSubscriberCountWithRange - shouldFetch parameter', () => {
        it('returns empty state when shouldFetch is false', () => {
            const wrapper = TestWrapper;
            const mockRefetch = vi.fn();
            
            mockUseSubscriberCount.mockReturnValue({
                refetch: mockRefetch,
                data: undefined,
                isLoading: false,
                error: null
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);

            const {result} = renderHook(() => useSubscriberCountWithRange(30, undefined, false), {wrapper});
            
            expect(result.current).toEqual({
                data: undefined,
                isLoading: false,
                error: null,
                isError: false,
                refetch: mockRefetch
            });
        });

        it('calls real API when shouldFetch is true', () => {
            const wrapper = TestWrapper;
            const {result} = renderHook(() => useSubscriberCountWithRange(30, undefined, true), {wrapper});
            
            expect(result.current).toBeDefined();
            expect(mockUseSubscriberCount).toHaveBeenCalledWith({
                searchParams: expect.any(Object),
                enabled: true
            });
        });
    });

    describe('useNewsletterBasicStatsWithRange', () => {
        it('uses default range of 30 days when no range provided', () => {
            const wrapper = TestWrapper;
            const {result} = renderHook(() => useNewsletterBasicStatsWithRange(), {wrapper});
            
            const expectedDateRange = getExpectedDateRange(30);
            
            expect(result.current).toBeDefined();
            expect(mockUseNewsletterBasicStats).toHaveBeenCalledWith({
                searchParams: {
                    date_from: expectedDateRange.expectedDateFrom,
                    date_to: expectedDateRange.expectedDateTo,
                    order: 'date desc'
                },
                enabled: true
            });
        });

        it('accepts custom range and order parameters', () => {
            const wrapper = TestWrapper;
            const {result} = renderHook(() => useNewsletterBasicStatsWithRange(7, 'open_rate desc'), {wrapper});
            
            const expectedDateRange = getExpectedDateRange(7);
            
            expect(result.current).toBeDefined();
            expect(mockUseNewsletterBasicStats).toHaveBeenCalledWith({
                searchParams: {
                    date_from: expectedDateRange.expectedDateFrom,
                    date_to: expectedDateRange.expectedDateTo,
                    order: 'open_rate desc'
                },
                enabled: true
            });
        });

        it('accepts newsletter ID parameter', () => {
            const wrapper = TestWrapper;
            const {result} = renderHook(() => useNewsletterBasicStatsWithRange(30, 'date desc', 'newsletter-456'), {wrapper});
            
            const expectedDateRange = getExpectedDateRange(30);
            
            expect(result.current).toBeDefined();
            expect(mockUseNewsletterBasicStats).toHaveBeenCalledWith({
                searchParams: {
                    date_from: expectedDateRange.expectedDateFrom,
                    date_to: expectedDateRange.expectedDateTo,
                    order: 'date desc',
                    newsletter_id: 'newsletter-456'
                },
                enabled: true
            });
        });

        it('returns empty state when shouldFetch is false', () => {
            const wrapper = TestWrapper;
            const mockRefetch = vi.fn();
            
            mockUseNewsletterBasicStats.mockReturnValue({
                refetch: mockRefetch,
                data: undefined,
                isLoading: false,
                error: null
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);

            const {result} = renderHook(() => useNewsletterBasicStatsWithRange(30, 'date desc', undefined, false), {wrapper});
            
            expect(result.current).toEqual({
                data: undefined,
                isLoading: false,
                error: null,
                isError: false,
                refetch: mockRefetch
            });
        });
    });

    describe('useNewsletterClickStatsWithRange', () => {
        it('builds search params with newsletter ID', () => {
            const wrapper = TestWrapper;
            const {result} = renderHook(() => useNewsletterClickStatsWithRange('newsletter-789'), {wrapper});
            
            expect(result.current).toBeDefined();
            expect(mockUseNewsletterClickStats).toHaveBeenCalledWith({
                searchParams: {
                    newsletter_id: 'newsletter-789'
                },
                enabled: true
            });
        });

        it('builds search params with post IDs', () => {
            const wrapper = TestWrapper;
            const postIds = ['post-1', 'post-2', 'post-3'];
            const {result} = renderHook(() => useNewsletterClickStatsWithRange(undefined, postIds), {wrapper});
            
            expect(result.current).toBeDefined();
            expect(mockUseNewsletterClickStats).toHaveBeenCalledWith({
                searchParams: {
                    post_ids: 'post-1,post-2,post-3'
                },
                enabled: true
            });
        });

        it('builds search params with both newsletter ID and post IDs', () => {
            const wrapper = TestWrapper;
            const postIds = ['post-1', 'post-2'];
            const {result} = renderHook(() => useNewsletterClickStatsWithRange('newsletter-789', postIds), {wrapper});
            
            expect(result.current).toBeDefined();
            expect(mockUseNewsletterClickStats).toHaveBeenCalledWith({
                searchParams: {
                    newsletter_id: 'newsletter-789',
                    post_ids: 'post-1,post-2'
                },
                enabled: true
            });
        });

        it('builds empty search params when no newsletter ID or post IDs', () => {
            const wrapper = TestWrapper;
            const {result} = renderHook(() => useNewsletterClickStatsWithRange(), {wrapper});
            
            expect(result.current).toBeDefined();
            expect(mockUseNewsletterClickStats).toHaveBeenCalledWith({
                searchParams: {},
                enabled: true
            });
        });

        it('handles empty post IDs array', () => {
            const wrapper = TestWrapper;
            const {result} = renderHook(() => useNewsletterClickStatsWithRange('newsletter-789', []), {wrapper});
            
            expect(result.current).toBeDefined();
            expect(mockUseNewsletterClickStats).toHaveBeenCalledWith({
                searchParams: {
                    newsletter_id: 'newsletter-789'
                },
                enabled: true
            });
        });

        it('returns empty state when shouldFetch is false', () => {
            const wrapper = TestWrapper;
            const mockRefetch = vi.fn();
            
            mockUseNewsletterClickStats.mockReturnValue({
                refetch: mockRefetch,
                data: undefined,
                isLoading: false,
                error: null
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);

            const {result} = renderHook(() => useNewsletterClickStatsWithRange('newsletter-123', [], false), {wrapper});
            
            expect(result.current).toEqual({
                data: undefined,
                isLoading: false,
                error: null,
                isError: false,
                refetch: mockRefetch
            });
        });
    });

    describe('useNewsletterStatsWithRangeSplit', () => {
        it('combines basic stats and click stats', () => {
            const wrapper = TestWrapper;
            
            const basicStatsData = {
                stats: [
                    {post_id: 'post-1', open_rate: 0.5, subject: 'Subject 1'},
                    {post_id: 'post-2', open_rate: 0.6, subject: 'Subject 2'}
                ],
                meta: {pagination: {total: 2}}
            };

            const clickStatsData = {
                stats: [
                    {post_id: 'post-1', total_clicks: 100, click_rate: 0.1},
                    {post_id: 'post-2', total_clicks: 150, click_rate: 0.15}
                ]
            };

            mockUseNewsletterBasicStats.mockReturnValue({
                data: basicStatsData,
                isLoading: false,
                error: null,
                isError: false,
                refetch: vi.fn()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);

            mockUseNewsletterClickStats.mockReturnValue({
                data: clickStatsData,
                isLoading: false,
                error: null,
                isError: false,
                refetch: vi.fn()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);

            const {result} = renderHook(() => useNewsletterStatsWithRangeSplit(), {wrapper});
            
            expect(result.current.data).toEqual({
                stats: [
                    {post_id: 'post-1', open_rate: 0.5, subject: 'Subject 1', total_clicks: 100, click_rate: 0.1},
                    {post_id: 'post-2', open_rate: 0.6, subject: 'Subject 2', total_clicks: 150, click_rate: 0.15}
                ],
                meta: {pagination: {total: 2}}
            });
        });

        it('handles missing click stats with default values', () => {
            const wrapper = TestWrapper;
            
            const basicStatsData = {
                stats: [
                    {post_id: 'post-1', open_rate: 0.5, subject: 'Subject 1'}
                ],
                meta: {pagination: {total: 1}}
            };

            mockUseNewsletterBasicStats.mockReturnValue({
                data: basicStatsData,
                isLoading: false,
                error: null,
                isError: false,
                refetch: vi.fn()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);

            mockUseNewsletterClickStats.mockReturnValue({
                data: {stats: []},
                isLoading: false,
                error: null,
                isError: false,
                refetch: vi.fn()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);

            const {result} = renderHook(() => useNewsletterStatsWithRangeSplit(), {wrapper});
            
            expect(result.current.data).toEqual({
                stats: [
                    {post_id: 'post-1', open_rate: 0.5, subject: 'Subject 1', total_clicks: 0, click_rate: 0}
                ],
                meta: {pagination: {total: 1}}
            });
        });

        it('returns undefined when no basic stats', () => {
            const wrapper = TestWrapper;
            
            mockUseNewsletterBasicStats.mockReturnValue({
                data: null,
                isLoading: false,
                error: null,
                isError: false,
                refetch: vi.fn()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);

            const {result} = renderHook(() => useNewsletterStatsWithRangeSplit(), {wrapper});
            
            expect(result.current.data).toBeUndefined();
        });

        it('returns undefined when basic stats has no stats array', () => {
            const wrapper = TestWrapper;
            
            mockUseNewsletterBasicStats.mockReturnValue({
                data: {meta: {pagination: {total: 0}}},
                isLoading: false,
                error: null,
                isError: false,
                refetch: vi.fn()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);

            const {result} = renderHook(() => useNewsletterStatsWithRangeSplit(), {wrapper});
            
            expect(result.current.data).toBeUndefined();
        });

        it('handles loading states correctly', () => {
            const wrapper = TestWrapper;
            
            mockUseNewsletterBasicStats.mockReturnValue({
                data: null,
                isLoading: true,
                error: null,
                isError: false,
                refetch: vi.fn()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);

            mockUseNewsletterClickStats.mockReturnValue({
                data: null,
                isLoading: false,
                error: null,
                isError: false,
                refetch: vi.fn()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);

            const {result} = renderHook(() => useNewsletterStatsWithRangeSplit(), {wrapper});
            
            expect(result.current.isLoading).toBe(true);
            expect(result.current.isClicksLoading).toBe(false);
        });

        it('handles error states correctly', () => {
            const wrapper = TestWrapper;
            const basicError = new Error('Basic stats error');
            const clickError = new Error('Click stats error');
            
            mockUseNewsletterBasicStats.mockReturnValue({
                data: null,
                isLoading: false,
                error: basicError,
                isError: true,
                refetch: vi.fn()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);

            mockUseNewsletterClickStats.mockReturnValue({
                data: null,
                isLoading: false,
                error: clickError,
                isError: true,
                refetch: vi.fn()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);

            const {result} = renderHook(() => useNewsletterStatsWithRangeSplit(), {wrapper});
            
            expect(result.current.error).toBe(basicError);
            expect(result.current.isError).toBe(true);
        });

        it('disables click stats when no post IDs available', () => {
            const wrapper = TestWrapper;
            
            const basicStatsData = {
                stats: [],
                meta: {pagination: {total: 0}}
            };

            mockUseNewsletterBasicStats.mockReturnValue({
                data: basicStatsData,
                isLoading: false,
                error: null,
                isError: false,
                refetch: vi.fn()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);

            renderHook(() => useNewsletterStatsWithRangeSplit(30, 'date desc', 'newsletter-123', true), {wrapper});
            
            // Click stats should be called with enabled: false since no post IDs
            expect(mockUseNewsletterClickStats).toHaveBeenCalledWith({
                searchParams: {newsletter_id: 'newsletter-123'},
                enabled: false
            });
        });

        it('calls refetch on both hooks', () => {
            const wrapper = TestWrapper;
            const basicRefetch = vi.fn();
            const clickRefetch = vi.fn();
            
            mockUseNewsletterBasicStats.mockReturnValue({
                data: {stats: []},
                isLoading: false,
                error: null,
                isError: false,
                refetch: basicRefetch
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);

            mockUseNewsletterClickStats.mockReturnValue({
                data: {stats: []},
                isLoading: false,
                error: null,
                isError: false,
                refetch: clickRefetch
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);

            const {result} = renderHook(() => useNewsletterStatsWithRangeSplit(), {wrapper});
            
            result.current.refetch();
            
            expect(basicRefetch).toHaveBeenCalled();
            expect(clickRefetch).toHaveBeenCalled();
        });

        it('accepts custom parameters and passes them correctly', () => {
            const wrapper = TestWrapper;
            
            renderHook(() => useNewsletterStatsWithRangeSplit(7, 'click_rate desc', 'newsletter-456', true), {wrapper});
            
            const expectedDateRange = getExpectedDateRange(7);
            
            expect(mockUseNewsletterBasicStats).toHaveBeenCalledWith({
                searchParams: {
                    date_from: expectedDateRange.expectedDateFrom,
                    date_to: expectedDateRange.expectedDateTo,
                    order: 'click_rate desc',
                    newsletter_id: 'newsletter-456'
                },
                enabled: true
            });
        });
    });
}); 