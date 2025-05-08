import GlobalDataProvider from '../../../src/providers/GlobalDataProvider';
import React from 'react';
import {HttpResponse, http} from 'msw';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {afterAll, afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
import {renderHook, waitFor} from '@testing-library/react';
import {setupServer} from 'msw/node';
import {usePostNewsletterStats} from '../../../src/hooks/usePostNewsletterStats';

const server = setupServer();

const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: {
            retry: false
        }
    }
});

describe('usePostNewsletterStats', () => {
    beforeAll(() => server.listen());
    afterEach(() => {
        server.resetHandlers();
        vi.resetAllMocks();
    });
    afterAll(() => server.close());

    const wrapper = ({children}: {children: React.ReactNode}) => {
        const queryClient = createTestQueryClient();
        return (
            <QueryClientProvider client={queryClient}>
                <GlobalDataProvider>{children}</GlobalDataProvider>
            </QueryClientProvider>
        );
    };

    it('returns empty stats when post is not loaded', async () => {
        server.use(
            http.get('/ghost/api/admin/posts/:id/', () => {
                return HttpResponse.json({posts: []});
            }),
            http.get('/ghost/api/admin/stats/newsletter-stats/', () => {
                return HttpResponse.json({stats: []});
            })
        );

        const {result} = renderHook(() => usePostNewsletterStats('post-id'), {wrapper});

        // Initial state should be loading
        expect(result.current.isLoading).toBe(true);

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

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

    it('calculates stats correctly from post data', async () => {
        server.use(
            http.get('/ghost/api/admin/posts/:id/', () => {
                return HttpResponse.json({
                    posts: [{
                        id: 'post-id',
                        email: {
                            email_count: 1000,
                            opened_count: 500
                        },
                        count: {
                            clicks: 200
                        }
                    }],
                    meta: {}
                });
            }),
            http.get('/ghost/api/admin/stats/newsletter-stats/', () => {
                return HttpResponse.json({
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
                });
            })
        );
        const {result} = renderHook(() => usePostNewsletterStats('post-id'), {wrapper});

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

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

    it('handles missing email data', async () => {
        server.use(
            http.get('/ghost/api/admin/posts/:id/', () => {
                return HttpResponse.json({
                    posts: [{
                        id: 'post-id',
                        count: {
                            clicks: 200
                        }
                    }]
                });
            }),
            http.get('/ghost/api/admin/stats/newsletter-stats/', () => {
                return HttpResponse.json({
                    stats: [],
                    meta: {}
                });
            })
        );

        const {result} = renderHook(() => usePostNewsletterStats('post-id'), {wrapper});

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.stats).toEqual({
            sent: 0,
            opened: 0,
            clicked: 200,
            openedRate: 0,
            clickedRate: 0
        });
    });

    it('handles missing count data', async () => {
        server.use(
            http.get('/ghost/api/admin/posts/:id/', () => {
                return HttpResponse.json({
                    posts: [{
                        id: 'post-id',
                        email: {
                            email_count: 1000,
                            opened_count: 500
                        }
                    }]
                });
            }),
            http.get('/ghost/api/admin/stats/newsletter-stats/', () => {
                return HttpResponse.json({
                    stats: [],
                    meta: {}
                });
            })
        );

        const {result} = renderHook(() => usePostNewsletterStats('post-id'), {wrapper});

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.stats).toEqual({
            sent: 1000,
            opened: 500,
            clicked: 0,
            openedRate: 0.5,
            clickedRate: 0
        });
    });

    it('handles missing newsletter stats', async () => {
        server.use(
            http.get('/ghost/api/admin/posts/:id/', () => {
                return HttpResponse.json({
                    posts: [{
                        id: 'post-id',
                        email: {
                            email_count: 1000,
                            opened_count: 500
                        },
                        count: {
                            clicks: 200
                        }
                    }],
                    meta: {}
                });
            }),
            http.get('/ghost/api/admin/stats/newsletter-stats/', () => {
                return HttpResponse.json({stats: undefined});
            })
        );

        const {result} = renderHook(() => usePostNewsletterStats('post-id'), {wrapper});

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.averageStats).toEqual({
            openedRate: 0,
            clickedRate: 0
        });
    });
}); 