import {renderHook} from '@testing-library/react';
import {useTinybirdQuery} from '../../../src/hooks/useTinybirdQuery';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import React from 'react';

vi.mock('@tinybirdco/charts', () => ({
    useQuery: vi.fn()
}));

vi.mock('../../../src/utils/stats-config', () => ({
    getStatEndpointUrl: vi.fn()
}));

vi.mock('../../../src/hooks/useTinybirdToken', () => ({
    useTinybirdToken: vi.fn()
}));

import {useTinybirdToken} from '../../../src/hooks/useTinybirdToken';
import {getStatEndpointUrl} from '../../../src/utils/stats-config';
import {useQuery} from '@tinybirdco/charts';

const mockUseQuery = vi.mocked(useQuery);
const mockUseTinybirdToken = vi.mocked(useTinybirdToken);
const mockGetStatEndpointUrl = vi.mocked(getStatEndpointUrl);

describe('useTinybirdQuery', () => {
    let queryClient: QueryClient;
    let wrapper: React.FC<{children: React.ReactNode}>;

    beforeEach(() => {
        queryClient = new QueryClient();
        wrapper = ({children}) => React.createElement(QueryClientProvider, {client: queryClient}, children);
        mockUseTinybirdToken.mockReturnValue({
            token: undefined,
            isLoading: true,
            error: null,
            refetch: vi.fn()
        });
        mockUseQuery.mockReturnValue({
            data: null,
            loading: false,
            error: null,
            meta: null,
            statistics: null,
            endpoint: 'https://api.example.com/test',
            token: undefined,
            refresh: vi.fn()
        });
        mockGetStatEndpointUrl.mockImplementation((_config: any, endpoint: any) => `https://api.example.com/${endpoint}`);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should return data, meta, loading, and error', () => {
        const {result} = renderHook(() => useTinybirdQuery({
            statsConfig: {id: '123'},
            endpoint: 'test',
            params: {}
        }), {wrapper});

        expect(result.current.data).toBeDefined();
        expect(result.current.loading).toBeDefined();
        expect(result.current.error).toBeDefined();
    });

    it('should set the endpoint to undefined if the token is not loaded', () => {
        // This prevents an initial 403 error by waiting for the token to load before making the request
        mockUseTinybirdToken.mockReturnValue({
            token: undefined,
            isLoading: true,
            error: null,
            refetch: vi.fn()
        });

        renderHook(() => useTinybirdQuery({
            statsConfig: {id: '123'},
            endpoint: 'test',
            params: {}
        }), {wrapper});

        expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
            endpoint: undefined
        }));
    });

    it('should call useQuery with the correct token', () => {
        mockUseTinybirdToken.mockReturnValue({
            token: 'mock-token',
            isLoading: false,
            error: null,
            refetch: vi.fn()
        });

        renderHook(() => useTinybirdQuery({
            statsConfig: {id: '123'},
            endpoint: 'test',
            params: {}
        }), {wrapper});

        expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
            token: 'mock-token'
        }));
    });

    it('should call useQuery with the correct endpoint once the token is loaded', () => {
        mockUseTinybirdToken.mockReturnValue({
            token: 'mock-token',
            isLoading: false,
            error: null,
            refetch: vi.fn()
        });

        renderHook(() => useTinybirdQuery({
            statsConfig: {id: '123'},
            endpoint: 'test',
            params: {}
        }), {wrapper});

        expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
            endpoint: 'https://api.example.com/test'
        }));
    });

    it('should return loading state that includes token loading', () => {
        mockUseTinybirdToken.mockReturnValue({
            token: 'mock-token',
            isLoading: true,
            error: null,
            refetch: vi.fn()
        });

        const {result} = renderHook(() => useTinybirdQuery({
            statsConfig: {id: '123'},
            endpoint: 'test',
            params: {}
        }), {wrapper});

        expect(result.current.loading).toBe(true);
    });

    it('should pass the correct params to useQuery', () => {
        mockUseTinybirdToken.mockReturnValue({
            token: 'mock-token',
            isLoading: false,
            error: null,
            refetch: vi.fn()
        });

        renderHook(() => useTinybirdQuery({
            statsConfig: {id: '123'},
            endpoint: 'test',
            params: {test: 'test'}
        }), {wrapper});

        expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
            params: {test: 'test'}
        }));
    });

    it('handles errors from useQuery', () => {
        const mockError = 'Network error';
        mockUseQuery.mockReturnValue({
            data: null,
            loading: false,
            error: mockError,
            meta: null,
            statistics: null,
            endpoint: 'https://api.example.com/test',
            token: undefined,
            refresh: vi.fn()
        });

        const {result} = renderHook(() => useTinybirdQuery({
            statsConfig: {id: '123'},
            endpoint: 'test',
            params: {}
        }), {wrapper});

        expect(result.current.error).toBe(mockError);
    });

    it('should return the error from useQuery if the token query has an error', () => {
        const mockError = new Error('Token error');
        mockUseTinybirdToken.mockReturnValue({
            token: undefined,
            isLoading: false,
            error: mockError,
            refetch: vi.fn()
        });

        const {result} = renderHook(() => useTinybirdQuery({
            statsConfig: {id: '123'},
            endpoint: 'test',
            params: {}
        }), {wrapper});

        expect(result.current.error).toBe(mockError);
    });
});