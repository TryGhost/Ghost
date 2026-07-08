import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook} from '@testing-library/react';
import {useAnalyticsData} from '@/analytics/hooks/use-analytics-data';

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

const mockUseBrowseConfig = vi.mocked(await import('@tryghost/admin-x-framework/api/config')).useBrowseConfig;
const mockUseBrowseSettings = vi.mocked(await import('@tryghost/admin-x-framework/api/settings')).useBrowseSettings;
const mockUseBrowseSite = vi.mocked(await import('@tryghost/admin-x-framework/api/site')).useBrowseSite;
const mockUseTinybirdToken = vi.mocked(await import('@tryghost/admin-x-framework')).useTinybirdToken;

const query = (overrides: Record<string, unknown> = {}) => ({
    data: undefined,
    error: null,
    isLoading: false,
    ...overrides
});

const setup = ({stats}: {stats?: object} = {}) => {
    mockUseBrowseConfig.mockReturnValue(query({
        data: {config: stats ? {stats} : {}}
    }) as ReturnType<typeof mockUseBrowseConfig>);
    mockUseBrowseSettings.mockReturnValue(query({
        data: {settings: []}
    }) as ReturnType<typeof mockUseBrowseSettings>);
    mockUseBrowseSite.mockReturnValue(query({
        data: {site: {url: 'https://example.com', icon: 'icon.png', title: 'Example'}}
    }) as ReturnType<typeof mockUseBrowseSite>);
    mockUseTinybirdToken.mockReturnValue({
        token: 'tb-token',
        error: null,
        isLoading: false
    } as ReturnType<typeof mockUseTinybirdToken>);
};

describe('useAnalyticsData', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Tinybird token gating', () => {
        it('does not request the token when Tinybird is not provisioned', () => {
            setup();

            renderHook(() => useAnalyticsData());

            expect(mockUseTinybirdToken).toHaveBeenCalledWith({enabled: false});
        });

        it('requests the token once config.stats is present', () => {
            setup({stats: {endpoint: 'https://tinybird.example'}});

            renderHook(() => useAnalyticsData());

            expect(mockUseTinybirdToken).toHaveBeenCalledWith({enabled: true});
        });
    });

    describe('error handling', () => {
        it('throws when a Ghost request fails', () => {
            setup();
            mockUseBrowseSite.mockReturnValue(query({
                error: new Error('site request failed')
            }) as ReturnType<typeof mockUseBrowseSite>);

            expect(() => renderHook(() => useAnalyticsData())).toThrow('site request failed');
        });

        it('throws when the Tinybird token request fails and Tinybird is provisioned', () => {
            setup({stats: {endpoint: 'https://tinybird.example'}});
            mockUseTinybirdToken.mockReturnValue({
                token: undefined,
                error: new Error('token request failed'),
                isLoading: false
            } as ReturnType<typeof mockUseTinybirdToken>);

            expect(() => renderHook(() => useAnalyticsData())).toThrow('token request failed');
        });

        it('ignores a Tinybird token error when Tinybird is not provisioned', () => {
            setup();
            mockUseTinybirdToken.mockReturnValue({
                token: undefined,
                error: new Error('token request failed'),
                isLoading: false
            } as ReturnType<typeof mockUseTinybirdToken>);

            const {result} = renderHook(() => useAnalyticsData());

            expect(result.current.isLoading).toBe(false);
        });
    });

    it('exposes the shell-owned site data', () => {
        setup();

        const {result} = renderHook(() => useAnalyticsData());

        expect(result.current.site).toEqual({
            url: 'https://example.com',
            icon: 'icon.png',
            title: 'Example'
        });
    });

    it('keeps a stable site identity across re-renders', () => {
        setup();

        const {result, rerender} = renderHook(() => useAnalyticsData());
        const first = result.current.site;
        rerender();

        expect(result.current.site).toBe(first);
    });
});
