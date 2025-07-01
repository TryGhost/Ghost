/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    createErrorMock,
    createLoadingMock,
    createMockApiReturn,
    createSuccessMock,
    mockApiHook,
    resetAllMocks
} from '@tryghost/admin-x-framework/test/hook-testing-utils';
import {responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';
import {vi} from 'vitest';

// Import types from API modules
import type {NewsletterStatsResponseType, TopPostsStatsResponseType} from '@tryghost/admin-x-framework/api/stats';

// Re-export centralized utilities for convenience
export {
    createErrorMock,
    createLoadingMock,
    createMockApiReturn,
    createSuccessMock,
    mockApiHook,
    resetAllMocks
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

// Mock sources data with for testing traffic
export const createMockSourcesData = () => [
    {source: 'Reddit', visits: 120},
    {source: 'Google', visits: 100},
    {source: 'twitter.com', visits: 80},
    {source: 'ghost.org', visits: 60},
    {source: '', visits: 50} // Already direct traffic
];

// Helper to create mock global data with custom site URL
export const createMockGlobalData = (siteUrl = 'https://ghost.org') => ({
    ...defaultMockData.globalData,
    data: {
        url: siteUrl
    }
});

// Legacy compatibility
export const setupUniversalMocks = setupStatsAppMocks;
export const setupDefaultStatsMocks = setupStatsAppMocks;

// Re-export new testing utilities
export * from './date-testing-utils';
export * from './mock-factories';
export * from './hook-testing-utils';
