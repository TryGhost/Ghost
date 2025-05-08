import GlobalDataProvider from '../../../src/providers/GlobalDataProvider';
import React from 'react';
import {HttpResponse, http} from 'msw';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {act, renderHook, waitFor} from '@testing-library/react';
import {afterAll, afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
import {setupServer} from 'msw/node';
import {useEditLinks} from '../../../src/hooks/useEditLinks';

const server = setupServer();

const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
            suspense: false
        }
    }
});

describe('useEditLinks', () => {
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

    it('initial state is correct', () => {
        const {result} = renderHook(() => useEditLinks(), {wrapper});
        expect(result.current.isEditLinksLoading).toBe(false);
    });

    it('calls the API and updates loading state on successful edit', async () => {
        const mockSuccessResponse = {
            bulk: {
                action: 'updateLink',
                meta: {
                    stats: {successful: 1, unsuccessful: 0},
                    errors: [],
                    unsuccessfulData: []
                }
            }
        };

        server.use(
            http.put('/ghost/api/admin/links/bulk/', async ({request}) => {
                const url = new URL(request.url);
                expect(url.searchParams.get('filter')).toBe('post_id:\'test-post-id\'+to:\'https://original.com\'');
                
                const body = await request.json();
                expect(body).toEqual({
                    bulk: {
                        action: 'updateLink',
                        meta: {
                            link: {
                                to: 'https://edited.com'
                            }
                        }
                    }
                });
                return HttpResponse.json(mockSuccessResponse);
            })
        );

        const {result} = renderHook(() => useEditLinks(), {wrapper});

        expect(result.current.isEditLinksLoading).toBe(false);

        // Use act to wrap state updates
        await act(async () => {
            result.current.editLinks({
                postId: 'test-post-id',
                originalUrl: 'https://original.com',
                editedUrl: 'https://edited.com'
            });
        });
        
        // isLoading should be true immediately after calling editLinks (before promise resolves)
        // but due to act and async nature, checking after await for it to be false.
        // If we need to check true state, it requires more granular control or callbacks.

        await waitFor(() => {
            expect(result.current.isEditLinksLoading).toBe(false);
        });
    });

    it('handles API error and updates loading state', async () => {
        server.use(
            http.put('/ghost/api/admin/links/bulk/', () => {
                return new HttpResponse(null, {status: 500});
            })
        );

        const {result} = renderHook(() => useEditLinks(), {wrapper});
        expect(result.current.isEditLinksLoading).toBe(false);

        let mutationError: Error | null = null;
        try {
            await act(async () => {
                await result.current.editLinks({
                    postId: 'test-post-id',
                    originalUrl: 'https://original.com',
                    editedUrl: 'https://edited.com'
                });
            });
        } catch (e) {
            mutationError = e as Error;
        }
        
        // For TanStack Query v5, mutateAsync throws on error by default
        // Depending on global/hook-level error handling, this might not be needed
        // or the error should be caught and asserted.
        // Here, we'll assume the hook itself doesn't suppress the error.

        await waitFor(() => {
            expect(result.current.isEditLinksLoading).toBe(false);
        });
        // We expect an error to be thrown by mutateAsync
        expect(mutationError).toBeInstanceOf(Error);
    });

    it('correctly sets loading state during API call', async () => {
        let resolveRequest: (value: unknown) => void;
        const requestPromise = new Promise((resolve) => {
            resolveRequest = resolve;
        });

        server.use(
            http.put('/ghost/api/admin/links/bulk/', async () => {
                await requestPromise; // Hold the request
                return HttpResponse.json({}); 
            })
        );

        const {result} = renderHook(() => useEditLinks(), {wrapper});

        expect(result.current.isEditLinksLoading).toBe(false);

        act(() => {
            // Don't await here to check intermediate loading state
            result.current.editLinks({
                postId: 'test-post-id',
                originalUrl: 'https://original.com',
                editedUrl: 'https://edited.com'
            });
        });

        await waitFor(() => {
            expect(result.current.isEditLinksLoading).toBe(true);
        });

        // Allow the request to complete
        act(() => {
            resolveRequest({});
        });
        
        await waitFor(() => {
            expect(result.current.isEditLinksLoading).toBe(false);
        });
    });
});
