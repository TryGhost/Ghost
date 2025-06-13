import GlobalDataProvider from '@src/providers/PostAnalyticsContext';
import React, {act} from 'react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {createErrorHandler, setupMswServer} from '@tryghost/admin-x-framework/test/msw-utils';
import {describe, expect, it} from 'vitest';
import {renderHook, waitFor} from '@testing-library/react';
import {useEditLinks} from '@src/hooks/useEditLinks';

// Set up MSW server with common Ghost API handlers
const server = setupMswServer();

const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
            suspense: false
        }
    }
});

describe('useEditLinks', () => {
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

    it('calls the API with correct parameters and body on successful edit', async () => {
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

        // Override the default handler with request validation
        const {http, HttpResponse} = await import('msw');
        server.use(
            http.put('/ghost/api/admin/links/bulk/', async ({request}) => {
                const url = new URL(request.url);
                const body = await request.json();
                
                // Validate URL parameters
                expect(url.searchParams.get('filter')).toBe('post_id:\'test-post-id\'+to:\'https://original.com\'');
                
                // Validate request body
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
        await waitFor(() => {
            expect(result.current.isEditLinksLoading).toBe(false);
        });
    });

    it('handles API error and updates loading state', async () => {
        // Use the error handler utility
        server.use(
            createErrorHandler('put', '/ghost/api/admin/links/bulk/', 500)
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

        await waitFor(() => {
            expect(result.current.isEditLinksLoading).toBe(false);
        });
        expect(mutationError).toBeInstanceOf(Error);
    });

    it('correctly sets loading state during API call', async () => {
        let resolveRequest: (value: unknown) => void;
        const requestPromise = new Promise((resolve) => {
            resolveRequest = resolve;
        });

        // Custom handler with delay
        const {http, HttpResponse} = await import('msw');
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
