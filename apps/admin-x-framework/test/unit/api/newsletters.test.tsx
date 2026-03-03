import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {renderHook, waitFor} from '@testing-library/react';
import React, {ReactNode} from 'react';
import {useActiveNewsletterSenderDefaults, useActiveNewslettersCount} from '../../../src/api/newsletters';
import {FrameworkProvider} from '../../../src/providers/framework-provider';
import {withMockFetch} from '../../utils/mock-fetch';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false
        }
    }
});

const wrapper: React.FC<{children: ReactNode}> = ({children}) => (
    <FrameworkProvider
        externalNavigate={() => {}}
        ghostVersion='5.x'
        sentryDSN=''
        unsplashConfig={{
            Authorization: '',
            'Accept-Version': '',
            'Content-Type': '',
            'App-Pragma': '',
            'X-Unsplash-Cache': true
        }}
        onDelete={() => {}}
        onInvalidate={() => {}}
        onUpdate={() => {}}
    >
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    </FrameworkProvider>
);

describe('useActiveNewslettersCount', () => {
    beforeEach(() => {
        queryClient.clear();
    });

    afterEach(() => {
        queryClient.clear();
    });

    it('requests active newsletter count with lightweight query params', async () => {
        await withMockFetch({
            json: {
                newsletters: [{id: 'newsletter-1'}],
                meta: {
                    pagination: {
                        page: 1,
                        limit: 1,
                        pages: 1,
                        total: 3,
                        next: null,
                        prev: null
                    }
                }
            }
        }, async (mock) => {
            const {result} = renderHook(() => useActiveNewslettersCount(), {wrapper});

            await waitFor(() => expect(result.current.isLoading).toBe(false));

            expect(result.current.data).toBe(3);
            // May fire more than once due to React strict mode double-rendering
            expect(mock.calls.length).toBeGreaterThanOrEqual(1);
            const targetUrl = 'http://localhost:3000/ghost/api/admin/newsletters/?filter=status%3Aactive&limit=1&fields=id';
            expect(mock.calls.some((c: [string]) => c[0] === targetUrl)).toBe(true);
        });
    });

    it('returns undefined when count metadata is missing', async () => {
        await withMockFetch({
            json: {
                newsletters: [{id: 'newsletter-1'}]
            }
        }, async () => {
            const {result} = renderHook(() => useActiveNewslettersCount(), {wrapper});

            await waitFor(() => expect(result.current.isLoading).toBe(false));

            expect(result.current.data).toBeUndefined();
        });
    });
});

describe('useActiveNewsletterSenderDefaults', () => {
    beforeEach(() => {
        queryClient.clear();
    });

    afterEach(() => {
        queryClient.clear();
    });

    it('requests sender defaults with lightweight fields query params', async () => {
        await withMockFetch({
            json: {
                newsletters: [{
                    id: 'newsletter-1',
                    sender_name: 'Local Haunts',
                    sender_email: 'hello@example.com',
                    sender_reply_to: 'support'
                }]
            }
        }, async (mock) => {
            const {result} = renderHook(() => useActiveNewsletterSenderDefaults(), {wrapper});

            await waitFor(() => expect(result.current.isLoading).toBe(false));

            expect(result.current.data).toEqual({
                id: 'newsletter-1',
                sender_name: 'Local Haunts',
                sender_email: 'hello@example.com',
                sender_reply_to: 'support'
            });
            // May fire more than once due to React strict mode double-rendering
            expect(mock.calls.length).toBeGreaterThanOrEqual(1);
            const targetUrl = 'http://localhost:3000/ghost/api/admin/newsletters/?filter=status%3Aactive&limit=1&fields=id%2Csender_name%2Csender_email%2Csender_reply_to';
            expect(mock.calls.some((c: [string]) => c[0] === targetUrl)).toBe(true);
        });
    });

    it('returns undefined when there is no active newsletter', async () => {
        await withMockFetch({
            json: {
                newsletters: []
            }
        }, async () => {
            const {result} = renderHook(() => useActiveNewsletterSenderDefaults(), {wrapper});

            await waitFor(() => expect(result.current.isLoading).toBe(false));

            expect(result.current.data).toBeUndefined();
        });
    });
});
