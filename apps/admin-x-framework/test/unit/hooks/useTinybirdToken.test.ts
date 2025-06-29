import {renderHook} from '@testing-library/react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {vi, beforeEach, afterEach, describe, it, expect} from 'vitest';
import React from 'react';
import {useTinybirdToken} from '../../../src/hooks/useTinybirdToken';
import {createMockApiReturn} from '../../../src/test/hook-testing-utils';
import type {TinybirdTokenResponseType} from '../../../src/api/tinybird';

vi.mock('../../../src/api/tinybird', () => ({
    getTinybirdToken: vi.fn()
}));

import * as tinybirdApi from '../../../src/api/tinybird';
const mockGetTinybirdToken = vi.mocked(tinybirdApi.getTinybirdToken);

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                cacheTime: 0
            }
        }
    });

    const Wrapper = ({children}: {children: React.ReactNode}) => (
        React.createElement(QueryClientProvider, {client: queryClient}, children)
    );

    return {Wrapper, queryClient};
};

describe('useTinybirdToken', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it('should return loading state initially', () => {
        mockGetTinybirdToken.mockReturnValue(
            createMockApiReturn<TinybirdTokenResponseType>(undefined, true, null)
        );
        const {Wrapper} = createWrapper();

        const {result} = renderHook(() => useTinybirdToken(), {wrapper: Wrapper});

        expect(result.current.isLoading).toBe(true);
        expect(result.current.token).toBeUndefined();
        expect(result.current.error).toBe(null);
    });

    it('should return token on successful fetch', async () => {
        const mockResponse: TinybirdTokenResponseType = {
            tinybird: {
                token: 'mock-tinybird-token-123'
            }
        };
        
        mockGetTinybirdToken.mockReturnValue(
            createMockApiReturn<TinybirdTokenResponseType>(mockResponse, false, null)
        );
        
        const {Wrapper} = createWrapper();
        const {result} = renderHook(() => useTinybirdToken(), {wrapper: Wrapper});

        expect(result.current.isLoading).toBe(false);
        expect(result.current.token).toBe('mock-tinybird-token-123');
        expect(result.current.error).toBe(null);
    });

    it('should handle string token validation', async () => {
        const mockResponse: TinybirdTokenResponseType = {
            tinybird: {
                token: 'valid-string-token'
            }
        };
        
        mockGetTinybirdToken.mockReturnValue(
            createMockApiReturn<TinybirdTokenResponseType>(mockResponse, false, null)
        );
        
        const {Wrapper} = createWrapper();
        const {result} = renderHook(() => useTinybirdToken(), {wrapper: Wrapper});

        expect(result.current.token).toBe('valid-string-token');
        expect(typeof result.current.token).toBe('string');
    });

    it('should handle non-string token by returning error', async () => {
        const mockResponse = {
            tinybird: {
                token: null as any
            }
        } as TinybirdTokenResponseType;
        
        mockGetTinybirdToken.mockReturnValue(
            createMockApiReturn<TinybirdTokenResponseType>(mockResponse, false, null)
        );
        
        const {Wrapper} = createWrapper();
        const {result} = renderHook(() => useTinybirdToken(), {wrapper: Wrapper});

        expect(result.current.token).toBeUndefined();
        expect(result.current.error).toBeInstanceOf(Error);
        expect(result.current.error?.message).toBe('Invalid token received from API: token must be a non-empty string');
    });

    it('should handle API errors', async () => {
        const mockError = new Error('Failed to fetch token');
        
        mockGetTinybirdToken.mockReturnValue(
            createMockApiReturn<TinybirdTokenResponseType>(undefined, false, mockError)
        );
        
        const {Wrapper} = createWrapper();
        const {result} = renderHook(() => useTinybirdToken(), {wrapper: Wrapper});

        expect(result.current.token).toBeUndefined();
        expect(result.current.error).toBe(mockError);
    });

    it('should provide refetch functionality', async () => {
        const mockResponse: TinybirdTokenResponseType = {
            tinybird: {
                token: 'initial-token'
            }
        };
        
        const mockReturn = createMockApiReturn<TinybirdTokenResponseType>(mockResponse, false, null);
        mockGetTinybirdToken.mockReturnValue(mockReturn);
        
        const {Wrapper} = createWrapper();
        const {result} = renderHook(() => useTinybirdToken(), {wrapper: Wrapper});

        expect(result.current.refetch).toBeDefined();
        expect(typeof result.current.refetch).toBe('function');
        
        result.current.refetch();
        expect(mockReturn.refetch).toHaveBeenCalledTimes(1);
    });

    it('should handle undefined data response', async () => {
        mockGetTinybirdToken.mockReturnValue(
            createMockApiReturn<TinybirdTokenResponseType>(undefined, false, null)
        );
        
        const {Wrapper} = createWrapper();
        const {result} = renderHook(() => useTinybirdToken(), {wrapper: Wrapper});

        expect(result.current.token).toBeUndefined();
        expect(result.current.error).toBe(null);
    });

    it('should handle empty string token', async () => {
        const mockResponse: TinybirdTokenResponseType = {
            tinybird: {
                token: ''
            }
        };
        
        mockGetTinybirdToken.mockReturnValue(
            createMockApiReturn<TinybirdTokenResponseType>(mockResponse, false, null)
        );
        
        const {Wrapper} = createWrapper();
        const {result} = renderHook(() => useTinybirdToken(), {wrapper: Wrapper});

        expect(result.current.token).toBeUndefined();
        expect(result.current.error).toBeInstanceOf(Error);
        expect(result.current.error?.message).toBe('Invalid token received from API: token must be a non-empty string');
    });

    it('should handle missing tinybird field in response', async () => {
        const mockResponse = {} as TinybirdTokenResponseType;
        
        mockGetTinybirdToken.mockReturnValue(
            createMockApiReturn<TinybirdTokenResponseType>(mockResponse, false, null)
        );
        
        const {Wrapper} = createWrapper();
        const {result} = renderHook(() => useTinybirdToken(), {wrapper: Wrapper});

        expect(result.current.token).toBeUndefined();
        expect(result.current.error).toBeInstanceOf(Error);
        expect(result.current.error?.message).toBe('Invalid token received from API: token must be a non-empty string');
    });

    it('should pass correct options to getTinybirdToken', () => {
        mockGetTinybirdToken.mockReturnValue(
            createMockApiReturn<TinybirdTokenResponseType>(undefined, true, null)
        );
        
        const {Wrapper} = createWrapper();
        renderHook(() => useTinybirdToken(), {wrapper: Wrapper});

        expect(mockGetTinybirdToken).toHaveBeenCalledWith({
            refetchInterval: 120 * 60 * 1000,
            refetchIntervalInBackground: true
        });
    });

    it('should distinguish between API errors and validation errors', () => {
        const apiError = new Error('Network error');
        
        mockGetTinybirdToken.mockReturnValue(
            createMockApiReturn<TinybirdTokenResponseType>(undefined, false, apiError)
        );
        
        const {Wrapper} = createWrapper();
        const {result} = renderHook(() => useTinybirdToken(), {wrapper: Wrapper});

        expect(result.current.token).toBeUndefined();
        expect(result.current.error).toBe(apiError);
        expect(result.current.error?.message).toBe('Network error');
    });
});