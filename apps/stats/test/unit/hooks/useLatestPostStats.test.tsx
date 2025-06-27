import {renderHook, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useLatestPostStats} from '@src/hooks/useLatestPostStats';

// Mock external dependencies
vi.mock('@tryghost/admin-x-framework/api/posts', () => ({
    useBrowsePosts: vi.fn()
}));

vi.mock('@tryghost/admin-x-framework/api/stats', () => ({
    usePostStats: vi.fn()
}));

const mockUseBrowsePosts = vi.mocked(await import('@tryghost/admin-x-framework/api/posts')).useBrowsePosts;
const mockUsePostStats = vi.mocked(await import('@tryghost/admin-x-framework/api/stats')).usePostStats;

describe('useLatestPostStats', () => {
    const mockPost = {
        id: 'post-123',
        uuid: 'post-uuid-123',
        title: 'Test Post',
        slug: 'test-post',
        feature_image: 'https://example.com/image.jpg',
        published_at: '2024-01-15T10:00:00.000Z',
        url: 'https://example.com/test-post/',
        excerpt: 'This is a test post excerpt',
        email_only: false,
        status: 'published',
        email: {
            opened_count: 100,
            email_count: 200,
            status: 'sent'
        },
        count: {
            clicks: 50
        },
        authors: [{name: 'Test Author'}]
    };

    const mockStatsData = {
        stats: [{
            id: 'post-123',
            recipient_count: 200,
            opened_count: 100,
            open_rate: 0.5,
            member_delta: 5,
            free_members: 3,
            paid_members: 2,
            visitors: 150
        }]
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('fetches latest post with correct parameters', () => {
        mockUseBrowsePosts.mockReturnValue({
            data: {posts: [mockPost]},
            isLoading: false,
            error: null
        });
        
        mockUsePostStats.mockReturnValue({
            data: mockStatsData,
            isLoading: false,
            error: null
        });

        renderHook(() => useLatestPostStats());

        expect(mockUseBrowsePosts).toHaveBeenCalledWith({
            searchParams: {
                filter: 'status:[published,sent]',
                order: 'published_at DESC',
                limit: '1',
                include: 'authors,email,count.clicks'
            }
        });
    });

    it('does not fetch stats when no post is available', () => {
        mockUseBrowsePosts.mockReturnValue({
            data: {posts: []},
            isLoading: false,
            error: null
        });

        renderHook(() => useLatestPostStats());

        expect(mockUsePostStats).toHaveBeenCalledWith('', {
            enabled: false
        });
    });

    it('fetches stats when post is available', () => {
        mockUseBrowsePosts.mockReturnValue({
            data: {posts: [mockPost]},
            isLoading: false,
            error: null
        });

        mockUsePostStats.mockReturnValue({
            data: mockStatsData,
            isLoading: false,
            error: null
        });

        renderHook(() => useLatestPostStats());

        expect(mockUsePostStats).toHaveBeenCalledWith('post-123', {
            enabled: true
        });
    });

    it('returns combined post and stats data', async () => {
        mockUseBrowsePosts.mockReturnValue({
            data: {posts: [mockPost]},
            isLoading: false,
            error: null
        });

        mockUsePostStats.mockReturnValue({
            data: mockStatsData,
            isLoading: false,
            error: null
        });

        const {result} = renderHook(() => useLatestPostStats());

        await waitFor(() => {
            expect(result.current.data).toEqual({
                // Post data
                id: 'post-123',
                uuid: 'post-uuid-123',
                title: 'Test Post',
                slug: 'test-post',
                feature_image: 'https://example.com/image.jpg',
                published_at: '2024-01-15T10:00:00.000Z',
                url: 'https://example.com/test-post/',
                excerpt: 'This is a test post excerpt',
                email_only: false,
                status: 'published',
                email: {
                    opened_count: 100,
                    email_count: 200,
                    status: 'sent'
                },
                count: {
                    clicks: 50
                },
                authors: [{name: 'Test Author'}],
                // Stats data
                recipient_count: 200,
                opened_count: 100,
                open_rate: 0.5,
                member_delta: 5,
                free_members: 3,
                paid_members: 2,
                visitors: 150,
                click_rate: null
            });
        });
    });

    it('returns post with default stats when stats are not available', async () => {
        mockUseBrowsePosts.mockReturnValue({
            data: {posts: [mockPost]},
            isLoading: false,
            error: null
        });

        mockUsePostStats.mockReturnValue({
            data: null,
            isLoading: false,
            error: null
        });

        const {result} = renderHook(() => useLatestPostStats());

        await waitFor(() => {
            expect(result.current.data).toEqual({
                // Post data
                id: 'post-123',
                uuid: 'post-uuid-123',
                title: 'Test Post',
                slug: 'test-post',
                feature_image: 'https://example.com/image.jpg',
                published_at: '2024-01-15T10:00:00.000Z',
                url: 'https://example.com/test-post/',
                excerpt: 'This is a test post excerpt',
                email_only: false,
                status: 'published',
                email: {
                    opened_count: 100,
                    email_count: 200,
                    status: 'sent'
                },
                count: {
                    clicks: 50
                },
                authors: [{name: 'Test Author'}],
                // Default stats
                recipient_count: null,
                opened_count: null,
                open_rate: null,
                member_delta: 0,
                free_members: 0,
                paid_members: 0,
                visitors: 0,
                click_rate: null
            });
        });
    });

    it('returns post with default stats when stats array is empty', async () => {
        mockUseBrowsePosts.mockReturnValue({
            data: {posts: [mockPost]},
            isLoading: false,
            error: null
        });

        mockUsePostStats.mockReturnValue({
            data: {stats: []},
            isLoading: false,
            error: null
        });

        const {result} = renderHook(() => useLatestPostStats());

        await waitFor(() => {
            expect(result.current.data?.member_delta).toBe(0);
            expect(result.current.data?.free_members).toBe(0);
            expect(result.current.data?.paid_members).toBe(0);
            expect(result.current.data?.visitors).toBe(0);
        });
    });

    it('returns null when no post is available', () => {
        mockUseBrowsePosts.mockReturnValue({
            data: {posts: []},
            isLoading: false,
            error: null
        });

        mockUsePostStats.mockReturnValue({
            data: null,
            isLoading: false,
            error: null
        });

        const {result} = renderHook(() => useLatestPostStats());

        expect(result.current.data).toBeNull();
    });

    it('handles posts data being undefined', () => {
        mockUseBrowsePosts.mockReturnValue({
            data: undefined,
            isLoading: false,
            error: null
        });

        mockUsePostStats.mockReturnValue({
            data: null,
            isLoading: false,
            error: null
        });

        const {result} = renderHook(() => useLatestPostStats());

        expect(result.current.data).toBeNull();
    });

    it('handles post with missing optional fields', async () => {
        const minimalPost = {
            id: 'post-456',
            uuid: 'post-uuid-456',
            published_at: '2024-01-15T10:00:00.000Z'
        };

        mockUseBrowsePosts.mockReturnValue({
            data: {posts: [minimalPost]},
            isLoading: false,
            error: null
        });

        mockUsePostStats.mockReturnValue({
            data: mockStatsData,
            isLoading: false,
            error: null
        });

        const {result} = renderHook(() => useLatestPostStats());

        await waitFor(() => {
            expect(result.current.data).toEqual({
                id: 'post-456',
                uuid: 'post-uuid-456',
                title: '',
                slug: '',
                feature_image: null,
                published_at: '2024-01-15T10:00:00.000Z',
                url: '',
                excerpt: '',
                email_only: false,
                status: undefined,
                email: undefined,
                count: undefined,
                authors: [],
                // Stats data from mockStatsData
                recipient_count: 200,
                opened_count: 100,
                open_rate: 0.5,
                member_delta: 5,
                free_members: 3,
                paid_members: 2,
                visitors: 150,
                click_rate: null
            });
        });
    });

    it('returns correct loading state when posts are loading', () => {
        mockUseBrowsePosts.mockReturnValue({
            data: {posts: []},
            isLoading: true,
            error: null
        });

        mockUsePostStats.mockReturnValue({
            data: null,
            isLoading: false,
            error: null
        });

        const {result} = renderHook(() => useLatestPostStats());

        expect(result.current.isLoading).toBe(true);
    });

    it('returns correct loading state when stats are loading', () => {
        mockUseBrowsePosts.mockReturnValue({
            data: {posts: [mockPost]},
            isLoading: false,
            error: null
        });

        mockUsePostStats.mockReturnValue({
            data: null,
            isLoading: true,
            error: null
        });

        const {result} = renderHook(() => useLatestPostStats());

        expect(result.current.isLoading).toBe(true);
    });

    it('returns false loading when posts loaded but no post ID (stats not fetched)', () => {
        mockUseBrowsePosts.mockReturnValue({
            data: {posts: []},
            isLoading: false,
            error: null
        });

        mockUsePostStats.mockReturnValue({
            data: null,
            isLoading: false,
            error: null
        });

        const {result} = renderHook(() => useLatestPostStats());

        expect(result.current.isLoading).toBe(false);
    });

    it('handles stats loading when both posts and stats are loading', () => {
        mockUseBrowsePosts.mockReturnValue({
            data: {posts: [mockPost]},
            isLoading: true,
            error: null
        });

        mockUsePostStats.mockReturnValue({
            data: null,
            isLoading: true,
            error: null
        });

        const {result} = renderHook(() => useLatestPostStats());

        expect(result.current.isLoading).toBe(true);
    });

    it('memoizes result correctly', async () => {
        mockUseBrowsePosts.mockReturnValue({
            data: {posts: [mockPost]},
            isLoading: false,
            error: null
        });

        mockUsePostStats.mockReturnValue({
            data: mockStatsData,
            isLoading: false,
            error: null
        });

        const {result, rerender} = renderHook(() => useLatestPostStats());

        const firstResult = result.current.data;
        
        // Trigger re-render
        rerender();
        
        const secondResult = result.current.data;

        // Should be the same object reference due to useMemo
        expect(firstResult).toBe(secondResult);
    });

    it('updates memoized result when dependencies change', async () => {
        mockUseBrowsePosts.mockReturnValue({
            data: {posts: [mockPost]},
            isLoading: false,
            error: null
        });

        mockUsePostStats.mockReturnValue({
            data: mockStatsData,
            isLoading: false,
            error: null
        });

        const {result, rerender} = renderHook(() => useLatestPostStats());

        const firstResult = result.current.data;

        // Change the stats data
        const newStatsData = {
            stats: [{
                ...mockStatsData.stats[0],
                member_delta: 10
            }]
        };

        mockUsePostStats.mockReturnValue({
            data: newStatsData,
            isLoading: false,
            error: null
        });

        rerender();

        await waitFor(() => {
            expect(result.current.data?.member_delta).toBe(10);
            expect(result.current.data).not.toBe(firstResult);
        });
    });
});