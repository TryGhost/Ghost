import {describe, it, expect, vi, beforeEach} from 'vitest';
import {renderHook} from '@testing-library/react';
import {usePostNewsletterStats} from '@src/hooks/usePostNewsletterStats';
import * as postsApi from '@tryghost/admin-x-framework/api/posts';
import * as statsApi from '@tryghost/admin-x-framework/api/stats';

vi.mock('@tryghost/admin-x-framework/api/posts', () => ({
    getPost: vi.fn()
}));

vi.mock('@tryghost/admin-x-framework/api/stats', () => ({
    useNewsletterStats: vi.fn()
}));

describe('usePostNewsletterStats', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('returns empty stats when post is not loaded', () => {
        vi.mocked(postsApi.getPost).mockReturnValue({
            data: undefined,
            isLoading: true
        } as any);

        vi.mocked(statsApi.useNewsletterStats).mockReturnValue({
            data: undefined,
            isLoading: true
        } as any);

        const {result} = renderHook(() => usePostNewsletterStats('post-id'));

        expect(result.current.isLoading).toBe(true);
        expect(result.current.post).toBeUndefined();
        expect(result.current.stats).toEqual({
            sent: 0,
            opened: 0,
            clicked: 0,
            openedRate: 0,
            clickedRate: 0
        });

        expect(result.current.averageStats).toEqual({
            openedRate: 0,
            clickedRate: 0
        });
    });

    it('calculates stats correctly from post data', () => {
        vi.mocked(postsApi.getPost).mockReturnValue({
            data: {
                posts: [{
                    email: {
                        email_count: 1000,
                        opened_count: 500
                    },
                    count: {
                        clicks: 200
                    }
                }],
                meta: {}
            },
            isLoading: false
        } as any);

        vi.mocked(statsApi.useNewsletterStats).mockReturnValue({
            data: {
                stats: [
                    {
                        open_rate: 0.5,
                        click_rate: 0.2
                    },
                    {
                        open_rate: 0.6,
                        click_rate: 0.4
                    }
                ],
                meta: {}
            },
            isLoading: false
        } as any);
        const {result} = renderHook(() => usePostNewsletterStats('post-id'));

        expect(result.current.isLoading).toBe(false);
        expect(result.current.stats).toEqual({
            sent: 1000,
            opened: 500,
            clicked: 200,
            openedRate: 0.5,
            clickedRate: 0.2
        });

        expect(result.current.averageStats).toEqual({
            openedRate: 0.55,
            clickedRate: 0.3
        });
    });

    it('handles missing email data', () => {
        vi.mocked(postsApi.getPost).mockReturnValue({
            data: {
                posts: [{
                    count: {
                        clicks: 200
                    }
                }]
            },
            isLoading: false
        } as any);

        vi.mocked(statsApi.useNewsletterStats).mockReturnValue({
            data: {
                stats: [],
                meta: {}
            },
            isLoading: false
        } as any);

        const {result} = renderHook(() => usePostNewsletterStats('post-id'));

        expect(result.current.stats).toEqual({
            sent: 0,
            opened: 0,
            clicked: 200,
            openedRate: 0,
            clickedRate: 0
        });
    });

    it('handles missing count data', () => {
        vi.mocked(postsApi.getPost).mockReturnValue({
            data: {
                posts: [{
                    email: {
                        email_count: 1000,
                        opened_count: 500
                    }
                }]
            },
            isLoading: false
        } as any);

        vi.mocked(statsApi.useNewsletterStats).mockReturnValue({
            data: {
                stats: [],
                meta: {}
            },
            isLoading: false
        } as any);

        const {result} = renderHook(() => usePostNewsletterStats('post-id'));

        expect(result.current.stats).toEqual({
            sent: 1000,
            opened: 500,
            clicked: 0,
            openedRate: 0.5,
            clickedRate: 0
        });
    });

    it('handles missing newsletter stats', () => {
        vi.mocked(postsApi.getPost).mockReturnValue({
            data: {
                posts: [{
                    email: {
                        email_count: 1000,
                        opened_count: 500
                    },
                    count: {
                        clicks: 200
                    }
                }],
                meta: {}
            },
            isLoading: false
        } as any);

        vi.mocked(statsApi.useNewsletterStats).mockReturnValue({
            data: undefined,
            isLoading: false
        } as any);

        const {result} = renderHook(() => usePostNewsletterStats('post-id'));

        expect(result.current.averageStats).toEqual({
            openedRate: 0,
            clickedRate: 0
        });
    });
    
});
