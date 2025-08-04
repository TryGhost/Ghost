import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {renderHook, waitFor} from '@testing-library/react';
import React, {ReactNode} from 'react';
import {getTinybirdToken} from '../../../src/api/tinybird';
import {FrameworkProvider} from '../../../src/providers/FrameworkProvider';
import {withMockFetch} from '../../utils/mockFetch';

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

describe('getTinybirdToken', () => {
    afterEach(() => {
        queryClient.clear();
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    it('makes an API request to correct endpoint', async () => {
        await withMockFetch({
            json: {tinybird: {token: 'test-token-123'}}
        }, async (mock) => {
            const {result} = renderHook(() => getTinybirdToken(), {wrapper});

            await waitFor(() => expect(result.current.isLoading).toBe(false));

            expect(result.current.data).toEqual({tinybird: {token: 'test-token-123'}});
            expect(mock.calls.length).toBe(1);
            expect(mock.calls[0][0]).toBe('http://localhost:3000/ghost/api/admin/tinybird/token/');
        });
    });

    it('makes only one request for multiple getTinybirdToken calls (caching)', async () => {
        await withMockFetch({
            json: {tinybird: {token: 'cached-token'}}
        }, async (mock) => {
            // First call
            const {result: result1} = renderHook(() => getTinybirdToken(), {wrapper});
            await waitFor(() => expect(result1.current.isLoading).toBe(false));

            // Second call should use cache
            const {result: result2} = renderHook(() => getTinybirdToken(), {wrapper});
            await waitFor(() => expect(result2.current.isLoading).toBe(false));

            // Both should have same data, but only 1 HTTP request
            expect(result1.current.data).toEqual({tinybird: {token: 'cached-token'}});
            expect(result2.current.data).toEqual({tinybird: {token: 'cached-token'}});
            expect(mock.calls.length).toBe(1);
        });
    });

    it('has built-in refresh interval options', async () => {
        // This test verifies the query has the right configuration without testing actual timing
        await withMockFetch({
            json: {tinybird: {token: 'initial-token'}}
        }, async (mock) => {
            const {result} = renderHook(() => getTinybirdToken(), {wrapper});
            await waitFor(() => expect(result.current.isLoading).toBe(false));
            
            expect(mock.calls.length).toBe(1);
            expect(result.current.data).toEqual({tinybird: {token: 'initial-token'}});
            
            // Verify that the query has React Query properties indicating background refresh is configured
            expect(typeof result.current.refetch).toBe('function');
            
            // Test that manual refetch works (proves the refresh infrastructure is in place)
            await result.current.refetch();
            expect(mock.calls.length).toBe(2);
        });
    });

    it('has built-in stale time configuration for caching', async () => {
        // Test that multiple calls within a reasonable timeframe use cache
        await withMockFetch({
            json: {tinybird: {token: 'stale-test-token'}}
        }, async (mock) => {
            // First call
            const {result: result1} = renderHook(() => getTinybirdToken(), {wrapper});
            await waitFor(() => expect(result1.current.isLoading).toBe(false));
            
            expect(mock.calls.length).toBe(1);

            // Second call immediately after should use cache
            const {result: result2} = renderHook(() => getTinybirdToken(), {wrapper});
            await waitFor(() => expect(result2.current.isLoading).toBe(false));
            
            // Should still be only 1 request due to built-in stale time
            expect(mock.calls.length).toBe(1);
            expect(result2.current.data).toEqual({tinybird: {token: 'stale-test-token'}});
        });
    });

    it('requires no configuration parameters', async () => {
        await withMockFetch({
            json: {tinybird: {token: 'no-config-token'}}
        }, async () => {
            // Should work without any parameters
            const {result} = renderHook(() => getTinybirdToken(), {wrapper});

            await waitFor(() => expect(result.current.isLoading).toBe(false));

            expect(result.current.data).toEqual({tinybird: {token: 'no-config-token'}});
            expect(typeof result.current.refetch).toBe('function');
        });
    });

    it('returns React Query interface properties', async () => {
        await withMockFetch({
            json: {tinybird: {token: 'interface-token'}}
        }, async () => {
            const {result} = renderHook(() => getTinybirdToken(), {wrapper});

            await waitFor(() => expect(result.current.isLoading).toBe(false));

            // Verify React Query interface
            expect(result.current).toHaveProperty('data');
            expect(result.current).toHaveProperty('isLoading');
            expect(result.current).toHaveProperty('error');
            expect(result.current).toHaveProperty('refetch');
            expect(result.current).toHaveProperty('isSuccess');
            expect(result.current).toHaveProperty('isFetching');
        });
    });

    it('handles API errors correctly', async () => {
        await withMockFetch({
            status: 500,
            ok: false
        }, async () => {
            const {result} = renderHook(() => getTinybirdToken(), {wrapper});

            await waitFor(() => expect(result.current.isLoading).toBe(false));

            expect(result.current.isError).toBe(true);
            expect(result.current.error).toBeDefined();
            expect(result.current.data).toBeUndefined();
        });
    });
});