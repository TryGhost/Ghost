import {renderHook, act} from '@testing-library/react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {useActiveVisitors} from '../../../src/hooks/useActiveVisitors';
import React from 'react';

// Mock the @tinybirdco/charts module
vi.mock('@tinybirdco/charts', () => ({
    useQuery: vi.fn()
}));

// Mock the stats-config utils
vi.mock('../../../src/utils/stats-config', () => ({
    getStatEndpointUrl: vi.fn()
}));

// Mock the useTinybirdToken hook
vi.mock('../../../src/hooks/useTinybirdToken', () => ({
    useTinybirdToken: vi.fn()
}));

import {useQuery} from '@tinybirdco/charts';
import {getStatEndpointUrl} from '../../../src/utils/stats-config';
import {useTinybirdToken} from '../../../src/hooks/useTinybirdToken';

const mockUseQuery = vi.mocked(useQuery);
const mockGetStatEndpointUrl = vi.mocked(getStatEndpointUrl);
const mockUseTinybirdToken = vi.mocked(useTinybirdToken);

describe('useActiveVisitors', () => {
    let queryClient: QueryClient;
    let wrapper: React.FC<{children: React.ReactNode}>;

    beforeEach(() => {
        vi.useFakeTimers();
        queryClient = new QueryClient({
            defaultOptions: {
                queries: {retry: false},
                mutations: {retry: false}
            }
        });
        wrapper = ({children}) => React.createElement(QueryClientProvider, {client: queryClient}, children);
        
        mockUseQuery.mockReturnValue({
            data: null,
            loading: false,
            error: null,
            meta: null,
            statistics: null,
            endpoint: 'https://api.example.com/api_active_visitors',
            token: 'mock-token',
            refresh: vi.fn()
        });
        mockGetStatEndpointUrl.mockImplementation((_config: any, endpoint: any) => `https://api.example.com/${endpoint}`);
        mockUseTinybirdToken.mockReturnValue({
            token: 'mock-token',
            isLoading: false,
            error: null,
            refetch: vi.fn()
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
        vi.restoreAllMocks();
    });

    it('returns initial state when enabled is true', () => {
        const {result} = renderHook(() => useActiveVisitors({enabled: true}), {wrapper});

        expect(result.current).toEqual({
            activeVisitors: 0,
            isLoading: false,
            error: null
        });
    });

    it('returns zero state when enabled is false', () => {
        const {result} = renderHook(() => useActiveVisitors({enabled: false}), {wrapper});

        expect(result.current).toEqual({
            activeVisitors: 0,
            isLoading: false,
            error: null
        });
    });

    it('shows loading state only on initial load with no last known count', () => {
        mockUseQuery.mockReturnValue({
            data: null,
            loading: true,
            error: null,
            meta: null,
            statistics: null,
            endpoint: 'https://api.example.com/api_active_visitors',
            token: 'mock-token',
            refresh: vi.fn()
        });

        const {result} = renderHook(() => useActiveVisitors({enabled: true}), {wrapper});

        // Should show loading on initial load when no lastKnownCount exists
        expect(result.current.isLoading).toBe(true);
        expect(result.current.activeVisitors).toBe(0);
    });

    it('does not show loading when lastKnownCount exists', () => {
        // First render with data to establish lastKnownCount
        mockUseQuery.mockReturnValue({
            data: [{active_visitors: 25}],
            loading: false,
            error: null,
            meta: null,
            statistics: null,
            endpoint: 'https://api.example.com/api_active_visitors',
            token: 'mock-token',
            refresh: vi.fn()
        });

        const {result, rerender} = renderHook(() => useActiveVisitors({enabled: true}), {wrapper});
        expect(result.current.activeVisitors).toBe(25);

        // Second render with loading but data should not show loading
        mockUseQuery.mockReturnValue({
            data: null,
            loading: true,
            error: null,
            meta: null,
            statistics: null,
            endpoint: 'https://api.example.com/api_active_visitors',
            token: 'mock-token',
            refresh: vi.fn()
        });

        rerender();

        expect(result.current.isLoading).toBe(false);
        expect(result.current.activeVisitors).toBe(25); // Retains last known count
    });

    it('returns active visitor count from data', () => {
        mockUseQuery.mockReturnValue({
            data: [{active_visitors: 42}],
            loading: false,
            error: null,
            meta: null,
            statistics: null,
            endpoint: 'https://api.example.com/api_active_visitors',
            token: 'mock-token',
            refresh: vi.fn()
        });

        const {result} = renderHook(() => useActiveVisitors({enabled: true}), {wrapper});

        expect(result.current.activeVisitors).toBe(42);
        expect(result.current.isLoading).toBe(false);
    });

    it('handles error state', () => {
        const mockError = 'Network error';
        mockUseQuery.mockReturnValue({
            data: null,
            loading: false,
            error: mockError,
            meta: null,
            statistics: null,
            endpoint: 'https://api.example.com/api_active_visitors',
            token: 'mock-token',
            refresh: vi.fn()
        });

        const {result} = renderHook(() => useActiveVisitors({enabled: true}), {wrapper});

        expect(result.current.error).toBe(mockError);
    });

    it('calls getStatEndpointUrl with correct parameters and uses tinybirdToken', () => {
        const statsConfig = {
            id: 'test-site-id',
            endpoint: 'https://api.test.com',
            token: 'test-token'
        };

        renderHook(() => useActiveVisitors({statsConfig, enabled: true}), {wrapper});

        expect(mockGetStatEndpointUrl).toHaveBeenCalledWith(statsConfig, 'api_active_visitors');
        expect(mockUseTinybirdToken).toHaveBeenCalled();
    });

    it('calls useTinybirdQuery with undefined endpoint when no statsConfig and uses tinybirdToken', () => {
        renderHook(() => useActiveVisitors({enabled: true}), {wrapper});

        expect(mockUseQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                endpoint: undefined,
                token: 'mock-token',
                params: expect.objectContaining({
                    site_uuid: ''
                })
            })
        );
        expect(mockUseTinybirdToken).toHaveBeenCalled();
    });

    it('sets up 60-second interval when enabled', () => {
        renderHook(() => useActiveVisitors({enabled: true}), {wrapper});

        // Initially refreshKey should be 0
        expect(mockUseQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                params: expect.objectContaining({
                    _refresh: '0'
                })
            })
        );

        // Fast-forward 60 seconds
        act(() => {
            vi.advanceTimersByTime(60000);
        });

        // Should increment refreshKey
        expect(mockUseQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                params: expect.objectContaining({
                    _refresh: '1'
                })
            })
        );
    });

    it('does not set up interval when disabled', () => {
        renderHook(() => useActiveVisitors({enabled: false}), {wrapper});

        // Fast-forward 60 seconds
        act(() => {
            vi.advanceTimersByTime(60000);
        });

        // Should still be at refreshKey 0
        expect(mockUseQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                params: expect.objectContaining({
                    _refresh: '0'
                })
            })
        );
    });

    it('includes postUuid in params when provided', () => {
        const postUuid = 'test-post-uuid';
        renderHook(() => useActiveVisitors({postUuid, enabled: true}), {wrapper});

        expect(mockUseQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                params: expect.objectContaining({
                    post_uuid: postUuid
                })
            })
        );
    });

    it('does not include postUuid in params when not provided', () => {
        renderHook(() => useActiveVisitors({enabled: true}), {wrapper});

        expect(mockUseQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                params: expect.not.objectContaining({
                    post_uuid: expect.anything()
                })
            })
        );
    });

    it('uses statsConfig for site_uuid', () => {
        const statsConfig = {
            id: 'test-site-id',
            endpoint: 'https://api.test.com',
            token: 'test-token'
        };

        renderHook(() => useActiveVisitors({statsConfig, enabled: true}), {wrapper});

        expect(mockUseQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                params: expect.objectContaining({
                    site_uuid: 'test-site-id'
                })
            })
        );
    });

    it('uses empty string for site_uuid when no statsConfig', () => {
        renderHook(() => useActiveVisitors({enabled: true}), {wrapper});

        expect(mockUseQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                params: expect.objectContaining({
                    site_uuid: ''
                })
            })
        );
    });

    it('retains last known count after refresh', () => {
        // Initial data
        mockUseQuery.mockReturnValue({
            data: [{active_visitors: 25}],
            loading: false,
            error: null,
            meta: null,
            statistics: null,
            endpoint: 'https://api.example.com/api_active_visitors',
            token: 'mock-token',
            refresh: vi.fn()
        });

        const {result, rerender} = renderHook(() => useActiveVisitors({enabled: true}), {wrapper});
        expect(result.current.activeVisitors).toBe(25);

        // Simulate refresh with loading state but no new data
        mockUseQuery.mockReturnValue({
            data: null,
            loading: true,
            error: null,
            meta: null,
            statistics: null,
            endpoint: 'https://api.example.com/api_active_visitors',
            token: 'mock-token',
            refresh: vi.fn()
        });

        rerender();

        // Should retain last known count and not show loading
        expect(result.current.activeVisitors).toBe(25);
        expect(result.current.isLoading).toBe(false);
    });

    it('handles zero active visitors correctly', () => {
        mockUseQuery.mockReturnValue({
            data: [{active_visitors: 0}],
            loading: false,
            error: null,
            meta: null,
            statistics: null,
            endpoint: 'https://api.example.com/api_active_visitors',
            token: 'mock-token',
            refresh: vi.fn()
        });

        const {result} = renderHook(() => useActiveVisitors({enabled: true}), {wrapper});

        expect(result.current.activeVisitors).toBe(0);
    });

    it('handles invalid data format gracefully', () => {
        mockUseQuery.mockReturnValue({
            data: [{some_other_field: 42}],
            loading: false,
            error: null,
            meta: null,
            statistics: null,
            endpoint: 'https://api.example.com/api_active_visitors',
            token: 'mock-token',
            refresh: vi.fn()
        });

        const {result} = renderHook(() => useActiveVisitors({enabled: true}), {wrapper});

        expect(result.current.activeVisitors).toBe(0);
    });

    it('cleans up interval on unmount', () => {
        // Spy on clearInterval before creating the hook
        const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
        
        const {unmount} = renderHook(() => useActiveVisitors({enabled: true}), {wrapper});

        unmount();

        expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('updates lastKnownCount when new valid data is received', () => {
        // Start with no data
        mockUseQuery.mockReturnValue({
            data: null,
            loading: false,
            error: null,
            meta: null,
            statistics: null,
            endpoint: 'https://api.example.com/api_active_visitors',
            token: 'mock-token',
            refresh: vi.fn()
        });

        const {result, rerender} = renderHook(() => useActiveVisitors({enabled: true}), {wrapper});
        expect(result.current.activeVisitors).toBe(0);

        // Provide valid data
        mockUseQuery.mockReturnValue({
            data: [{active_visitors: 15}],
            loading: false,
            error: null,
            meta: null,
            statistics: null,
            endpoint: 'https://api.example.com/api_active_visitors',
            token: 'mock-token',
            refresh: vi.fn()
        });

        rerender();

        expect(result.current.activeVisitors).toBe(15);

        // Now when data becomes null again, should retain the count
        mockUseQuery.mockReturnValue({
            data: null,
            loading: false,
            error: null,
            meta: null,
            statistics: null,
            endpoint: 'https://api.example.com/api_active_visitors',
            token: 'mock-token',
            refresh: vi.fn()
        });

        rerender();

        expect(result.current.activeVisitors).toBe(15);
    });

    it('handles statsConfig changes correctly', () => {
        const initialStatsConfig = {
            id: 'initial-site-id',
            endpoint: 'https://initial.api.com',
            token: 'initial-token'
        };

        const {rerender} = renderHook(
            ({statsConfig}) => useActiveVisitors({statsConfig, enabled: true}),
            {initialProps: {statsConfig: initialStatsConfig}, wrapper}
        );

        expect(mockGetStatEndpointUrl).toHaveBeenCalledWith(initialStatsConfig, 'api_active_visitors');
        expect(mockUseTinybirdToken).toHaveBeenCalled();

        // Change statsConfig
        const newStatsConfig = {
            id: 'new-site-id',
            endpoint: 'https://new.api.com',
            token: 'new-token'
        };

        rerender({statsConfig: newStatsConfig});

        expect(mockGetStatEndpointUrl).toHaveBeenCalledWith(newStatsConfig, 'api_active_visitors');
        expect(mockUseTinybirdToken).toHaveBeenCalled();
    });

    it('does not update lastKnownCount when disabled', () => {
        // Start enabled with data
        mockUseQuery.mockReturnValue({
            data: [{active_visitors: 20}],
            loading: false,
            error: null,
            meta: null,
            statistics: null,
            endpoint: 'https://api.example.com/api_active_visitors',
            token: 'mock-token',
            refresh: vi.fn()
        });

        const {result, rerender} = renderHook(
            ({enabled}) => useActiveVisitors({enabled}),
            {initialProps: {enabled: true}, wrapper}
        );

        expect(result.current.activeVisitors).toBe(20);

        // Disable and provide new data
        mockUseQuery.mockReturnValue({
            data: [{active_visitors: 30}],
            loading: false,
            error: null,
            meta: null,
            statistics: null,
            endpoint: 'https://api.example.com/api_active_visitors',
            token: 'mock-token',
            refresh: vi.fn()
        });

        rerender({enabled: false});

        // Should return 0 when disabled, regardless of new data
        expect(result.current.activeVisitors).toBe(0);
        expect(result.current.error).toBeNull();
    });

    it('resets interval when enabled state changes', () => {
        const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
        const setIntervalSpy = vi.spyOn(global, 'setInterval');

        // Clear any previous calls
        setIntervalSpy.mockClear();
        clearIntervalSpy.mockClear();

        const {rerender} = renderHook(
            ({enabled}) => useActiveVisitors({enabled}),
            {initialProps: {enabled: true}, wrapper}
        );

        expect(setIntervalSpy).toHaveBeenCalledTimes(1);
        const firstIntervalId = setIntervalSpy.mock.results[0]?.value;

        // Disable
        rerender({enabled: false});

        expect(clearIntervalSpy).toHaveBeenCalledWith(firstIntervalId);

        // Re-enable
        rerender({enabled: true});

        // Should create a new interval
        expect(setIntervalSpy).toHaveBeenCalledTimes(2);
    });

    it('should call useQuery with undefined endpoint when token is loading (preventing HTTP requests)', () => {
        // Mock useTinybirdToken to return undefined token (still loading)
        mockUseTinybirdToken.mockReturnValue({
            token: undefined,
            isLoading: true,
            error: null,
            refetch: vi.fn()
        });

        // Clear any previous calls
        mockUseQuery.mockClear();

        // Render the hook
        renderHook(() => useActiveVisitors({enabled: true}), {wrapper});

        // EXPECTED: useQuery should be called with undefined endpoint when token is loading
        // This prevents HTTP requests by disabling the SWR query entirely
        expect(mockUseQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                endpoint: undefined,
                token: undefined
            })
        );
    });

    it('calls useQuery with token when token is available', () => {
        // Mock useTinybirdToken to return a valid token
        mockUseTinybirdToken.mockReturnValue({
            token: 'valid-token',
            isLoading: false,
            error: null,
            refetch: vi.fn()
        });

        // Clear any previous calls
        mockUseQuery.mockClear();

        // Render the hook
        renderHook(() => useActiveVisitors({enabled: true}), {wrapper});

        // Should call useQuery with the valid token
        expect(mockUseQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                token: 'valid-token'
            })
        );
    });

    it('transitions from undefined to valid token correctly', () => {
        // Start with undefined token
        mockUseTinybirdToken.mockReturnValue({
            token: undefined,
            isLoading: true,
            error: null,
            refetch: vi.fn()
        });

        // Render the hook
        const {rerender} = renderHook(() => useActiveVisitors({enabled: true}), {wrapper});

        // Verify first call with undefined token (due to tokenLoading: true)
        expect(mockUseQuery).toHaveBeenLastCalledWith(
            expect.objectContaining({
                token: undefined
            })
        );

        // Clear previous calls
        mockUseQuery.mockClear();

        // Now provide a valid token
        mockUseTinybirdToken.mockReturnValue({
            token: 'valid-token',
            isLoading: false,
            error: null,
            refetch: vi.fn()
        });

        // Rerender
        rerender();

        // Should now call useQuery with the valid token
        expect(mockUseQuery).toHaveBeenLastCalledWith(
            expect.objectContaining({
                token: 'valid-token'
            })
        );
    });

    it('shows loading state when token is loading', () => {
        // Mock token as loading
        mockUseTinybirdToken.mockReturnValue({
            token: undefined,
            isLoading: true,
            error: null,
            refetch: vi.fn()
        });

        // Mock useQuery to return no loading (since token loading should be considered)
        mockUseQuery.mockReturnValue({
            data: null,
            loading: false,
            error: null,
            meta: null,
            statistics: null,
            endpoint: 'https://api.example.com/api_active_visitors',
            token: undefined,
            refresh: vi.fn()
        });

        const {result} = renderHook(() => useActiveVisitors({enabled: true}), {wrapper});

        // Should show loading because token is loading and no lastKnownCount
        expect(result.current.isLoading).toBe(true);
        expect(result.current.activeVisitors).toBe(0);
    });
});