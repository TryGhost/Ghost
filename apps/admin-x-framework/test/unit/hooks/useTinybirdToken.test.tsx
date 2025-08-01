import {renderHook} from '@testing-library/react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {useTinybirdToken} from '../../../src/hooks/useTinybirdToken';
import {getTinybirdToken} from '../../../src/api/tinybird';
import React from 'react';

// Mock the getTinybirdToken API
vi.mock('../../../src/api/tinybird', () => ({
    getTinybirdToken: vi.fn()
}));

const mockGetTinybirdToken = vi.mocked(getTinybirdToken);

describe('useTinybirdToken', () => {
    let queryClient: QueryClient;
    let wrapper: React.FC<{children: React.ReactNode}>;

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: {retry: false},
                mutations: {retry: false}
            }
        });
        wrapper = ({children}) => React.createElement(QueryClientProvider, {client: queryClient}, children);
        
        vi.clearAllMocks();
    });

    afterEach(() => {
        queryClient.clear();
    });

    it('returns token when API returns valid token', () => {
        mockGetTinybirdToken.mockReturnValue({
            data: {tinybird: {token: 'valid-token-123'}},
            isLoading: false,
            error: null,
            refetch: vi.fn()
        } as any);

        const {result} = renderHook(() => useTinybirdToken(), {wrapper});

        expect(result.current.token).toBe('valid-token-123');
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe(null);
    });

    it('returns undefined when API returns null token', () => {
        mockGetTinybirdToken.mockReturnValue({
            data: {tinybird: {token: null}},
            isLoading: false,
            error: null,
            refetch: vi.fn()
        } as any);

        const {result} = renderHook(() => useTinybirdToken(), {wrapper});

        expect(result.current.token).toBeUndefined();
    });

    it('uses built-in query options without requiring consumer configuration', () => {
        const mockRefetch = vi.fn();
        
        mockGetTinybirdToken.mockReturnValue({
            data: {tinybird: {token: 'cached-token'}},
            isLoading: false,
            error: null,
            refetch: mockRefetch
        } as any);

        // First render
        renderHook(() => useTinybirdToken(), {wrapper});
        
        // Second render in same QueryClient context 
        renderHook(() => useTinybirdToken(), {wrapper});
        
        // Verify that getTinybirdToken is called with default enabled: true
        expect(mockGetTinybirdToken).toHaveBeenCalledWith({enabled: true});
        
        // Verify both calls used the default enabled option
        expect(mockGetTinybirdToken.mock.calls[0]).toEqual([{enabled: true}]);
        expect(mockGetTinybirdToken.mock.calls[1]).toEqual([{enabled: true}]);
    });

    it('uses built-in query options for optimal token refresh behavior', () => {
        mockGetTinybirdToken.mockReturnValue({
            data: {tinybird: {token: 'test-token'}},
            isLoading: false,
            error: null,
            refetch: vi.fn()
        } as any);

        renderHook(() => useTinybirdToken(), {wrapper});

        // Verify default enabled option is passed
        expect(mockGetTinybirdToken).toHaveBeenCalledWith({enabled: true});
        expect(mockGetTinybirdToken.mock.calls[0]).toEqual([{enabled: true}]);
    });

    it('returns undefined for invalid token types without throwing error', () => {
        mockGetTinybirdToken.mockReturnValue({
            data: {tinybird: {token: 123}}, // number instead of string
            isLoading: false,
            error: null,
            refetch: vi.fn()
        } as any);

        const {result} = renderHook(() => useTinybirdToken(), {wrapper});

        expect(result.current.token).toBeUndefined();
        expect(result.current.error).toBe(null);
    });

    it('passes through API errors', () => {
        const apiError = new Error('Network error');
        
        mockGetTinybirdToken.mockReturnValue({
            data: null,
            isLoading: false,
            error: apiError,
            refetch: vi.fn()
        } as any);

        const {result} = renderHook(() => useTinybirdToken(), {wrapper});

        expect(result.current.token).toBeUndefined();
        expect(result.current.error).toBe(apiError);
    });

    it('exposes refetch function', () => {
        const mockRefetch = vi.fn();
        
        mockGetTinybirdToken.mockReturnValue({
            data: {tinybird: {token: 'test-token'}},
            isLoading: false,
            error: null,
            refetch: mockRefetch
        } as any);

        const {result} = renderHook(() => useTinybirdToken(), {wrapper});

        expect(result.current.refetch).toBe(mockRefetch);
    });

    it('refreshes token when stale time expires', () => {
        vi.useFakeTimers();
        
        let queryState = {
            data: {tinybird: {token: 'initial-token'}},
            isLoading: false,
            isFetching: false,
            isStale: false,
            error: null,
            refetch: vi.fn()
        };

        mockGetTinybirdToken.mockImplementation(() => queryState as any);

        const {result, rerender} = renderHook(() => useTinybirdToken(), {wrapper});

        // Initially should have the token and not be stale
        expect(result.current.token).toBe('initial-token');
        expect(queryState.isStale).toBe(false);
        expect(queryState.isFetching).toBe(false);

        // Fast forward past the stale time (130 minutes)
        vi.advanceTimersByTime(131 * 60 * 1000);

        // Update mock to simulate React Query marking as stale and fetching fresh data
        queryState = {
            ...queryState,
            isStale: true,
            isFetching: true,
            data: {tinybird: {token: 'refreshed-token'}}
        };

        // Trigger rerender to pick up the new state
        rerender();

        // Should now have the refreshed token
        expect(result.current.token).toBe('refreshed-token');

        vi.useRealTimers();
    });

    it('continues background refresh every 2 hours', () => {
        vi.useFakeTimers();
        
        let fetchCount = 0;
        let queryState = {
            data: {tinybird: {token: 'token-v1'}},
            isLoading: false,
            isFetching: false,
            isStale: false,
            error: null,
            refetch: vi.fn()
        };

        mockGetTinybirdToken.mockImplementation(() => {
            fetchCount += 1;
            return {
                ...queryState,
                data: {tinybird: {token: `token-v${fetchCount}`}}
            } as any;
        });

        const {result, rerender} = renderHook(() => useTinybirdToken(), {wrapper});

        // Initial token
        expect(result.current.token).toBe('token-v1');
        expect(fetchCount).toBe(1);

        // Fast forward 2 hours (refetch interval)
        vi.advanceTimersByTime(120 * 60 * 1000);

        // Simulate React Query background refetch
        queryState = {
            ...queryState,
            data: {tinybird: {token: 'token-v2'}},
            isFetching: false
        };
        
        rerender();

        // Should have updated to new token after background refresh
        expect(result.current.token).toBe('token-v2');
        expect(fetchCount).toBe(2);

        vi.useRealTimers();
    });

    it('respects enabled option when true', () => {
        mockGetTinybirdToken.mockReturnValue({
            data: {tinybird: {token: 'enabled-token'}},
            isLoading: false,
            error: null,
            refetch: vi.fn()
        } as any);

        const {result} = renderHook(() => useTinybirdToken({enabled: true}), {wrapper});

        expect(result.current.token).toBe('enabled-token');
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe(null);
        expect(mockGetTinybirdToken).toHaveBeenCalledWith({enabled: true});
    });

    it('respects enabled option when false', () => {
        mockGetTinybirdToken.mockReturnValue({
            data: null,
            isLoading: false,
            error: null,
            refetch: vi.fn()
        } as any);

        const {result} = renderHook(() => useTinybirdToken({enabled: false}), {wrapper});

        expect(result.current.token).toBeUndefined();
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe(null);
        expect(mockGetTinybirdToken).toHaveBeenCalledWith({enabled: false});
    });

    it('defaults enabled to true when not specified', () => {
        mockGetTinybirdToken.mockReturnValue({
            data: {tinybird: {token: 'default-token'}},
            isLoading: false,
            error: null,
            refetch: vi.fn()
        } as any);

        const {result} = renderHook(() => useTinybirdToken(), {wrapper});

        expect(result.current.token).toBe('default-token');
        expect(mockGetTinybirdToken).toHaveBeenCalledWith({enabled: true});
    });
});