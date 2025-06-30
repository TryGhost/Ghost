import {MockInstance, vi} from 'vitest';
import {expectApiCallWithDateRange} from './date-testing-utils';
import {renderHook} from '@testing-library/react';

/**
 * Common patterns and utilities for hook testing
 * Reduces boilerplate and ensures consistent testing patterns
 */

/**
 * Standard API mock setup with comprehensive properties
 * This eliminates the verbose mock setup in individual tests
 */
export const createStandardApiMock = <T>(data: T = null as T): MockInstance => {
    return vi.fn().mockReturnValue({
        data,
        isLoading: false,
        error: null,
        isError: false,
        isLoadingError: false,
        isRefetchError: false,
        isSuccess: true,
        isFetching: false,
        isStale: false,
        refetch: vi.fn(),
        dataUpdatedAt: 0,
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
        fetchStatus: 'idle' as const,
        isRefetching: false,
        status: 'success' as const
    });
};

/**
 * Setup mocks for common hook dependencies
 */
export interface HookMockSetup {
    mockUseGlobalData: MockInstance;
    mockGetRangeDates: MockInstance;
    mockFormatQueryDate: MockInstance;
    mockGetAudienceQueryParam: MockInstance;
}

export const setupCommonHookMocks = (): HookMockSetup => {
    const mockUseGlobalData = vi.fn().mockReturnValue({
        audience: 'all-members',
        range: 30,
        setAudience: vi.fn(),
        setRange: vi.fn()
    });

    const mockGetRangeDates = vi.fn().mockReturnValue({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-15'),
        timezone: 'UTC'
    });

    const mockFormatQueryDate = vi.fn().mockImplementation(
        (date: Date) => date.toISOString().split('T')[0]
    );

    const mockGetAudienceQueryParam = vi.fn().mockReturnValue('all');

    return {
        mockUseGlobalData,
        mockGetRangeDates,
        mockFormatQueryDate,
        mockGetAudienceQueryParam
    };
};

/**
 * Test suite generators for common hook patterns
 * These generate standard test cases that most hooks should have
 */

/**
 * Generate standard parameter tests for hooks with range/order/id params
 */
export const generateParameterTests = (
    hookName: string,
    hookFunction: (...args: any[]) => any, // eslint-disable-line @typescript-eslint/no-explicit-any
    mockApiCall: MockInstance,
    options: {
        hasRange?: boolean;
        hasOrder?: boolean;
        hasId?: boolean;
        hasCustomParams?: Record<string, unknown>;
    } = {}
) => {
    const tests = [];

    if (options.hasRange) {
        tests.push({
            name: `${hookName} - uses default range when not provided`,
            test: () => {
                hookFunction();
                expectApiCallWithDateRange(mockApiCall, 30, options.hasCustomParams);
            }
        });

        tests.push({
            name: `${hookName} - accepts custom range`,
            test: () => {
                hookFunction(7);
                expectApiCallWithDateRange(mockApiCall, 7, options.hasCustomParams);
            }
        });
    }

    if (options.hasOrder) {
        tests.push({
            name: `${hookName} - accepts custom order parameter`,
            test: () => {
                hookFunction(30, 'open_rate desc');
                expect(mockApiCall).toHaveBeenCalledWith(
                    expect.objectContaining({
                        searchParams: expect.objectContaining({
                            order: 'open_rate desc'
                        })
                    })
                );
            }
        });
    }

    if (options.hasId) {
        tests.push({
            name: `${hookName} - accepts ID parameter`,
            test: () => {
                const testId = 'test-id-123';
                hookFunction(30, 'date desc', testId);
                expect(mockApiCall).toHaveBeenCalledWith(
                    expect.objectContaining({
                        searchParams: expect.objectContaining({
                            newsletter_id: testId
                        })
                    })
                );
            }
        });
    }

    return tests;
};

/**
 * Generate standard shouldFetch tests
 */
export const generateShouldFetchTests = (
    hookName: string,
    hookFunction: (...args: any[]) => any, // eslint-disable-line @typescript-eslint/no-explicit-any
    mockApiCall: MockInstance
) => [
    {
        name: `${hookName} - returns empty state when shouldFetch is false`,
        test: () => {
            const mockRefetch = vi.fn();
            mockApiCall.mockReturnValue({
                refetch: mockRefetch,
                data: undefined,
                isLoading: false,
                error: null
            });

            const result = hookFunction(30, 'date desc', undefined, false);
            
            expect(result).toEqual({
                data: undefined,
                isLoading: false,
                error: null,
                isError: false,
                refetch: mockRefetch
            });
        }
    },
    {
        name: `${hookName} - calls API when shouldFetch is true`,
        test: () => {
            hookFunction(30, 'date desc', undefined, true);
            expect(mockApiCall).toHaveBeenCalledWith(
                expect.objectContaining({
                    enabled: true
                })
            );
        }
    }
];

/**
 * Generate standard loading/error state tests
 */
export const generateStateTests = (
    hookName: string,
    hookFunction: (...args: any[]) => any, // eslint-disable-line @typescript-eslint/no-explicit-any
    mockApiCall: MockInstance
) => [
    {
        name: `${hookName} - handles loading state`,
        test: () => {
            mockApiCall.mockReturnValue({
                data: null,
                isLoading: true,
                error: null,
                isError: false,
                refetch: vi.fn()
            });

            const result = hookFunction();
            expect(result.isLoading).toBe(true);
        }
    },
    {
        name: `${hookName} - handles error state`,
        test: () => {
            const testError = new Error('Test error');
            mockApiCall.mockReturnValue({
                data: null,
                isLoading: false,
                error: testError,
                isError: true,
                refetch: vi.fn()
            });

            const result = hookFunction();
            expect(result.error).toBe(testError);
            expect(result.isError).toBe(true);
        }
    }
];

/**
 * Utility to create a complete test suite for a standard API hook
 */
export const createStandardHookTestSuite = (
    hookName: string,
    hookFunction: (...args: any[]) => any, // eslint-disable-line @typescript-eslint/no-explicit-any
    mockApiCall: MockInstance,
    options: {
        hasRange?: boolean;
        hasOrder?: boolean;
        hasId?: boolean;
        hasShouldFetch?: boolean;
        customParams?: Record<string, unknown>;
        additionalTests?: Array<{name: string; test: () => void}>;
    } = {}
) => {
    const testSuite = [];

    // Add parameter tests
    if (options.hasRange || options.hasOrder || options.hasId) {
        testSuite.push(...generateParameterTests(hookName, hookFunction, mockApiCall, options));
    }

    // Add shouldFetch tests
    if (options.hasShouldFetch) {
        testSuite.push(...generateShouldFetchTests(hookName, hookFunction, mockApiCall));
    }

    // Add state tests
    testSuite.push(...generateStateTests(hookName, hookFunction, mockApiCall));

    // Add custom tests
    if (options.additionalTests) {
        testSuite.push(...options.additionalTests);
    }

    return testSuite;
};

/**
 * Utility for testing hooks that combine multiple API calls
 */
export const expectCombinedApiCalls = (
    basicMock: MockInstance,
    clickMock: MockInstance,
    expectedBasicParams: unknown,
    expectedClickParams: unknown
) => {
    expect(basicMock).toHaveBeenCalledWith(expectedBasicParams);
    expect(clickMock).toHaveBeenCalledWith(expectedClickParams);
};

/**
 * Test data transformation utilities
 */
export const expectDataTransformation = <TInput, TOutput>(
    inputData: TInput,
    output: TOutput,
    transformFunction: (input: TInput) => TOutput
) => {
    const result = transformFunction(inputData);
    expect(result).toEqual(output);
};

/**
 * Utility for testing memoization - for hooks with parameters
 * Tests that hook results are properly memoized based on dependency changes
 */
export const expectMemoization = <T extends any[], R>( // eslint-disable-line @typescript-eslint/no-explicit-any
    hookFunction: (...args: T) => R,
    initialDeps: T,
    changedDeps: T[]
) => {
    // Initial render with initial dependencies
    const {result, rerender} = renderHook(
        ({deps}) => hookFunction(...deps),
        {initialProps: {deps: initialDeps}}
    );
    const firstResult = result.current;
    
    // Rerender with same dependencies - should return same reference
    rerender({deps: initialDeps});
    expect(result.current).toBe(firstResult);
    
    // Test each changed dependency set
    changedDeps.forEach((newDeps) => {
        rerender({deps: newDeps});
        expect(result.current).not.toBe(firstResult);
    });
};

/**
 * Utility for testing memoization - for hooks without parameters
 * Tests that hook results are properly memoized when dependencies change
 */
export const expectMemoizationWithoutParams = <R>(
    hookFunction: () => R,
    setupChangedDependencies: () => void
) => {
    // Initial render
    const {result, rerender} = renderHook(() => hookFunction());
    const firstResult = result.current;
    
    // Rerender without changing dependencies - should return same reference
    rerender();
    expect(result.current).toBe(firstResult);
    
    // Change dependencies and rerender - should return different reference
    setupChangedDependencies();
    rerender();
    expect(result.current).not.toBe(firstResult);
};