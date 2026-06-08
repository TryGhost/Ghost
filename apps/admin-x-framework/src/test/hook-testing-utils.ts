/* eslint-disable @typescript-eslint/no-explicit-any */
import {UseQueryResult} from '@tanstack/react-query';
import * as vitest from 'vitest';

// For vitest 0.34.3 compatibility
const vi = (vitest as any).vi || vitest;

/**
 * Creates a properly typed mock UseQueryResult for API hooks
 * This utility ensures all required properties are present for TypeScript compatibility
 */
export const createMockApiReturn = <T>(
    data: T | undefined,
    isLoading = false,
    error: Error | null = null
): UseQueryResult<T> => ({
        data,
        isLoading,
        error,
        refetch: vi.fn(),
        isError: !!error,
        isLoadingError: false,
        isRefetchError: false,
        isSuccess: !isLoading && !error && data !== undefined,
        isIdle: false,
        status: isLoading ? 'loading' : error ? 'error' : 'success',
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: error ? Date.now() : 0,
        failureCount: error ? 1 : 0,
        isFetched: true,
        isFetchedAfterMount: true,
        isFetching: isLoading,
        isPlaceholderData: false,
        isPreviousData: false,
        isStale: false,
        remove: vi.fn(),
        // Add missing properties for TypeScript compatibility
        failureReason: null,
        errorUpdateCount: 0,
        isInitialLoading: isLoading,
        isPaused: false,
        isRefetching: false,
        isStaleByTime: false
    } as unknown as UseQueryResult<T>);

/**
 * Applies a mock return value to an API hook mock function
 * Ensures the mock function exists and has the mockReturnValue method
 */
export const mockApiHook = <T>(
    mockFn: any,
    data: T | undefined,
    isLoading = false,
    error: Error | null = null
): UseQueryResult<T> => {
    const returnValue = createMockApiReturn(data, isLoading, error);
    if (mockFn && typeof mockFn.mockReturnValue === 'function') {
        mockFn.mockReturnValue(returnValue);
    }
    return returnValue;
};

/**
 * Creates a mock function that can be used with mockApiHook
 * Useful when you need to create mocks before importing modules
 */
export const createMockApiHook = <T>() => {
    const mockFn = vi.fn();
    return {
        mock: mockFn,
        mockReturnValue: (data: T | undefined, isLoading = false, error: Error | null = null) => mockApiHook(mockFn, data, isLoading, error)
    };
};

/**
 * Utility to create loading state mocks
 */
export const createLoadingMock = <T>(mockFn: any): UseQueryResult<T> => mockApiHook<T>(mockFn, undefined, true, null);

/**
 * Utility to create error state mocks
 */
export const createErrorMock = <T>(mockFn: any, error: Error): UseQueryResult<T> => mockApiHook<T>(mockFn, undefined, false, error);

/**
 * Utility to create success state mocks
 */
export const createSuccessMock = <T>(mockFn: any, data: T): UseQueryResult<T> => mockApiHook<T>(mockFn, data, false, null);

/**
 * Simplified mock utilities for common API hook states
 * These provide cleaner, more readable alternatives to mockApiHook for standard scenarios
 */

/**
 * Mock an API hook in loading state
 * @param mockFn The mock function to configure
 * @returns The configured mock result
 */
export const mockLoading = <T>(mockFn: any): UseQueryResult<T> => mockApiHook<T>(mockFn, undefined, true);

/**
 * Mock an API hook in success state with data
 * @param mockFn The mock function to configure  
 * @param data The data to return
 * @returns The configured mock result
 */
export const mockSuccess = <T>(mockFn: any, data: T): UseQueryResult<T> => mockApiHook<T>(mockFn, data, false);

/**
 * Mock an API hook in error state
 * @param mockFn The mock function to configure
 * @param error The error to return
 * @returns The configured mock result
 */
export const mockError = <T>(mockFn: any, error: Error): UseQueryResult<T> => mockApiHook<T>(mockFn, undefined, false, error);

/**
 * Mock an API hook with null/undefined data (successful but empty)
 * @param mockFn The mock function to configure
 * @returns The configured mock result
 */
export const mockNull = <T>(mockFn: any): UseQueryResult<T> => mockApiHook<T>(mockFn, undefined, false);

/**
 * Common mock data patterns for Ghost entities
 */
export const mockDataFactories = {
    /**
     * Creates mock pagination metadata
     */
    pagination: (overrides = {}) => ({
        page: 1,
        limit: 15,
        pages: 1,
        total: 1,
        next: null,
        prev: null,
        ...overrides
    }),

    /**
     * Creates mock API response with meta
     */
    apiResponse: <T>(data: T, metaOverrides = {}) => ({
        ...data,
        meta: {
            pagination: mockDataFactories.pagination(),
            ...metaOverrides
        }
    }),

    /**
     * Creates mock stats response
     */
    statsResponse: <T>(stats: T[], metaOverrides = {}) => ({
        stats,
        meta: {
            pagination: mockDataFactories.pagination({total: stats.length}),
            ...metaOverrides
        }
    })
};

/**
 * Utility to wait for mock function calls in tests
 */
export const waitForMockCall = async (mockFn: any, timeout = 1000) => {
    const {waitFor} = await import('@testing-library/react');
    return waitFor(() => expect(mockFn).toHaveBeenCalled(), {timeout});
};

/**
 * Utility to wait for specific number of mock function calls
 */
export const waitForMockCalls = async (mockFn: any, count: number, timeout = 1000) => {
    const {waitFor} = await import('@testing-library/react');
    return waitFor(() => expect(mockFn).toHaveBeenCalledTimes(count), {timeout});
};

/**
 * Utility to reset all mocks in a test suite
 */
export const resetAllMocks = () => {
    vi.clearAllMocks();
};

/**
 * Type-safe mock creation for specific API hooks
 */
export interface MockApiHookConfig<T> {
    data?: T;
    isLoading?: boolean;
    error?: Error | null;
}

export const createTypedMockApiHook = <T>() => {
    const mockFn = vi.fn();
    
    return {
        mock: mockFn,
        configure: (config: MockApiHookConfig<T>) => mockApiHook(mockFn, config.data, config.isLoading, config.error),
        mockLoading: () => createLoadingMock<T>(mockFn),
        mockError: (error: Error) => createErrorMock<T>(mockFn, error),
        mockSuccess: (data: T) => createSuccessMock<T>(mockFn, data)
    };
};