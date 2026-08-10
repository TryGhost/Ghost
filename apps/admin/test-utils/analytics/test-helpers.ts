import {mockApiHook} from '@tryghost/admin-x-framework/test/hook-testing-utils';
import {responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';
import {vi} from 'vitest';

// Import types from API modules
import type {NewsletterStatsResponseType, TopPostsStatsResponseType} from '@tryghost/admin-x-framework/api/stats';

// Default mock data (uses centralized responseFixtures)
const defaultMockData = {
    // View-state exposed by useAnalytics (AnalyticsProvider)
    analyticsViewState: {
        range: 30,
        setRange: vi.fn(),
        selectedNewsletterId: null,
        setSelectedNewsletterId: vi.fn()
    },
    // Framework data exposed by useAnalyticsData (sourced from the shell)
    analyticsData: {
        isLoading: false,
        settings: [],
        config: undefined,
        statsConfig: undefined,
        site: {}
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
    const mockUseAnalytics = vi.fn();
    const mockUseAnalyticsData = vi.fn();
    const mockGetSettingValue = vi.fn();

    // Set up ALL mocks with sensible defaults using centralized fixtures
    mockApiHook<NewsletterStatsResponseType>(mockUseNewsletterStatsByNewsletterId, responseFixtures.newsletterStats);
    mockApiHook<NewsletterStatsResponseType>(mockUseSubscriberCountByNewsletterId, responseFixtures.newsletterStats);
    mockApiHook<TopPostsStatsResponseType>(mockUseTopPostsStats, responseFixtures.topPosts);
    mockUseAnalytics.mockReturnValue(defaultMockData.analyticsViewState);
    mockUseAnalyticsData.mockReturnValue(defaultMockData.analyticsData);
    mockGetSettingValue.mockReturnValue('{}');

    return {
        mockUseNewsletterStatsByNewsletterId,
        mockUseSubscriberCountByNewsletterId,
        mockUseTopPostsStats,
        mockUseAnalytics,
        mockUseAnalyticsData,
        mockGetSettingValue
    };
};
