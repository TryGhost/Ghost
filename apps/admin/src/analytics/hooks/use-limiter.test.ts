import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook} from '@testing-library/react';
import {useLimiter} from '@/analytics/hooks/use-limiter';

vi.mock('@/analytics/hooks/use-analytics-data', () => ({
    useAnalyticsData: vi.fn()
}));

const mockUseAnalyticsData = vi.mocked(await import('@/analytics/hooks/use-analytics-data')).useAnalyticsData;

type AnalyticsData = ReturnType<typeof mockUseAnalyticsData>;

const withConfig = (config: unknown) => {
    mockUseAnalyticsData.mockReturnValue({config} as AnalyticsData);
};

describe('useLimiter', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('reports the limit when limitAnalytics is disabled', () => {
        withConfig({hostSettings: {limits: {limitAnalytics: {disabled: true}}}});

        const {result} = renderHook(() => useLimiter());

        expect(result.current.isLimited('limitAnalytics')).toBe(true);
    });

    it('does not report the limit when limitAnalytics is not disabled', () => {
        withConfig({hostSettings: {limits: {limitAnalytics: {disabled: false}}}});

        const {result} = renderHook(() => useLimiter());

        expect(result.current.isLimited('limitAnalytics')).toBe(false);
    });

    it('does not report the limit when the site has no host limits', () => {
        withConfig({hostSettings: {}});

        const {result} = renderHook(() => useLimiter());

        expect(result.current.isLimited('limitAnalytics')).toBe(false);
    });

    it('does not report the limit before config has loaded', () => {
        withConfig(undefined);

        const {result} = renderHook(() => useLimiter());

        expect(result.current.isLimited('limitAnalytics')).toBe(false);
    });

    it('does not report unknown limits even when host limits exist', () => {
        withConfig({hostSettings: {limits: {limitAnalytics: {disabled: true}}}});

        const {result} = renderHook(() => useLimiter());

        expect(result.current.isLimited('limitMembers')).toBe(false);
    });

    // Regression guard: `data` used to be the raw config response, so this hook
    // read `data.config.hostSettings`. When the provider started handing over the
    // unwrapped Config, the extra hop silently resolved to undefined — and kept
    // typechecking, because Config ends in an index signature.
    it('reads hostSettings off the config itself, not a nested config property', () => {
        withConfig({config: {hostSettings: {limits: {limitAnalytics: {disabled: true}}}}});

        const {result} = renderHook(() => useLimiter());

        expect(result.current.isLimited('limitAnalytics')).toBe(false);
    });
});
