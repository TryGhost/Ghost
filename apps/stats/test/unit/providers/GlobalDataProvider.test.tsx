import React from 'react';
import {render, screen} from '@testing-library/react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {vi} from 'vitest';
import GlobalDataProvider, {useGlobalData} from '../../../src/providers/GlobalDataProvider';

// Mock the API hooks
vi.mock('@tryghost/admin-x-framework/api/config', () => ({
    useBrowseConfig: vi.fn()
}));

vi.mock('@tryghost/admin-x-framework/api/settings', () => ({
    useBrowseSettings: vi.fn()
}));

vi.mock('@tryghost/admin-x-framework/api/site', () => ({
    useBrowseSite: vi.fn()
}));

vi.mock('@tryghost/admin-x-framework', () => ({
    useTinybirdToken: vi.fn()
}));

import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';
import {useTinybirdToken} from '@tryghost/admin-x-framework';

const mockUseBrowseConfig = vi.mocked(useBrowseConfig);
const mockUseBrowseSettings = vi.mocked(useBrowseSettings);
const mockUseBrowseSite = vi.mocked(useBrowseSite);
const mockUseTinybirdToken = vi.mocked(useTinybirdToken);

// Test component that uses the GlobalDataProvider
const TestComponent = () => {
    const globalData = useGlobalData();
    return (
        <div>
            <span data-testid="hasStatsConfig">{globalData.statsConfig ? 'true' : 'false'}</span>
            <span data-testid="tinybirdToken">{globalData.tinybirdToken || 'undefined'}</span>
            <span data-testid="isLoading">{globalData.isLoading ? 'true' : 'false'}</span>
        </div>
    );
};

describe('GlobalDataProvider', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: {retry: false},
                mutations: {retry: false}
            }
        });
        
        vi.clearAllMocks();

        // Set up default successful responses
        mockUseBrowseSettings.mockReturnValue({
            data: {settings: []},
            isLoading: false,
            error: null
        } as any);

        mockUseBrowseSite.mockReturnValue({
            data: {site: {url: 'https://example.com', title: 'Test Site', icon: 'icon.png'}},
            isLoading: false,
            error: null
        } as any);
    });

    afterEach(() => {
        queryClient.clear();
    });

    it('fetches Tinybird token when stats config is present', () => {
        // Mock config with stats
        mockUseBrowseConfig.mockReturnValue({
            data: {
                config: {
                    stats: {
                        endpoint: 'https://api.tinybird.co',
                        id: 'test-site-id'
                    }
                }
            },
            isLoading: false,
            error: null
        } as any);

        // Mock successful token response
        mockUseTinybirdToken.mockReturnValue({
            token: 'test-token-123',
            isLoading: false,
            error: null,
            refetch: vi.fn()
        });

        const wrapper = ({children}: {children: React.ReactNode}) => (
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        );

        render(
            <GlobalDataProvider>
                <TestComponent />
            </GlobalDataProvider>,
            {wrapper}
        );

        // Should have called useTinybirdToken with enabled: true
        expect(mockUseTinybirdToken).toHaveBeenCalledWith({enabled: true});

        // Should show stats config is present and token is available
        expect(screen.getByTestId('hasStatsConfig')).toHaveTextContent('true');
        expect(screen.getByTestId('tinybirdToken')).toHaveTextContent('test-token-123');
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });

    it('does not fetch Tinybird token when stats config is missing', () => {
        // Mock config without stats
        mockUseBrowseConfig.mockReturnValue({
            data: {
                config: {
                    // No stats config
                }
            },
            isLoading: false,
            error: null
        } as any);

        // Mock disabled token response
        mockUseTinybirdToken.mockReturnValue({
            token: undefined,
            isLoading: false,
            error: null,
            refetch: vi.fn()
        });

        const wrapper = ({children}: {children: React.ReactNode}) => (
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        );

        render(
            <GlobalDataProvider>
                <TestComponent />
            </GlobalDataProvider>,
            {wrapper}
        );

        // Should have called useTinybirdToken with enabled: false
        expect(mockUseTinybirdToken).toHaveBeenCalledWith({enabled: false});

        // Should show stats config is not present and token is undefined
        expect(screen.getByTestId('hasStatsConfig')).toHaveTextContent('false');
        expect(screen.getByTestId('tinybirdToken')).toHaveTextContent('undefined');
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });

    it('does not fetch Tinybird token when config data is null', () => {
        // Mock null config data
        mockUseBrowseConfig.mockReturnValue({
            data: null,
            isLoading: false,
            error: null
        } as any);

        // Mock disabled token response
        mockUseTinybirdToken.mockReturnValue({
            token: undefined,
            isLoading: false,
            error: null,
            refetch: vi.fn()
        });

        const wrapper = ({children}: {children: React.ReactNode}) => (
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        );

        render(
            <GlobalDataProvider>
                <TestComponent />
            </GlobalDataProvider>,
            {wrapper}
        );

        // Should have called useTinybirdToken with enabled: false
        expect(mockUseTinybirdToken).toHaveBeenCalledWith({enabled: false});

        // Should show stats config is not present and token is undefined
        expect(screen.getByTestId('hasStatsConfig')).toHaveTextContent('false');
        expect(screen.getByTestId('tinybirdToken')).toHaveTextContent('undefined');
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });

    it('handles loading state correctly with stats config', () => {
        // Mock config with stats
        mockUseBrowseConfig.mockReturnValue({
            data: {
                config: {
                    stats: {
                        endpoint: 'https://api.tinybird.co',
                        id: 'test-site-id'
                    }
                }
            },
            isLoading: false,
            error: null
        } as any);

        // Mock loading token response
        mockUseTinybirdToken.mockReturnValue({
            token: undefined,
            isLoading: true,
            error: null,
            refetch: vi.fn()
        });

        const wrapper = ({children}: {children: React.ReactNode}) => (
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        );

        render(
            <GlobalDataProvider>
                <TestComponent />
            </GlobalDataProvider>,
            {wrapper}
        );

        // Should show loading state
        expect(screen.getByTestId('isLoading')).toHaveTextContent('true');
    });

    it('handles loading state correctly without stats config', () => {
        // Mock config without stats
        mockUseBrowseConfig.mockReturnValue({
            data: {
                config: {}
            },
            isLoading: false,
            error: null
        } as any);

        // Mock non-loading token response (since it's disabled)
        mockUseTinybirdToken.mockReturnValue({
            token: undefined,
            isLoading: false,
            error: null,
            refetch: vi.fn()
        });

        const wrapper = ({children}: {children: React.ReactNode}) => (
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        );

        render(
            <GlobalDataProvider>
                <TestComponent />
            </GlobalDataProvider>,
            {wrapper}
        );

        // Should not show loading state since token request is disabled
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });
});