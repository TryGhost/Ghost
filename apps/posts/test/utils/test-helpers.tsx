/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {responseFixtures} from '@tryghost/admin-x-framework/test/acceptance';
import {vi} from 'vitest';

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

// Mock return value factory for API hooks
export const createMockApiReturn = (data: any, isLoading = false, error = null) => ({
    data,
    isLoading,
    error,
    refetch: vi.fn(),
    // Add other required properties for UseQueryResult
    isError: false,
    isLoadingError: false,
    isRefetchError: false,
    isSuccess: !isLoading && !error,
    isIdle: false,
    status: isLoading ? 'loading' : 'success',
    dataUpdatedAt: Date.now(),
    errorUpdatedAt: 0,
    failureCount: 0,
    isFetched: true,
    isFetchedAfterMount: true,
    isFetching: isLoading,
    isPlaceholderData: false,
    isPreviousData: false,
    isStale: false,
    remove: vi.fn()
} as any);

// Higher-level helper that combines mock setup with return value
export const mockApiHook = (mockFn: any, data: any, isLoading = false, error = null) => {
    const returnValue = createMockApiReturn(data, isLoading, error);
    mockFn.mockReturnValue(returnValue);
    return returnValue;
};

// Common mock data
export const mockData = {
    post: {
        id: '64d623b64676110001e897d9',
        newsletter: {id: 'newsletter-123'},
        email: {
            email_count: 1000,
            opened_count: 300
        },
        count: {
            clicks: 50
        }
    },
    
    growthStats: {
        stats: [{
            free_members: 100,
            paid_members: 25,
            mrr: 1250
        }]
    },
    
    globalData: {
        isLoading: false,
        settings: []
    }
};

// Mock setup helpers - now using the combined helper
export const setupPostMocks = () => {
    return {
        mockGetPost: vi.fn().mockReturnValue(createMockApiReturn({posts: [mockData.post]})),
        mockUseNewsletterStats: vi.fn().mockReturnValue(createMockApiReturn(responseFixtures.newsletterStats)),
        mockUseTopLinks: vi.fn().mockReturnValue(createMockApiReturn(responseFixtures.links)),
        mockUsePostReferrers: vi.fn().mockReturnValue(createMockApiReturn(responseFixtures.postReferrers)),
        mockUsePostGrowthStats: vi.fn().mockReturnValue(createMockApiReturn(mockData.growthStats))
    };
};

export const setupFeatureFlagMocks = () => {
    return {
        mockUseGlobalData: vi.fn().mockReturnValue(mockData.globalData),
        mockGetSettingValue: vi.fn().mockReturnValue('{}')
    };
}; 