/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {UseQueryResult} from '@tanstack/react-query';
import {responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';
import {vi} from 'vitest';

// Import types from API modules
import type {NewsletterStatsResponseType, TopPostsStatsResponseType} from '@tryghost/admin-x-framework/api/stats';

// Create a test wrapper with QueryClient
export const createTestWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {retry: false},
            mutations: {retry: false}
        }
    });
    
    const Wrapper = ({children}: {children: React.ReactNode}) => (
        React.createElement(QueryClientProvider, {client: queryClient}, children)
    );
    Wrapper.displayName = 'TestWrapper';
    
    return Wrapper;
};

// Mock infrastructure (could be moved to admin-x-framework)
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

// Default mock data (uses centralized responseFixtures)
export const defaultMockData = {
    // Properly typed mock for GlobalDataProvider
    globalData: {
        isLoading: false,
        settings: [],
        data: undefined,
        statsConfig: undefined,
        range: 30,
        audience: 7,
        setAudience: vi.fn(),
        setRange: vi.fn(),
        selectedNewsletterId: null,
        setSelectedNewsletterId: vi.fn()
    }
};

/**
 * Universal setup for stats app
 * Uses centralized responseFixtures from admin-x-framework
 */
export const setupStatsAppMocks = () => {
    // Create mock functions
    const mockUseNewsletterStatsByNewsletterId = vi.fn();
    const mockUseSubscriberCountByNewsletterId = vi.fn();
    const mockUseTopPostsStats = vi.fn();
    const mockUseGlobalData = vi.fn();
    const mockGetSettingValue = vi.fn();

    // Set up ALL mocks with sensible defaults using centralized fixtures
    mockApiHook<NewsletterStatsResponseType>(mockUseNewsletterStatsByNewsletterId, responseFixtures.newsletterStats);
    mockApiHook<NewsletterStatsResponseType>(mockUseSubscriberCountByNewsletterId, responseFixtures.newsletterStats);
    mockApiHook<TopPostsStatsResponseType>(mockUseTopPostsStats, responseFixtures.topPosts);
    mockUseGlobalData.mockReturnValue(defaultMockData.globalData);
    mockGetSettingValue.mockReturnValue('{}');

    return {
        mockUseNewsletterStatsByNewsletterId,
        mockUseSubscriberCountByNewsletterId,
        mockUseTopPostsStats,
        mockUseGlobalData,
        mockGetSettingValue
    };
};

/**
 * Setup mocks for specific modules
 * This should be called in beforeEach after vi.clearAllMocks()
 */
export const applyMocksToModules = (mocks: ReturnType<typeof setupStatsAppMocks>) => {
    // Apply mocks to the actual modules
    vi.doMock('@tryghost/admin-x-framework/api/stats', () => ({
        useNewsletterStatsByNewsletterId: mocks.mockUseNewsletterStatsByNewsletterId,
        useSubscriberCountByNewsletterId: mocks.mockUseSubscriberCountByNewsletterId,
        useTopPostsStats: mocks.mockUseTopPostsStats
    }));

    vi.doMock('@src/providers/GlobalDataProvider', () => ({
        default: () => null,
        useGlobalData: mocks.mockUseGlobalData
    }));

    vi.doMock('@tryghost/admin-x-framework/api/settings', () => ({
        getSettingValue: mocks.mockGetSettingValue
    }));
};

// Legacy compatibility
export const setupUniversalMocks = setupStatsAppMocks;
export const setupDefaultStatsMocks = setupStatsAppMocks; 