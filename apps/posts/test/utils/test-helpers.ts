/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
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
import type {LinkResponseType} from '@tryghost/admin-x-framework/api/links';
import type {MrrHistoryResponseType, NewsletterStatsResponseType, PostGrowthStatsResponseType, PostReferrersResponseType} from '@tryghost/admin-x-framework/api/stats';
import type {PostsResponseType} from '@tryghost/admin-x-framework/api/posts';

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
    postsResponse: {
        posts: [{
            id: '64d623b64676110001e897d9',
            url: 'https://example.com/post',
            slug: 'test-post',
            title: 'Test Post',
            uuid: 'test-uuid',
            newsletter: {id: 'newsletter-123'},
            email: {
                email_count: 1000,
                opened_count: 300
            },
            count: {
                clicks: 50
            }
        }]
    } satisfies PostsResponseType,

    growthStats: {
        stats: [{
            post_id: '64d623b64676110001e897d9',
            free_members: 100,
            paid_members: 25,
            mrr: 1250
        }],
        meta: {
            pagination: {
                page: 1,
                limit: 15,
                pages: 1,
                total: 1,
                next: null,
                prev: null
            }
        }
    } satisfies PostGrowthStatsResponseType,

    // Properly typed mock for PostAnalyticsContext
    globalData: {
        isLoading: false,
        settings: [],
        data: undefined,
        site: undefined,
        statsConfig: undefined,
        tinybirdToken: 'mock-tinybird-token',
        range: 30,
        audience: 7,
        setAudience: vi.fn(),
        setRange: vi.fn(),
        postId: 'test-post-id',
        post: {
            id: '64d623b64676110001e897d9',
            url: 'https://example.com/post',
            slug: 'test-post',
            title: 'Test Post',
            uuid: 'test-uuid',
            newsletter: {feedback_enabled: true},
            email: {
                email_count: 1000,
                opened_count: 300,
                status: 'submitted'
            },
            count: {
                clicks: 50,
                positive_feedback: 10,
                negative_feedback: 2,
                signups: 15,
                paid_conversions: 3
            },
            authors: [{name: 'Test Author'}],
            published_at: '2024-01-01T00:00:00.000Z',
            excerpt: 'Test excerpt',
            tags: [],
            tiers: []
        },
        isPostLoading: false,
        postType: {
            isEmailOnly: false,
            isPublishedOnly: false,
            isPublishedAndEmailed: true,
            metricsToDisplay: {
                showEmailMetrics: true,
                showWebMetrics: true,
                showMemberGrowth: true
            }
        }
    }
};

/**
 * Universal setup for posts app
 * Uses centralized responseFixtures from admin-x-framework
 */
export const setupPostsAppMocks = async () => {
    const mockGetPost = vi.mocked(await import('@tryghost/admin-x-framework/api/posts')).getPost;
    const mockUseNewsletterStatsByNewsletterId = vi.mocked(await import('@tryghost/admin-x-framework/api/stats')).useNewsletterStatsByNewsletterId;
    const mockUseNewsletterBasicStats = vi.mocked(await import('@tryghost/admin-x-framework/api/stats')).useNewsletterBasicStats;
    const mockUseNewsletterClickStats = vi.mocked(await import('@tryghost/admin-x-framework/api/stats')).useNewsletterClickStats;
    const mockUsePostReferrers = vi.mocked(await import('@tryghost/admin-x-framework/api/stats')).usePostReferrers;
    const mockUsePostGrowthStats = vi.mocked(await import('@tryghost/admin-x-framework/api/stats')).usePostGrowthStats;
    const mockUseMrrHistory = vi.mocked(await import('@tryghost/admin-x-framework/api/stats')).useMrrHistory;
    const mockUseTopLinks = vi.mocked(await import('@tryghost/admin-x-framework/api/links')).useTopLinks;
    const mockUseGlobalData = vi.mocked(await import('@src/providers/PostAnalyticsContext')).useGlobalData;
    const mockGetSettingValue = vi.mocked(await import('@tryghost/admin-x-framework/api/settings')).getSettingValue;

    // Set up ALL mocks with sensible defaults using centralized fixtures
    mockApiHook<PostsResponseType>(mockGetPost, defaultMockData.postsResponse);
    mockApiHook<NewsletterStatsResponseType>(mockUseNewsletterStatsByNewsletterId, responseFixtures.newsletterStats);
    mockApiHook<NewsletterStatsResponseType>(mockUseNewsletterBasicStats, responseFixtures.newsletterStats);
    mockApiHook<NewsletterStatsResponseType>(mockUseNewsletterClickStats, responseFixtures.newsletterStats);
    mockApiHook<PostReferrersResponseType>(mockUsePostReferrers, responseFixtures.postReferrers);
    mockApiHook<PostGrowthStatsResponseType>(mockUsePostGrowthStats, defaultMockData.growthStats);
    mockApiHook<MrrHistoryResponseType>(mockUseMrrHistory, responseFixtures.mrrHistory);
    mockApiHook<LinkResponseType>(mockUseTopLinks, responseFixtures.links);
    mockUseGlobalData.mockReturnValue(defaultMockData.globalData);
    mockGetSettingValue.mockReturnValue('{}');

    return {
        mockGetPost,
        mockUseNewsletterStatsByNewsletterId,
        mockUseNewsletterBasicStats,
        mockUseNewsletterClickStats,
        mockUsePostReferrers,
        mockUsePostGrowthStats,
        mockUseMrrHistory,
        mockUseTopLinks,
        mockUseGlobalData,
        mockGetSettingValue
    };
};

// Legacy compatibility
export const setupUniversalMocks = setupPostsAppMocks;
export const setupDefaultPostMocks = setupPostsAppMocks; 