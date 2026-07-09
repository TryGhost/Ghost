import React from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook} from '@testing-library/react';
import {useFeatureFlag} from '@/posts/analytics/hooks/use-feature-flag';

vi.mock('@tryghost/admin-x-framework', () => ({
    Navigate: ({to}: {to: string}) => React.createElement('div', {'data-testid': 'navigate', 'data-to': to})
}));

vi.mock('@/shared/analytics/use-analytics-data', () => ({
    useAnalyticsData: vi.fn()
}));

const mockUseAnalyticsData = vi.mocked(await import('@/shared/analytics/use-analytics-data')).useAnalyticsData;

describe('useFeatureFlag', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns loading state while data is loading', () => {
        mockUseAnalyticsData.mockReturnValue({
            isLoading: true,
            config: undefined
        } as unknown as ReturnType<typeof mockUseAnalyticsData>);

        const {result} = renderHook(() => useFeatureFlag('testFlag', '/fallback'));

        expect(result.current.isEnabled).toBe(false);
        expect(result.current.isLoading).toBe(true);
        expect(result.current.redirect).toBe(null);
    });

    it('returns enabled when flag is true', () => {
        mockUseAnalyticsData.mockReturnValue({
            isLoading: false,
            config: {labs: {testFlag: true}}
        } as unknown as ReturnType<typeof mockUseAnalyticsData>);

        const {result} = renderHook(() => useFeatureFlag('testFlag', '/fallback'));

        expect(result.current.isEnabled).toBe(true);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.redirect).toBe(null);
    });

    it('returns redirect when flag is explicitly false', () => {
        mockUseAnalyticsData.mockReturnValue({
            isLoading: false,
            config: {labs: {testFlag: false}}
        } as unknown as ReturnType<typeof mockUseAnalyticsData>);

        const {result} = renderHook(() => useFeatureFlag('testFlag', '/fallback'));

        expect(result.current.isEnabled).toBe(false);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.redirect).toMatchObject({
            props: {to: '/fallback'}
        });
    });

    it('returns redirect when flag is absent', () => {
        mockUseAnalyticsData.mockReturnValue({
            isLoading: false,
            config: {labs: {otherFlag: true}}
        } as unknown as ReturnType<typeof mockUseAnalyticsData>);

        const {result} = renderHook(() => useFeatureFlag('testFlag', '/fallback'));

        expect(result.current.isEnabled).toBe(false);
        expect(result.current.redirect).toMatchObject({
            props: {to: '/fallback'}
        });
    });
});
